/**
 * Head and Shoulders Pattern Detection Module
 * 
 * This module provides functionality to detect head and shoulders patterns in financial market data.
 * It uses an advanced algorithm that identifies key points (peaks and troughs) and validates the pattern
 * based on multiple criteria including structural integrity, symmetry, and breakout confirmation.
 * 
 * @module detectors/headAndShoulders
 * @author KW Technical Team
 */

const { findPeaksAndTroughs, calculateOptimalWindowSize } = require('../utils/patternUtils');

/**
 * Calculates market volatility based on price data
 * @param {Array} candles - Array of OHLC candles
 * @returns {number} - Volatility value between 0 and 1
 */
function calculateMarketVolatility(candles) {
    // Need at least a few candles to calculate
    if (!candles || candles.length < 5) return 0.05; // Default medium volatility
    
    // Calculate average true range as a volatility measure
    let trSum = 0;
    for (let i = 1; i < candles.length; i++) {
        const current = candles[i];
        const previous = candles[i-1];
        
        // True Range calculation
        const tr1 = current.high - current.low; // Current candle range
        const tr2 = Math.abs(current.high - previous.close); // High to previous close
        const tr3 = Math.abs(current.low - previous.close); // Low to previous close
        const tr = Math.max(tr1, tr2, tr3);
        
        trSum += tr;
    }
    
    // Calculate average true range
    const atr = trSum / (candles.length - 1);
    
    // Calculate ATR as percentage of average price
    const avgPrice = candles.reduce((sum, c) => sum + ((c.high + c.low) / 2), 0) / candles.length;
    const volatility = atr / avgPrice;
    
    return volatility;
}

/**
 * Identifies significant peaks in the price data
 * @param {Array} candles - Array of OHLC price data
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of peak objects with date, price, and index
 */
function findSignificantPeaks(candles, options = {}) {
    const volatility = options.volatility || calculateMarketVolatility(candles);
    let windowSize = options.windowSize || calculateOptimalWindowSize(candles.length);
    
    // Adjust window size based on volatility
    if (volatility > 0.04) {
        windowSize = Math.max(3, Math.floor(windowSize * (1 - volatility * 5)));
    }
    
    // Initial peak detection
    let { peaks } = findPeaksAndTroughs(candles, windowSize);
    
    // If not enough peaks found, try with smaller window
    if (peaks.length < 3) {
        const smallerWindow = Math.max(3, Math.floor(windowSize * 0.7));
        peaks = findPeaksAndTroughs(candles, smallerWindow).peaks;
    }
    
    return peaks;
}

/**
 * Identifies significant troughs in the price data
 * @param {Array} candles - Array of OHLC price data
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of trough objects with date, price, and index
 */
function findSignificantTroughs(candles, options = {}) {
    const volatility = options.volatility || calculateMarketVolatility(candles);
    let windowSize = options.windowSize || calculateOptimalWindowSize(candles.length);
    
    // Adjust window size based on volatility
    if (volatility > 0.04) {
        windowSize = Math.max(3, Math.floor(windowSize * (1 - volatility * 5)));
    }
    
    // Initial trough detection
    let { troughs } = findPeaksAndTroughs(candles, windowSize);
    
    // If not enough troughs found, try with smaller window
    if (troughs.length < 2) {
        const smallerWindow = Math.max(3, Math.floor(windowSize * 0.7));
        troughs = findPeaksAndTroughs(candles, smallerWindow).troughs;
    }
    
    return troughs;
}

/**
 * Identifies potential Head and Shoulders triads (left shoulder, head, right shoulder)
 * @param {Array} peaks - Array of peak objects
 * @returns {Array} - Array of potential H&S triads
 */
function identifyPotentialHSTriads(peaks) {
    if (peaks.length < 3) return [];
    
    const triads = [];
    
    // We need to test all possible combinations of 3 consecutive peaks
    for (let i = 0; i < peaks.length - 2; i++) {
        const leftShoulder = peaks[i];
        const head = peaks[i + 1];
        const rightShoulder = peaks[i + 2];
        
        // Basic sanity check - peaks must be in chronological order
        if (leftShoulder.index >= head.index || head.index >= rightShoulder.index) {
            continue;
        }
        
        triads.push({ leftShoulder, head, rightShoulder });
    }
    
    return triads;
}

/**
 * Finds the most suitable trough that could act as the left trough in a H&S pattern
 * @param {Object} leftShoulder - Left shoulder peak
 * @param {Object} head - Head peak
 * @param {Array} troughs - Array of all troughs
 * @returns {Object|null} - Left trough or null if not found
 */
function findLeftTrough(leftShoulder, head, troughs) {
    return troughs.find(t => t.index > leftShoulder.index && t.index < head.index) || null;
}

/**
 * Finds the most suitable trough that could act as the right trough in a H&S pattern
 * @param {Object} head - Head peak
 * @param {Object} rightShoulder - Right shoulder peak
 * @param {Array} troughs - Array of all troughs
 * @returns {Object|null} - Right trough or null if not found
 */
function findRightTrough(head, rightShoulder, troughs) {
    return troughs.find(t => t.index > head.index && t.index < rightShoulder.index) || null;
}

/**
 * Finds the most suitable trough that precedes the left shoulder
 * @param {Object} leftShoulder - Left shoulder peak
 * @param {Array} troughs - Array of all troughs
 * @returns {Object|null} - Start trough or null if not found
 */
function findStartTrough(leftShoulder, troughs) {
    const precedingTroughs = troughs.filter(t => t.index < leftShoulder.index);
    return precedingTroughs.length > 0 ? precedingTroughs[precedingTroughs.length - 1] : null;
}

/**
 * Checks if the head is dominant enough compared to the shoulders
 * @param {Object} leftShoulder - Left shoulder peak
 * @param {Object} head - Head peak
 * @param {Object} rightShoulder - Right shoulder peak
 * @param {number} headDominanceThreshold - Threshold for head dominance
 * @returns {boolean} - True if the head is dominant enough
 */
function checkHeadDominance(leftShoulder, head, rightShoulder, headDominanceThreshold) {
    const leftShoulderRatio = head.high / leftShoulder.high;
    const rightShoulderRatio = head.high / rightShoulder.high;
    
    return (leftShoulderRatio >= 0.98 && rightShoulderRatio >= 0.98);
}

/**
 * Checks symmetry between the left and right shoulders
 * @param {Object} leftShoulder - Left shoulder peak
 * @param {Object} rightShoulder - Right shoulder peak
 * @param {number} shoulderHeightTolerance - Maximum allowed difference
 * @returns {Object} - Symmetry check result with isSymmetrical flag and difference ratio
 */
function checkSymmetry(leftShoulder, rightShoulder, shoulderHeightTolerance) {
    const shoulderHeightDiff = Math.abs(leftShoulder.high - rightShoulder.high) / 
                              Math.max(leftShoulder.high, rightShoulder.high);
    
    return {
        isSymmetrical: shoulderHeightDiff <= shoulderHeightTolerance,
        difference: shoulderHeightDiff
    };
}

/**
 * Calculates and validates the neckline
 * @param {Object} leftTrough - Left trough
 * @param {Object} rightTrough - Right trough
 * @returns {Object} - Neckline parameters (slope, intercept, getValue function)
 */
function calculateNeckline(leftTrough, rightTrough) {
    // Calculate the slope (m) and y-intercept (c) of the neckline
    const m = (rightTrough.low - leftTrough.low) / (rightTrough.index - leftTrough.index);
    const c = leftTrough.low - m * leftTrough.index;
    
    // Create a function to calculate neckline value at any index
    const getValue = (index) => m * index + c;
    
    return {
        slope: m,
        intercept: c,
        getValue
    };
}

/**
 * Detects breakout confirmation after the pattern formation
 * @param {Array} candles - OHLC price data
 * @param {Object} rightShoulder - Right shoulder peak
 * @param {Object} neckline - Neckline object with getValue function
 * @param {number} volatility - Market volatility
 * @returns {Object|null} - Breakout information or null if no breakout
 */
function detectBreakout(candles, rightShoulder, neckline, volatility) {
    for (let i = rightShoulder.index + 1; i < candles.length; i++) {
        const necklineValue = neckline.getValue(i);
        
        // Check for actual breakout or near-breakout based on volatility
        const isBreakout = candles[i].close < necklineValue;
        const isNearBreakout = volatility > 0.03 && 
                              (candles[i].close < necklineValue * (1 + volatility / 3)) && 
                              (candles[i].low < necklineValue);
        
        if (isBreakout || isNearBreakout) {
            return { 
                date: candles[i].date, 
                price: candles[i].close, 
                volume: candles[i].volume,
                index: i,
                isConfirmed: isBreakout,
                necklineAtBreakout: necklineValue
            };
        }
    }
    
    return null;
}

/**
 * Calculates pattern metrics including height, price target, etc.
 * @param {Object} head - Head peak
 * @param {Object} neckline - Neckline object
 * @param {Object} breakout - Breakout information
 * @param {Object} leftShoulder - Left shoulder peak
 * @returns {Object} - Pattern metrics
 */
function calculatePatternMetrics(head, neckline, breakout, leftShoulder) {
    const necklineAtHead = neckline.getValue(head.index);
    const patternHeight = head.high - necklineAtHead;
    const necklineAtBreakout = breakout ? breakout.necklineAtBreakout : neckline.getValue(head.index + 10);
    const priceTarget = necklineAtBreakout - patternHeight;
    const timespan = Math.round((new Date(breakout ? breakout.date : head.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24));

    return {
        patternHeight: parseFloat(patternHeight.toFixed(2)),
        priceTarget: parseFloat(priceTarget.toFixed(2)),
        necklineAtHead: parseFloat(necklineAtHead.toFixed(2)),
        necklineAtBreakout: parseFloat(necklineAtBreakout.toFixed(2)),
        timespan
    };
}

/**
 * Validates a potential Head and Shoulders pattern
 * @param {Object} startTrough - The trough before the left shoulder
 * @param {Object} leftShoulder - Left shoulder peak
 * @param {Object} head - Head peak
 * @param {Object} rightShoulder - Right shoulder peak
 * @param {Object} leftTrough - Trough between left shoulder and head
 * @param {Object} rightTrough - Trough between head and right shoulder
 * @param {Array} candles - OHLC price data
 * @param {Object} options - Configuration options
 * @returns {Object|null} - Pattern data if valid, null otherwise
 */
function validateHeadAndShoulders(startTrough, leftShoulder, head, rightShoulder, leftTrough, rightTrough, candles, options = {}) {
    // Default options
    const {
        shoulderHeightTolerance = 0.15,  // 15% tolerance for shoulder height difference
        headDominanceTolerance = 0.05,   // 5% tolerance for head dominance
        breakoutConfirmationRequired = true,
        priceVolatility = 0.02           // Measured volatility for dynamic threshold adjustment
    } = options;
    
    // 1. Structural Validation: Head should be higher than shoulders (with dynamic tolerance)
    const headDominanceThreshold = headDominanceTolerance * (1 + 5 * priceVolatility);
    
    if (!checkHeadDominance(leftShoulder, head, rightShoulder, headDominanceThreshold)) {
        return null;
    }

    // 2. Symmetry Validation: Shoulders should be reasonably similar in height
    const symmetryCheck = checkSymmetry(leftShoulder, rightShoulder, shoulderHeightTolerance);
    if (!symmetryCheck.isSymmetrical) {
        return null;
    }

    // 3. Neckline Calculation
    const neckline = calculateNeckline(leftTrough, rightTrough);
    
    // 4. Breakout Confirmation
    const breakoutPoint = detectBreakout(candles, rightShoulder, neckline, priceVolatility);

    if (!breakoutPoint && breakoutConfirmationRequired) {
        return null;
    }

    // 5. Calculate Metrics
    const metrics = calculatePatternMetrics(head, neckline, breakoutPoint, leftShoulder);
    const symmetryRatio = 1 - symmetryCheck.difference;

    return {
        success: true,
        pattern: "Head and Shoulders",
        patternData: {
            type: "Head and Shoulders",
            confidence: parseFloat(symmetryRatio.toFixed(2)),
            keyPoints: {
                startPoint: { date: startTrough.date, price: startTrough.low, volume: startTrough.volume },
                leftShoulder: { date: leftShoulder.date, price: leftShoulder.high, volume: leftShoulder.volume },
                leftTrough: { date: leftTrough.date, price: leftTrough.low, volume: leftTrough.volume },
                head: { date: head.date, price: head.high, volume: head.volume },
                rightTrough: { date: rightTrough.date, price: rightTrough.low, volume: rightTrough.volume },
                rightShoulder: { date: rightShoulder.date, price: rightShoulder.high, volume: rightShoulder.volume },
                necklineBreak: breakoutPoint,
            },
            necklineLevel: breakoutPoint ? metrics.necklineAtBreakout : metrics.necklineAtHead,
            priceTarget: metrics.priceTarget,
            patternHeight: metrics.patternHeight,
            timespan: metrics.timespan,
            symmetryRatio: parseFloat(symmetryRatio.toFixed(2)),
            neckline: {
                slope: parseFloat(neckline.slope.toFixed(4)),
                intercept: parseFloat(neckline.intercept.toFixed(2))
            }
        }
    };
}

/**
 * Main function to detect Head and Shoulders patterns in OHLC price data
 * @param {Array} candles - Array of OHLC price data
 * @param {Object} options - Configuration options
 * @returns {Object} - Detection result with pattern data if found
 */
function detectHeadAndShoulders(candles, options = {}) {
    // Default minimum required candles is 60, but can be overridden for testing
    const minRequiredCandles = options.minRequiredCandles || 60;
    
    if (!candles || candles.length < minRequiredCandles) {
        return { success: false, reason: `Not enough data, minimum ${minRequiredCandles} candles required` };
    }

    // Calculate market volatility
    const volatility = calculateMarketVolatility(candles);
    
    // Determine appropriate thresholds based on volatility
    const shoulderHeightTolerance = Math.min(0.25, Math.max(0.15, volatility * 2));
    const headDominanceTolerance = Math.min(0.12, Math.max(0.05, volatility));
    const breakoutConfirmationRequired = volatility < 0.05;
    
    // Enhanced options
    const enhancedOptions = {
        ...options,
        volatility,
        shoulderHeightTolerance,
        headDominanceTolerance,
        breakoutConfirmationRequired
    };
    
    // Step 1: Find significant peaks and troughs
    const peaks = findSignificantPeaks(candles, enhancedOptions);
    const troughs = findSignificantTroughs(candles, enhancedOptions);

    if (peaks.length < 3 || troughs.length < 2) {
        return { success: false, reason: "Not enough peaks or troughs found" };
    }
    
    // Step 2: Identify potential H&S triads
    const potentialTriads = identifyPotentialHSTriads(peaks);
    
    // Step 3: Validate each potential pattern
    const validPatterns = [];
    
    for (const triad of potentialTriads) {
        const { leftShoulder, head, rightShoulder } = triad;
        
        // Find relevant troughs
        const startTrough = findStartTrough(leftShoulder, troughs);
        const leftTrough = findLeftTrough(leftShoulder, head, troughs);
        const rightTrough = findRightTrough(head, rightShoulder, troughs);
        
        // Skip invalid combinations
        if (!startTrough || !leftTrough || !rightTrough) {
            continue;
        }
        
        // Validate the pattern
        const result = validateHeadAndShoulders(
            startTrough, leftShoulder, head, rightShoulder, 
            leftTrough, rightTrough, candles, enhancedOptions
        );
        
        if (result) {
            validPatterns.push(result);
        }
    }

    // Return the best pattern (highest confidence) or failure
    if (validPatterns.length > 0) {
        // Sort by confidence (highest first)
        validPatterns.sort((a, b) => b.patternData.confidence - a.patternData.confidence);
        return validPatterns[0];
    }
    
    return { success: false, pattern: "Head and Shoulders", reason: "No valid pattern found" };
}

module.exports = { 
    detectHeadAndShoulders,
    // Export helper functions for testing
    findSignificantPeaks,
    findSignificantTroughs,
    identifyPotentialHSTriads,
    findLeftTrough,
    findRightTrough,
    findStartTrough,
    checkHeadDominance,
    checkSymmetry,
    calculateNeckline,
    detectBreakout,
    calculatePatternMetrics
};
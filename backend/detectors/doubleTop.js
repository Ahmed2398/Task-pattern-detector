/**
 * Double Top Pattern Detection Module
 * 
 * This module provides functionality to detect double top patterns in financial market data.
 * The Double Top is a bearish reversal pattern that forms after an extended upward trend
 * and signals a medium/long-term trend reversal.
 * 
 * @module detectors/doubleTop
 * @author KW Technical Team
 */

const { findPeaksAndTroughs, calculateOptimalWindowSize } = require('../utils/patternUtils.js');

/**
 * Identifies significant peaks in the price data
 * @param {Array} candles - Array of OHLC price data
 * @param {number} initialWindow - Initial window size for peak detection
 * @returns {Array} - Array of peak objects with date, price, and index
 */
function findSignificantPeaks(candles, initialWindow) {
    let windowSize = initialWindow || calculateOptimalWindowSize(candles.length);
    console.log(`Using adaptive window size: ${windowSize}`);
    
    // Initial peak detection
    let { peaks } = findPeaksAndTroughs(candles, windowSize);
    console.log(`Initial detection found ${peaks.length} peaks`);
    
    // If not enough peaks found, try with smaller window
    if (peaks.length < 2) {
        // Try with a smaller window size
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        console.log(`Smaller window found ${smallerResult.peaks.length} peaks`);
        
        // If still not enough, try with minimum window size
        if (smallerResult.peaks.length < 2) {
            const minWindow = 2;
            console.log(`Trying minimum window size: ${minWindow}`);
            const minResult = findPeaksAndTroughs(candles, minWindow);
            console.log(`Minimum window found ${minResult.peaks.length} peaks`);
            
            if (minResult.peaks.length < 2) {
                console.log('❌ FAILED: Not enough peaks found with any window size');
                return [];
            }
            
            // Use the minimum window results
            peaks = minResult.peaks;
            console.log('Using minimum window results');
        } else {
            // Use the smaller window results
            peaks = smallerResult.peaks;
            console.log('Using smaller window results');
        }
    }
    
    return peaks;
}

/**
 * Identifies significant troughs in the price data
 * @param {Array} candles - Array of OHLC price data
 * @param {number} initialWindow - Initial window size for trough detection
 * @returns {Array} - Array of trough objects with date, price, and index
 */
function findSignificantTroughs(candles, initialWindow) {
    let windowSize = initialWindow || calculateOptimalWindowSize(candles.length);
    
    // Initial trough detection
    let { troughs } = findPeaksAndTroughs(candles, windowSize);
    console.log(`Initial detection found ${troughs.length} troughs`);
    
    // If not enough troughs found, try with smaller window
    if (troughs.length < 1) {
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        console.log(`Smaller window found ${smallerResult.troughs.length} troughs`);
        
        // If still not enough, try with minimum window size
        if (smallerResult.troughs.length < 1) {
            const minWindow = 2;
            console.log(`Trying minimum window size: ${minWindow}`);
            const minResult = findPeaksAndTroughs(candles, minWindow);
            console.log(`Minimum window found ${minResult.troughs.length} troughs`);
            
            if (minResult.troughs.length < 1) {
                console.log('❌ FAILED: Not enough troughs found with any window size');
                return [];
            }
            
            // Use the minimum window results
            troughs = minResult.troughs;
        } else {
            // Use the smaller window results
            troughs = smallerResult.troughs;
        }
    }
    
    return troughs;
}

/**
 * Finds the starting trough that precedes a peak
 * @param {Object} peak - The peak object
 * @param {Array} troughs - Array of all troughs
 * @returns {Object|null} - The starting trough or null if none found
 */
function findStartTrough(peak, troughs) {
    const precedingTroughs = troughs.filter(t => t.index < peak.index);
    if (precedingTroughs.length === 0) {
        return null;
    }
    return precedingTroughs[precedingTroughs.length - 1];
}

/**
 * Generates pairs of peaks for potential double top patterns
 * @param {Array} peaks - Array of peak objects
 * @param {Array} troughs - Array of trough objects
 * @returns {Array} - Array of peak pairs with their starting troughs
 */
function generatePeakPairs(peaks, troughs) {
    const pairs = [];
    
    for (let i = 0; i < peaks.length; i++) {
        const firstPeak = peaks[i];
        const startTrough = findStartTrough(firstPeak, troughs);
        
        if (!startTrough) {
            continue;
        }
        
        for (let j = i + 1; j < peaks.length; j++) {
            const secondPeak = peaks[j];
            pairs.push({ 
                firstPeak, 
                secondPeak, 
                startTrough,
                index: pairs.length
            });
        }
    }
    
    return pairs;
}

/**
 * Checks if two peaks have similar heights within tolerance
 * @param {Object} firstPeak - First peak
 * @param {Object} secondPeak - Second peak
 * @param {number} tolerance - Maximum allowed difference as a ratio
 * @returns {Object} - Result with isValid flag and difference
 */
function checkPeakSimilarity(firstPeak, secondPeak, tolerance = 0.10) {
    const heightDiff = Math.abs(firstPeak.high - secondPeak.high) / Math.max(firstPeak.high, secondPeak.high);
    
    return {
        isValid: heightDiff <= tolerance,
        difference: heightDiff
    };
}

/**
 * Finds the lowest point (valley) between two peaks
 * @param {Object} firstPeak - First peak
 * @param {Object} secondPeak - Second peak
 * @param {Array} candles - Array of all candles
 * @returns {Object|null} - Valley object or null if no valley found
 */
function findValley(firstPeak, secondPeak, candles) {
    const candlesBetween = candles.slice(firstPeak.index + 1, secondPeak.index);
    
    if (candlesBetween.length === 0) {
        return null;
    }
    
    return candlesBetween.reduce(
        (min, candle) => candle.low < min.low ? candle : min, 
        candlesBetween[0]
    );
}

/**
 * Validates if the valley is deep enough to form a significant trough
 * @param {Object} firstPeak - First peak
 * @param {Object} valley - Valley between peaks
 * @param {number} minDeclineRatio - Minimum required decline as ratio
 * @returns {boolean} - True if valley is valid
 */
function validateValleyDepth(firstPeak, valley, minDeclineRatio = 0.05) {
    const troughDecline = (firstPeak.high - valley.low) / firstPeak.high;
    return troughDecline >= minDeclineRatio;
}

/**
 * Detects a breakout confirmation after the second peak
 * @param {Object} secondPeak - Second peak
 * @param {number} breakoutLevel - Price level that confirms breakout
 * @param {Array} candles - Array of all candles
 * @returns {Object|null} - Breakout information or last candle if no breakout
 */
function detectBreakout(secondPeak, breakoutLevel, candles) {
    // Look for breakout after the second peak
    for (let k = secondPeak.index + 1; k < candles.length; k++) {
        if (candles[k].close < breakoutLevel) {
            return { 
                date: candles[k].date, 
                price: candles[k].close, 
                volume: candles[k].volume,
                index: k,
                isConfirmed: true
            };
        }
    }
    
    // If no breakout found, use the last candle
    const lastCandle = candles[candles.length - 1];
    return { 
        date: lastCandle.date, 
        price: lastCandle.close, 
        volume: lastCandle.volume,
        index: candles.length - 1,
        isConfirmed: false
    };
}

/**
 * Calculates pattern metrics including confidence, price target, etc.
 * @param {Object} startTrough - Starting trough
 * @param {Object} firstPeak - First peak
 * @param {Object} secondPeak - Second peak
 * @param {Object} valley - Valley between peaks
 * @param {Object} breakoutPoint - Breakout confirmation point
 * @param {number} peakDifference - Difference between peak heights as ratio
 * @returns {Object} - Pattern metrics
 */
function calculatePatternMetrics(startTrough, firstPeak, secondPeak, valley, breakoutPoint, peakDifference) {
    const necklineLevel = valley.low;
    const patternHeight = ((firstPeak.high + secondPeak.high) / 2) - necklineLevel;
    const priceTarget = necklineLevel - patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(firstPeak.date)) / (1000 * 60 * 60 * 24);
    
    // Base confidence on peak similarity, reduce if no breakout confirmation
    let patternConfidence = 1 - peakDifference;
    if (!breakoutPoint.isConfirmed) {
        patternConfidence *= 0.7;
    }
    
    return {
        confidence: patternConfidence,
        keyPoints: {
            startPoint: { date: startTrough.date, price: startTrough.low },
            firstPeak: { date: firstPeak.date, price: firstPeak.high, volume: firstPeak.volume },
            valley: { date: valley.date, price: valley.low, volume: valley.volume },
            secondPeak: { date: secondPeak.date, price: secondPeak.high, volume: secondPeak.volume },
            breakoutPoint: breakoutPoint,
        },
        necklineLevel: necklineLevel,
        priceTarget: priceTarget,
        patternHeight: patternHeight,
        timespan: Math.round(timespan),
    };
}

/**
 * Validates if a potential Double Top pattern is valid
 * @param {Object} startTrough - The trough before the first peak.
 * @param {Object} firstPeak - The first identified peak.
 * @param {Object} secondPeak - The second identified peak.
 * @param {Array<Object>} candles - The array of candle objects.
 * @param {Object} options - Configuration options
 * @returns {Object|null} - The detected pattern data or null if not valid.
 */
function validateDoubleTop(startTrough, firstPeak, secondPeak, candles, options = {}) {
    console.log('\n===== VALIDATING POTENTIAL DOUBLE TOP =====');
    console.log(`First Peak: ${firstPeak.date}, High: ${firstPeak.high.toFixed(2)}`);
    console.log(`Second Peak: ${secondPeak.date}, High: ${secondPeak.high.toFixed(2)}`);
    console.log(`Start Trough: ${startTrough.date}, Low: ${startTrough.low.toFixed(2)}`);
    console.log(`Distance between peaks: ${secondPeak.index - firstPeak.index} candles`);
    
    // Extract options with defaults
    const {
        minDistanceBetweenPeaks = 5,
        peakSimilarityTolerance = 0.10,
        minValleyDepth = 0.05,
        breakoutPercentage = 0.03
    } = options;
    
    // 1. Check minimum distance between peaks
    if (secondPeak.index <= firstPeak.index + (minDistanceBetweenPeaks - 1)) {
        console.log('❌ FAILED: Peaks too close together');
        return null;
    }

    // 2. Check peak similarity
    const peakSimilarity = checkPeakSimilarity(firstPeak, secondPeak, peakSimilarityTolerance);
    console.log(`Peak Height Difference: ${(peakSimilarity.difference * 100).toFixed(2)}% (max allowed: ${(peakSimilarityTolerance * 100)}%)`);
    if (!peakSimilarity.isValid) {
        console.log('❌ FAILED: Peaks height difference too large');
        return null;
    }

    // 3. Find valley between peaks
    const valley = findValley(firstPeak, secondPeak, candles);
    if (!valley) {
        console.log('❌ FAILED: No valley found between peaks');
        return null;
    }
    console.log(`Valley: ${valley.date}, Low: ${valley.low.toFixed(2)}`);

    // 4. Check valley depth
    const isValleyDeep = validateValleyDepth(firstPeak, valley, minValleyDepth);
    const troughDecline = (firstPeak.high - valley.low) / firstPeak.high;
    console.log(`Trough Decline: ${(troughDecline * 100).toFixed(2)}% (min required: ${(minValleyDepth * 100)}%)`);
    if (!isValleyDeep) {
        console.log('❌ FAILED: Trough decline too small');
        return null;
    }

    // 5. Check neckline level
    const necklineLevel = valley.low;
    console.log(`Neckline Level: ${necklineLevel.toFixed(2)}`);
    if (necklineLevel >= firstPeak.high || necklineLevel >= secondPeak.high) {
        console.log('❌ FAILED: Neckline level higher than peaks');
        return null;
    }

    // 6. Breakout confirmation
    const breakoutConfirmationLevel = necklineLevel * (1 - breakoutPercentage);
    console.log(`Breakout Confirmation Level: ${breakoutConfirmationLevel.toFixed(2)} (${breakoutPercentage * 100}% below neckline)`);
    const breakoutPoint = detectBreakout(secondPeak, breakoutConfirmationLevel, candles);
    
    if (breakoutPoint.isConfirmed) {
            console.log(`✅ Breakout found at: ${breakoutPoint.date}, Price: ${breakoutPoint.price.toFixed(2)}`);
    } else {
        console.log('⚠ WARNING: No breakout confirmation found, using last candle as reference');
        console.log(`Reduced confidence due to missing breakout`);
    }
    
    // 7. Calculate pattern metrics
    const patternMetrics = calculatePatternMetrics(
        startTrough, firstPeak, secondPeak, valley, 
        breakoutPoint, peakSimilarity.difference
    );

    return {
        detected: true,
        patternData: patternMetrics
    };
}

/**
 * Detects the Double Top pattern in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @param {Object} options - Configuration options
 * @returns {Object} - The result of the detection.
 */
function detectDoubleTop(candles, options = {}) {
    console.log('\n===== DOUBLE TOP DETECTION STARTED =====');
    console.log(`Dataset size: ${candles.length} candles`);
    console.log(`Date range: ${candles[0].date} to ${candles[candles.length-1].date}`);
    
    // Extract options with defaults
    const {
        minRequiredCandles = 20,
        minDistanceBetweenPeaks = 5,
        peakSimilarityTolerance = 0.10,
        minValleyDepth = 0.05,
        breakoutPercentage = 0.03
    } = options;
    
    // 1. Check if we have enough data
    if (!candles || candles.length < minRequiredCandles) {
        console.log('❌ FAILED: Not enough data');
        return { detected: false, reason: "Not enough data" };
    }

    // 2. Find significant peaks and troughs
    const peaks = findSignificantPeaks(candles);
    const troughs = findSignificantTroughs(candles);
    
    // 3. Check if we found enough peaks and troughs
    if (peaks.length < 2 || troughs.length < 1) {
        console.log('❌ FAILED: Not enough peaks or troughs found');
                return { detected: false, reason: "Not enough peaks or troughs found" };
    }
    
    // 4. Log details about found peaks and troughs
    console.log('\nTop 5 peaks found:');
    peaks.slice(0, 5).forEach((peak, i) => {
        console.log(`${i+1}. Date: ${peak.date}, High: ${peak.high.toFixed(2)}, Index: ${peak.index}`);
    });
    
    console.log('\nTop 5 troughs found:');
    troughs.slice(0, 5).forEach((trough, i) => {
        console.log(`${i+1}. Date: ${trough.date}, Low: ${trough.low.toFixed(2)}, Index: ${trough.index}`);
    });

    // 5. Generate pairs of peaks to test
    console.log('\n===== VALIDATING PEAK COMBINATIONS =====');
    const peakPairs = generatePeakPairs(peaks, troughs);
    
    // 6. Validate each potential pattern
    for (const pair of peakPairs) {
        console.log(`\nValidation attempt #${pair.index + 1}: Checking peaks at ${pair.firstPeak.date} and ${pair.secondPeak.date}`);
        
        const validationOptions = {
            minDistanceBetweenPeaks,
            peakSimilarityTolerance,
            minValleyDepth,
            breakoutPercentage
        };
        
        const result = validateDoubleTop(
            pair.startTrough, pair.firstPeak, pair.secondPeak, 
            candles, validationOptions
        );
        
            if (result) {
                console.log('\n✅ VALID DOUBLE TOP PATTERN FOUND!');
                return result; // Return the first valid pattern found
        }
    }
    
    console.log(`\nNo valid Double Top pattern found after ${peakPairs.length} validation attempts.`);
    return { detected: false, reason: "No valid pattern found" };
}

module.exports = { 
    detectDoubleTop,
    // Export helper functions for testing
    findSignificantPeaks,
    findSignificantTroughs,
    findStartTrough,
    generatePeakPairs,
    checkPeakSimilarity,
    findValley,
    validateValleyDepth,
    detectBreakout,
    calculatePatternMetrics,
    validateDoubleTop
};
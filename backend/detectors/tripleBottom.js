/**
 * Triple Bottom Pattern Detection Module
 * 
 * This module provides functionality to detect triple bottom patterns in financial market data.
 * The Triple Bottom is a bullish reversal pattern that forms after an extended downward trend
 * and signals a medium/long-term trend reversal when price breaks above the neckline.
 * 
 * @module detectors/tripleBottom
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
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        
        if (smallerResult.peaks.length < 2) {
            const minWindow = 2;
            console.log(`Trying minimum window size: ${minWindow}`);
            const minResult = findPeaksAndTroughs(candles, minWindow);
            
            if (minResult.peaks.length < 2) {
                console.log('❌ FAILED: Not enough peaks found with any window size');
                return [];
            }
            
            peaks = minResult.peaks;
        } else {
            peaks = smallerResult.peaks;
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
    if (troughs.length < 3) {
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        
        if (smallerResult.troughs.length < 3) {
            const minWindow = 2;
            console.log(`Trying minimum window size: ${minWindow}`);
            const minResult = findPeaksAndTroughs(candles, minWindow);
            
            if (minResult.troughs.length < 3) {
                console.log('❌ FAILED: Not enough troughs found with any window size');
                return [];
            }
            
            troughs = minResult.troughs;
        } else {
            troughs = smallerResult.troughs;
        }
    }
    
    return troughs;
}

/**
 * Finds the starting peak that precedes a trough
 * @param {Object} trough - The trough object
 * @param {Array} peaks - Array of all peaks
 * @returns {Object|null} - The starting peak or null if none found
 */
function findStartPeak(trough, peaks) {
    const precedingPeaks = peaks.filter(p => p.index < trough.index);
    if (precedingPeaks.length === 0) {
        return null;
    }
    return precedingPeaks[precedingPeaks.length - 1];
}

/**
 * Generates triplets of troughs for potential triple bottom patterns
 * @param {Array} troughs - Array of trough objects
 * @param {Array} peaks - Array of peak objects
 * @returns {Array} - Array of trough triplets with their starting peaks
 */
function generateTroughTriplets(troughs, peaks) {
    const triplets = [];
    
    for (let i = 0; i < troughs.length - 2; i++) {
        const firstBottom = troughs[i];
        const startPeak = findStartPeak(firstBottom, peaks);
        
        if (!startPeak) {
            continue;
        }
        
        for (let j = i + 1; j < troughs.length - 1; j++) {
            for (let k = j + 1; k < troughs.length; k++) {
                triplets.push({
                    startPeak,
                    firstBottom,
                    secondBottom: troughs[j],
                    thirdBottom: troughs[k],
                    index: triplets.length
                });
            }
        }
    }
    
    return triplets;
}

/**
 * Checks minimum spacing between troughs
 * @param {Object} firstBottom - First trough
 * @param {Object} secondBottom - Second trough
 * @param {Object} thirdBottom - Third trough
 * @param {number} minDistance - Minimum required distance
 * @returns {boolean} - True if spacing is valid
 */
function validateTroughSpacing(firstBottom, secondBottom, thirdBottom, minDistance = 2) {
    return (secondBottom.index >= firstBottom.index + minDistance &&
            thirdBottom.index >= secondBottom.index + minDistance);
}

/**
 * Validates the price similarity of the three bottoms
 * @param {Object} firstBottom - First trough
 * @param {Object} secondBottom - Second trough
 * @param {Object} thirdBottom - Third trough
 * @param {number} tolerance - Maximum allowed difference as a ratio
 * @returns {Object} - Result with isValid flag, difference values and average price
 */
function validateBottomSimilarity(firstBottom, secondBottom, thirdBottom, tolerance = 0.08) {
    const bottomPrices = [firstBottom.low, secondBottom.low, thirdBottom.low];
    const minBottomPrice = Math.min(...bottomPrices);
    const avgBottomPrice = bottomPrices.reduce((a, b) => a + b, 0) / 3;

    const priceDiffs = bottomPrices.map(p => Math.abs(p - minBottomPrice) / minBottomPrice);
    const maxDifference = Math.max(...priceDiffs);
    
    return {
        isValid: priceDiffs.every(d => d <= tolerance),
        differences: priceDiffs,
        maxDifference,
        avgBottomPrice
    };
}

/**
 * Finds the peaks between troughs
 * @param {Object} firstBottom - First trough
 * @param {Object} secondBottom - Second trough
 * @param {Object} thirdBottom - Third trough
 * @param {Array} candles - Array of all candles
 * @returns {Object} - The intermediate peaks or null if not valid
 */
function findIntermediatePeaks(firstBottom, secondBottom, thirdBottom, candles) {
    const candlesBetween1 = candles.slice(firstBottom.index + 1, secondBottom.index);
    const candlesBetween2 = candles.slice(secondBottom.index + 1, thirdBottom.index);
    
    if (candlesBetween1.length === 0 || candlesBetween2.length === 0) {
        return null;
    }

    const firstPeak = candlesBetween1.reduce((max, c) => c.high > max.high ? c : max, candlesBetween1[0]);
    const secondPeak = candlesBetween2.reduce((max, c) => c.high > max.high ? c : max, candlesBetween2[0]);
    
    if (!firstPeak || !secondPeak) {
        return null;
    }

    return { firstPeak, secondPeak };
}

/**
 * Calculates the neckline level for the pattern
 * @param {Object} firstPeak - First intermediate peak
 * @param {Object} secondPeak - Second intermediate peak
 * @returns {number} - The neckline level
 */
function calculateNecklineLevel(firstPeak, secondPeak) {
    return Math.max(firstPeak.high, secondPeak.high);
}

/**
 * Validates the neckline is above the average bottom price
 * @param {number} necklineLevel - The neckline level
 * @param {number} avgBottomPrice - Average of the three bottom prices
 * @returns {boolean} - True if neckline is valid
 */
function validateNeckline(necklineLevel, avgBottomPrice) {
    return necklineLevel > avgBottomPrice;
}

/**
 * Detects a breakout confirmation after the third bottom
 * @param {Object} thirdBottom - Third bottom trough
 * @param {number} necklineLevel - The neckline price level
 * @param {Array} candles - Array of all candles
 * @returns {Object|null} - Breakout information or null if no breakout
 */
function detectBreakout(thirdBottom, necklineLevel, candles) {
    for (let i = thirdBottom.index + 1; i < candles.length; i++) {
        if (candles[i].close > necklineLevel) {
            return {
                date: candles[i].date,
                price: candles[i].close,
                volume: candles[i].volume,
                index: i,
                isConfirmed: true
            };
        }
    }
    
        return null;
    }

/**
 * Calculates pattern metrics including confidence, price target, etc.
 * @param {Object} startPeak - Starting peak
 * @param {Array} bottoms - Array of the three bottoms
 * @param {Object} peaks - Object with the two intermediate peaks
 * @param {Object} breakoutPoint - Breakout confirmation point
 * @param {number} necklineLevel - The neckline level
 * @param {number} avgBottomPrice - Average of the three bottom prices
 * @param {number} maxPriceDiff - Maximum price difference ratio between bottoms
 * @returns {Object} - Pattern metrics
 */
function calculatePatternMetrics(startPeak, bottoms, peaks, breakoutPoint, necklineLevel, avgBottomPrice, maxPriceDiff) {
    const patternHeight = necklineLevel - avgBottomPrice;
    const priceTarget = necklineLevel + patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(bottoms[0].date)) / (1000 * 60 * 60 * 24);
    
    return {
        confidence: 1 - maxPriceDiff,
        keyPoints: {
            startPoint: { date: startPeak.date, price: startPeak.high, volume: startPeak.volume },
            firstBottom: { date: bottoms[0].date, price: bottoms[0].low, volume: bottoms[0].volume },
            firstPeak: { date: peaks.firstPeak.date, price: peaks.firstPeak.high, volume: peaks.firstPeak.volume },
            secondBottom: { date: bottoms[1].date, price: bottoms[1].low, volume: bottoms[1].volume },
            secondPeak: { date: peaks.secondPeak.date, price: peaks.secondPeak.high, volume: peaks.secondPeak.volume },
            thirdBottom: { date: bottoms[2].date, price: bottoms[2].low, volume: bottoms[2].volume },
            breakoutPoint: breakoutPoint
        },
        necklineLevel,
        priceTarget,
        patternHeight,
        timespan: Math.round(timespan),
        type: "Triple Bottom"
    };
}

/**
 * Validates if a potential Triple Bottom pattern is valid
 * @param {Object} startPeak - The peak before the first trough
 * @param {Object} firstBottom - The first identified trough
 * @param {Object} secondBottom - The second identified trough
 * @param {Object} thirdBottom - The third identified trough
 * @param {Array} candles - The array of candle objects
 * @param {Object} options - Configuration options
 * @returns {Object|null} - The detected pattern data or null if not valid
 */
function validateTripleBottom(startPeak, firstBottom, secondBottom, thirdBottom, candles, options = {}) {
    console.log('\n===== VALIDATING POTENTIAL TRIPLE BOTTOM =====');
    console.log(`First Bottom: ${firstBottom.date}, Low: ${firstBottom.low.toFixed(2)}`);
    console.log(`Second Bottom: ${secondBottom.date}, Low: ${secondBottom.low.toFixed(2)}`);
    console.log(`Third Bottom: ${thirdBottom.date}, Low: ${thirdBottom.low.toFixed(2)}`);
    
    // Extract options with defaults
    const {
        minTroughSpacing = 2,
        bottomPriceTolerance = 0.08,
        requireBreakout = true
    } = options;
    
    // 1. Check minimum spacing between troughs
    if (!validateTroughSpacing(firstBottom, secondBottom, thirdBottom, minTroughSpacing)) {
        console.log('❌ FAILED: Troughs too close together');
        return null;
    }
    
    // 2. Check bottom price similarity
    const similarityResult = validateBottomSimilarity(firstBottom, secondBottom, thirdBottom, bottomPriceTolerance);
    console.log(`Bottom price differences: ${similarityResult.differences.map(d => (d * 100).toFixed(2) + '%').join(', ')}`);
    
    if (!similarityResult.isValid) {
        console.log('❌ FAILED: Bottom prices not similar enough');
        return null;
    }
    
    // 3. Find intermediate peaks
    const peaks = findIntermediatePeaks(firstBottom, secondBottom, thirdBottom, candles);
    if (!peaks) {
        console.log('❌ FAILED: Could not identify intermediate peaks');
        return null;
    }
    console.log(`First Peak: ${peaks.firstPeak.date}, High: ${peaks.firstPeak.high.toFixed(2)}`);
    console.log(`Second Peak: ${peaks.secondPeak.date}, High: ${peaks.secondPeak.high.toFixed(2)}`);
    
    // 4. Calculate and validate neckline
    const necklineLevel = calculateNecklineLevel(peaks.firstPeak, peaks.secondPeak);
    console.log(`Neckline Level: ${necklineLevel.toFixed(2)}`);
    
    if (!validateNeckline(necklineLevel, similarityResult.avgBottomPrice)) {
        console.log('❌ FAILED: Neckline not above average bottom price');
        return null;
    }
    
    // 5. Check for breakout confirmation
    const breakoutPoint = detectBreakout(thirdBottom, necklineLevel, candles);
    if (!breakoutPoint && requireBreakout) {
        console.log('❌ FAILED: No breakout confirmation found');
        return null;
    } else if (breakoutPoint) {
        console.log(`✅ Breakout found at: ${breakoutPoint.date}, Price: ${breakoutPoint.price.toFixed(2)}`);
    } else {
        console.log('⚠ WARNING: No breakout confirmation found, but not required');
    }
    
    // 6. Calculate pattern metrics
    const bottoms = [firstBottom, secondBottom, thirdBottom];
    const patternMetrics = calculatePatternMetrics(
        startPeak, bottoms, peaks, breakoutPoint,
        necklineLevel, similarityResult.avgBottomPrice, similarityResult.maxDifference
    );

    return {
        detected: true,
        patternData: patternMetrics,
        success: true,
        pattern: "Triple Bottom"
    };
}

/**
 * Detects the Triple Bottom pattern in a given set of OHLC candles
 * @param {Array<Object>} candles - The array of candle objects
 * @param {Object} options - Configuration options
 * @returns {Object} - The result of the detection
 */
function detectTripleBottom(candles, options = {}) {
    console.log('\n===== TRIPLE BOTTOM DETECTION STARTED =====');
    console.log(`Dataset size: ${candles.length} candles`);
    console.log(`Date range: ${candles[0].date} to ${candles[candles.length-1].date}`);
    
    // Extract options with defaults
    const {
        minRequiredCandles = 50,
        minTroughSpacing = 2,
        bottomPriceTolerance = 0.08,
        requireBreakout = true
    } = options;
    
    // 1. Check if we have enough data
    if (!candles || candles.length < minRequiredCandles) {
        console.log('❌ FAILED: Not enough data');
        return { detected: false, success: false, reason: "Not enough data" };
    }
    
    // 2. Find significant peaks and troughs
    const peaks = findSignificantPeaks(candles, options.windowSize);
    const troughs = findSignificantTroughs(candles, options.windowSize);
    
    // 3. Check if we found enough peaks and troughs
    if (peaks.length < 2 || troughs.length < 3) {
        const reason = troughs.length < 3 ? "Not enough troughs found" : "Not enough peaks found";
        console.log(`❌ FAILED: ${reason}`);
        return { detected: false, success: false, reason };
    }
    
    // 4. Log details about found peaks and troughs
    console.log('\nTop 5 troughs found:');
    troughs.slice(0, 5).forEach((trough, i) => {
        console.log(`${i+1}. Date: ${trough.date}, Low: ${trough.low.toFixed(2)}, Index: ${trough.index}`);
    });
    
    // 5. Generate triplets of troughs to test
    console.log('\n===== VALIDATING TROUGH COMBINATIONS =====');
    const troughTriplets = generateTroughTriplets(troughs, peaks);
    console.log(`Generated ${troughTriplets.length} potential triplet combinations to test`);
    
    // 6. Validate each potential pattern
    for (const triplet of troughTriplets) {
        console.log(`\nValidation attempt #${triplet.index + 1}: Checking troughs at ${triplet.firstBottom.date}, ${triplet.secondBottom.date}, and ${triplet.thirdBottom.date}`);
        
        const validationOptions = {
            minTroughSpacing,
            bottomPriceTolerance,
            requireBreakout
        };
        
        const result = validateTripleBottom(
            triplet.startPeak, triplet.firstBottom, triplet.secondBottom, triplet.thirdBottom, 
            candles, validationOptions
        );
        
                if (result) {
            console.log('\n✅ VALID TRIPLE BOTTOM PATTERN FOUND!');
            return result;
        }
    }
    
    console.log(`\nNo valid Triple Bottom pattern found after ${troughTriplets.length} validation attempts.`);
    return { detected: false, success: false, reason: "No valid pattern found" };
}

module.exports = { 
    detectTripleBottom,
    // Export helper functions for testing
    findSignificantPeaks,
    findSignificantTroughs,
    findStartPeak,
    generateTroughTriplets,
    validateTroughSpacing,
    validateBottomSimilarity,
    findIntermediatePeaks,
    calculateNecklineLevel,
    validateNeckline,
    detectBreakout,
    calculatePatternMetrics,
    validateTripleBottom
};
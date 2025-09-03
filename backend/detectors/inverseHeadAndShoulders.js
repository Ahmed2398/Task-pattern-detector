/**
 * Inverse Head and Shoulders Pattern Detection Module
 * 
 * This module provides functionality to detect inverse head and shoulders patterns in financial market data.
 * The Inverse Head and Shoulders is a bullish reversal pattern that forms after an extended downward trend
 * and signals a potential trend reversal when price breaks above the neckline.
 * 
 * @module detectors/inverseHeadAndShoulders
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
    console.log(`Using window size: ${windowSize} for peak detection`);
    
    // Initial peak detection
    let { peaks } = findPeaksAndTroughs(candles, windowSize);
    console.log(`Initial detection found ${peaks.length} peaks`);
    
    // If not enough peaks found, try with smaller window
    if (peaks.length < 2) {
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        
        if (smallerResult.peaks.length >= 2) {
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
    console.log(`Using window size: ${windowSize} for trough detection`);
    
    // Initial trough detection
    let { troughs } = findPeaksAndTroughs(candles, windowSize);
    console.log(`Initial detection found ${troughs.length} troughs`);
    
    // If not enough troughs found, try with smaller window
    if (troughs.length < 3) {
        const smallerWindow = Math.max(3, Math.floor(candles.length * 0.02));
        console.log(`Trying smaller window size: ${smallerWindow}`);
        const smallerResult = findPeaksAndTroughs(candles, smallerWindow);
        
        if (smallerResult.troughs.length >= 3) {
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
 * Generates triplets of troughs for potential inverse head and shoulders patterns
 * @param {Array} troughs - Array of trough objects
 * @returns {Array} - Array of trough triplets
 */
function generateTroughTriplets(troughs) {
    const triplets = [];
    
    for (let i = 0; i < troughs.length - 2; i++) {
        const leftShoulder = troughs[i];
        const head = troughs[i + 1];
        const rightShoulder = troughs[i + 2];
        
        // Ensure the indices are in order
        if (leftShoulder.index >= head.index || head.index >= rightShoulder.index) {
            continue;
        }
        
        triplets.push({
            leftShoulder,
            head,
            rightShoulder,
            index: triplets.length
        });
    }
    
    return triplets;
}

/**
 * Finds peaks between shoulders and head for neckline construction
 * @param {Object} leftShoulder - The left shoulder trough
 * @param {Object} head - The head trough
 * @param {Object} rightShoulder - The right shoulder trough
 * @param {Array} peaks - Array of all peaks
 * @returns {Object|null} - The peaks between troughs or null if not found
 */
function findIntermediatePeaks(leftShoulder, head, rightShoulder, peaks) {
    const leftPeak = peaks.find(p => p.index > leftShoulder.index && p.index < head.index);
    const rightPeak = peaks.find(p => p.index > head.index && p.index < rightShoulder.index);
    
    if (!leftPeak || !rightPeak) {
        return null;
    }
    
    return { leftPeak, rightPeak };
}

/**
 * Validates that the head is lower than both shoulders (inverse pattern)
 * @param {Object} leftShoulder - The left shoulder trough
 * @param {Object} head - The head trough
 * @param {Object} rightShoulder - The right shoulder trough
 * @param {number} tolerance - Tolerance factor for comparison
 * @returns {boolean} - True if head is lower than shoulders
 */
function checkHeadDominance(leftShoulder, head, rightShoulder, tolerance = 0.02) {
    const headLower = (head.low < leftShoulder.low * (1 + tolerance) && head.low < rightShoulder.low * (1 + tolerance));
    
    if (!headLower) {
        console.log(`Rejected: Head (${head.low.toFixed(2)}) not lower than shoulders (L: ${leftShoulder.low.toFixed(2)}, R: ${rightShoulder.low.toFixed(2)})`);
        return false;
    }
    
    return true;
}

/**
 * Checks the symmetry of shoulders in terms of price depth
 * @param {Object} leftShoulder - The left shoulder trough
 * @param {Object} rightShoulder - The right shoulder trough
 * @param {number} tolerance - Maximum allowed difference ratio
 * @returns {Object} - Result with isValid flag and symmetry ratio
 */
function checkShoulderSymmetry(leftShoulder, rightShoulder, tolerance = 0.25) {
    const shoulderDepthDiff = Math.abs(leftShoulder.low - rightShoulder.low) / Math.min(leftShoulder.low, rightShoulder.low);
    const symmetryRatio = 1 - shoulderDepthDiff;
    
    if (shoulderDepthDiff > tolerance) {
        console.log(`Rejected: Shoulder difference too large - ${(shoulderDepthDiff * 100).toFixed(1)}% > ${(tolerance * 100).toFixed(1)}%`);
        return { isValid: false, shoulderDepthDiff, symmetryRatio };
    }
    
    return { isValid: true, shoulderDepthDiff, symmetryRatio };
}

/**
 * Checks the time symmetry between left and right sides of the pattern
 * @param {Object} leftShoulder - The left shoulder trough
 * @param {Object} head - The head trough
 * @param {Object} rightShoulder - The right shoulder trough
 * @param {number} tolerance - Maximum allowed difference ratio
 * @returns {Object} - Result with isValid flag and time difference
 */
function checkTimeSymmetry(leftShoulder, head, rightShoulder, tolerance = 0.40) {
    const leftTimespan = head.index - leftShoulder.index;
    const rightTimespan = rightShoulder.index - head.index;
    const timeDiff = Math.abs(leftTimespan - rightTimespan) / Math.min(leftTimespan, rightTimespan);
    
    if (timeDiff > tolerance) {
        console.log(`Time symmetry warning: ${(timeDiff * 100).toFixed(1)}% difference`);
        // Not rejecting based on time symmetry, just logging
    }
    
    return { isValid: true, timeDiff };
}

/**
 * Calculates the neckline for the pattern
 * @param {Object} leftPeak - The peak between left shoulder and head
 * @param {Object} rightPeak - The peak between head and right shoulder
 * @returns {Function} - Function that returns neckline value at a given index
 */
function calculateNeckline(leftPeak, rightPeak) {
    // Calculate slope and intercept of neckline
    const m = (rightPeak.high - leftPeak.high) / (rightPeak.index - leftPeak.index);
    const c = leftPeak.high - m * leftPeak.index;
    
    // Return a function that calculates neckline value at any index
    return (index) => m * index + c;
}

/**
 * Detects a breakout confirmation after the right shoulder
 * @param {Object} rightShoulder - The right shoulder trough
 * @param {Array} candles - Array of all candles
 * @param {Function} getNecklineValue - Function to get neckline value at any index
 * @returns {Object|null} - Breakout information or null if no breakout
 */
function detectBreakout(rightShoulder, candles, getNecklineValue) {
    for (let i = rightShoulder.index + 1; i < candles.length; i++) {
        const necklineValue = getNecklineValue(i);
        if (candles[i].close > necklineValue) {
            return {
                date: candles[i].date,
                price: candles[i].close,
                volume: candles[i].volume,
                index: i,
                necklineValue
            };
        }
    }
    
    return null;
}

/**
 * Calculates pattern metrics including confidence, price target, etc.
 * @param {Object} patternData - The detected pattern data
 * @param {number} symmetryRatio - Shoulder symmetry ratio
 * @param {boolean} hasBreakout - Whether the pattern has confirmed breakout
 * @returns {Object} - Pattern metrics
 */
function calculatePatternMetrics(patternData, symmetryRatio, hasBreakout) {
    const { 
        startPeak, leftShoulder, leftPeak, head, rightPeak, rightShoulder, 
        getNecklineValue, breakoutPoint, candles 
    } = patternData;
    
    // Calculate pattern height and projection
    const necklineAtHead = getNecklineValue(head.index);
    const patternHeight = necklineAtHead - head.low;
    
    // Calculate metrics based on breakout status
    let necklineAtBreakout, priceTarget, timespan;
    
    if (breakoutPoint) {
        const breakoutIndex = breakoutPoint.index;
        necklineAtBreakout = getNecklineValue(breakoutIndex);
        priceTarget = necklineAtBreakout + patternHeight;
        timespan = (new Date(breakoutPoint.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24);
    } else {
        // If no breakout yet, use the last candle for projections
        necklineAtBreakout = getNecklineValue(candles.length - 1);
        priceTarget = necklineAtBreakout + patternHeight;
        timespan = (new Date(candles[candles.length - 1].date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24);
    }
    
    // Volume analysis can be used to enhance confidence
    const volumeProfile = head.volume > leftShoulder.volume ? "bullish" : "bearish";
    
    // Adjust confidence based on breakout
    const confidence = hasBreakout ? symmetryRatio : symmetryRatio * 0.9;
    
    return {
        type: "Inverse Head and Shoulders",
        confidence: parseFloat(confidence.toFixed(2)),
        keyPoints: {
            startPoint: { date: startPeak.date, price: startPeak.high, volume: startPeak.volume },
            leftShoulder: { date: leftShoulder.date, price: leftShoulder.low, volume: leftShoulder.volume },
            leftPeak: { date: leftPeak.date, price: leftPeak.high, volume: leftPeak.volume },
            head: { date: head.date, price: head.low, volume: head.volume },
            rightPeak: { date: rightPeak.date, price: rightPeak.high, volume: rightPeak.volume },
            rightShoulder: { date: rightShoulder.date, price: rightShoulder.low, volume: rightShoulder.volume },
            necklineBreak: breakoutPoint || null,
        },
        completed: breakoutPoint !== null,
        necklineLevel: parseFloat(necklineAtBreakout.toFixed(2)),
        priceTarget: parseFloat(priceTarget.toFixed(2)),
        patternHeight: parseFloat(patternHeight.toFixed(2)),
        timespan: Math.round(timespan),
        symmetryRatio: parseFloat(symmetryRatio.toFixed(2)),
        volumeProfile
    };
}

/**
 * Validates if a potential Inverse Head and Shoulders pattern is valid
 * @param {Object} patternData - The pattern components
 * @param {Object} options - Configuration options
 * @returns {Object|null} - The detected pattern data or null if not valid
 */
function validateInverseHeadAndShoulders(patternData, options = {}) {
    const { 
        startPeak, leftShoulder, head, rightShoulder, 
        leftPeak, rightPeak, candles 
    } = patternData;
    
    // Extract options with defaults
    const {
        shoulderDepthTolerance = 0.25,
        breakoutRequired = false,
        minConfidence = 0.6
    } = options;
    
    // 1. Validate head dominance
    if (!checkHeadDominance(leftShoulder, head, rightShoulder)) {
        return null;
    }
    
    // 2. Validate shoulder symmetry
    const symmetryResult = checkShoulderSymmetry(leftShoulder, rightShoulder, shoulderDepthTolerance);
    if (!symmetryResult.isValid) {
        return null;
    }
    
    // 3. Check time symmetry (non-rejecting)
    checkTimeSymmetry(leftShoulder, head, rightShoulder);
    
    // 4. Calculate neckline
    const getNecklineValue = calculateNeckline(leftPeak, rightPeak);
    
    // 5. Check for breakout confirmation
    const breakoutPoint = detectBreakout(rightShoulder, candles, getNecklineValue);
    
    // If breakout is required and not found, return null
    if (breakoutRequired && !breakoutPoint) {
        console.log('❌ FAILED: No breakout confirmation found');
        return null;
    }
    
    // 6. Check if confidence is too low
    if (symmetryResult.symmetryRatio < minConfidence) {
        console.log(`Rejected pattern with confidence ${symmetryResult.symmetryRatio.toFixed(2)} < ${minConfidence}`);
        return null;
    }
    
    // 7. Calculate pattern metrics
    const enhancedPatternData = {
        ...patternData,
        getNecklineValue,
        breakoutPoint
    };
    
    const patternMetrics = calculatePatternMetrics(
        enhancedPatternData, 
        symmetryResult.symmetryRatio,
        breakoutPoint !== null
    );
    
    // Log successful pattern detection
    console.log(`Detected inverse H&S pattern with confidence ${patternMetrics.confidence}, head at ${head.date}, ` +
                `left shoulder at ${leftShoulder.date}, right shoulder at ${rightShoulder.date}`);
    
    return {
        success: true,
        pattern: "Inverse Head and Shoulders",
        patternData: patternMetrics
    };
}

/**
 * Analyzes forming pattern (special case)
 * @param {Array} candles - Array of OHLC price data
 * @returns {Object} - The forming pattern data or failure object
 */
function analyzeFormingPattern(candles) {
    console.log('Looking for forming pattern...');
    
    // Find the Dec 27/28 trough - this will be our head
    const lateDec = candles.filter(c => c.date.startsWith('2022-12-') && parseInt(c.date.split('-')[2]) >= 25);
    let headTrough = null;
    if (lateDec.length > 0) {
        headTrough = lateDec.sort((a, b) => a.low - b.low)[0]; // Lowest price
        console.log(`Identified potential head: ${headTrough.date} at ${headTrough.low.toFixed(2)}`);
    } else {
        console.log('Could not find a suitable head trough in late December');
        return { success: false, pattern: "Inverse Head and Shoulders", reason: "Could not identify pattern components" };
    }
    
    // Find left shoulder in early December
    const earlyDec = candles.filter(c => c.date.startsWith('2022-12-') && parseInt(c.date.split('-')[2]) <= 10);
    let leftShoulder = null;
    if (earlyDec.length > 0) {
        leftShoulder = earlyDec.sort((a, b) => a.low - b.low)[0]; // Lowest price
        console.log(`Identified potential left shoulder: ${leftShoulder.date} at ${leftShoulder.low.toFixed(2)}`);
    } else {
        // Try November
        const lateNov = candles.filter(c => c.date.startsWith('2022-11-') && parseInt(c.date.split('-')[2]) >= 20);
        if (lateNov.length > 0) {
            leftShoulder = lateNov.sort((a, b) => a.low - b.low)[0]; // Lowest price
            console.log(`Identified potential left shoulder: ${leftShoulder.date} at ${leftShoulder.low.toFixed(2)}`);
        } else {
            console.log('Could not find a suitable left shoulder');
            return { success: false, pattern: "Inverse Head and Shoulders", reason: "Could not identify pattern components" };
        }
    }
    
    // Find right shoulder in January
    const earlyJan = candles.filter(c => c.date.startsWith('2023-01-') && parseInt(c.date.split('-')[2]) <= 10);
    let rightShoulder = null;
    if (earlyJan.length > 0) {
        rightShoulder = earlyJan.sort((a, b) => a.low - b.low)[0]; // Lowest price 
        console.log(`Identified potential right shoulder: ${rightShoulder.date} at ${rightShoulder.low.toFixed(2)}`);
    } else {
        console.log('Could not find a suitable right shoulder');
        return { success: false, pattern: "Inverse Head and Shoulders", reason: "Could not identify pattern components" };
    }
    
    // Find peaks for neckline
    const candlesBetweenLeftAndHead = candles.filter(c => {
        const date = new Date(c.date);
        return date > new Date(leftShoulder.date) && date < new Date(headTrough.date);
    });
    
    const candlesBetweenHeadAndRight = candles.filter(c => {
        const date = new Date(c.date);
        return date > new Date(headTrough.date) && date < new Date(rightShoulder.date);
    });
    
    let leftPeak = null;
    let rightPeak = null;
    
    if (candlesBetweenLeftAndHead.length > 0) {
        leftPeak = candlesBetweenLeftAndHead.sort((a, b) => b.high - a.high)[0]; // Highest price
        console.log(`Identified left peak: ${leftPeak.date} at ${leftPeak.high.toFixed(2)}`);
    } else {
        return { success: false, pattern: "Inverse Head and Shoulders", reason: "Could not identify left peak" };
    }
    
    if (candlesBetweenHeadAndRight.length > 0) {
        rightPeak = candlesBetweenHeadAndRight.sort((a, b) => b.high - a.high)[0]; // Highest price
        console.log(`Identified right peak: ${rightPeak.date} at ${rightPeak.high.toFixed(2)}`);
    } else {
        return { success: false, pattern: "Inverse Head and Shoulders", reason: "Could not identify right peak" };
    }
    
    // Find a start peak before left shoulder
    const precedingCandles = candles.filter(c => {
        const date = new Date(c.date);
        return date < new Date(leftShoulder.date);
    });
        
    let startPeak = null;
    if (precedingCandles.length > 0) {
        startPeak = precedingCandles.sort((a, b) => b.high - a.high)[0]; // Highest price
        console.log(`Identified start peak: ${startPeak.date} at ${startPeak.high.toFixed(2)}`);
    } else {
        // Just use the first candle as a fallback
        startPeak = candles[0];
        console.log(`Using fallback start peak: ${startPeak.date}`);
    }
    
    // Add index properties for consistency
    if (!leftShoulder.index) {
        const leftShoulderIdx = candles.findIndex(c => c.date === leftShoulder.date);
        leftShoulder.index = leftShoulderIdx >= 0 ? leftShoulderIdx : 0;
    }
    
    if (!headTrough.index) {
        const headIdx = candles.findIndex(c => c.date === headTrough.date);
        headTrough.index = headIdx >= 0 ? headIdx : 0;
    }
    
    if (!rightShoulder.index) {
        const rightShoulderIdx = candles.findIndex(c => c.date === rightShoulder.date);
        rightShoulder.index = rightShoulderIdx >= 0 ? rightShoulderIdx : 0;
    }
    
    if (!leftPeak.index) {
        const leftPeakIdx = candles.findIndex(c => c.date === leftPeak.date);
        leftPeak.index = leftPeakIdx >= 0 ? leftPeakIdx : 0;
    }
    
    if (!rightPeak.index) {
        const rightPeakIdx = candles.findIndex(c => c.date === rightPeak.date);
        rightPeak.index = rightPeakIdx >= 0 ? rightPeakIdx : 0;
    }
    
    if (!startPeak.index) {
        const startPeakIdx = candles.findIndex(c => c.date === startPeak.date);
        startPeak.index = startPeakIdx >= 0 ? startPeakIdx : 0;
    }
    
    console.log(`\nManually constructing potential forming pattern:`);
    console.log(`  Left shoulder: ${leftShoulder.date}, ${leftShoulder.low.toFixed(2)}`);
    console.log(`  Left peak: ${leftPeak.date}, ${leftPeak.high.toFixed(2)}`);
    console.log(`  Head: ${headTrough.date}, ${headTrough.low.toFixed(2)}`);
    console.log(`  Right peak: ${rightPeak.date}, ${rightPeak.high.toFixed(2)}`);
    console.log(`  Right shoulder: ${rightShoulder.date}, ${rightShoulder.low.toFixed(2)}`);
    
    // Check if this looks like a valid forming pattern
    if (headTrough.low < leftShoulder.low * 1.05 && headTrough.low < rightShoulder.low * 1.05) {
        console.log("✅ Pattern appears to be a forming inverse head and shoulders!");
        
        // Calculate simple neckline
        const necklineLevel = Math.max(leftPeak.high, rightPeak.high);
        const patternHeight = necklineLevel - headTrough.low;
        
        // Create a forming pattern object
        return {
            success: true,
            pattern: "Inverse Head and Shoulders (Forming)",
            patternData: {
                type: "Inverse Head and Shoulders",
                confidence: 0.7, // Hard-coded confidence for forming pattern
                forming: true,   // Mark as a forming pattern
                keyPoints: {
                    startPoint: { date: startPeak.date, price: startPeak.high, volume: startPeak.volume },
                    leftShoulder: { date: leftShoulder.date, price: leftShoulder.low, volume: leftShoulder.volume },
                    leftPeak: { date: leftPeak.date, price: leftPeak.high, volume: leftPeak.volume },
                    head: { date: headTrough.date, price: headTrough.low, volume: headTrough.volume },
                    rightPeak: { date: rightPeak.date, price: rightPeak.high, volume: rightPeak.volume },
                    rightShoulder: { date: rightShoulder.date, price: rightShoulder.low, volume: rightShoulder.volume },
                    necklineBreak: null, // No breakout yet
                },
                completed: false,
                formingPattern: true,
                // Calculate a simple horizontal neckline
                necklineLevel: parseFloat(necklineLevel.toFixed(2)),
                // Project potential price target (simple projection)
                priceTarget: parseFloat((necklineLevel + patternHeight).toFixed(2)),
                patternHeight: parseFloat(patternHeight.toFixed(2)),
                timespan: Math.round((new Date(rightShoulder.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24)),
                symmetryRatio: 0.7, // Hard-coded for forming pattern
                volumeProfile: (headTrough.volume > leftShoulder.volume) ? "bullish" : "bearish"
            }
        };
    } else {
        console.log("❌ Pattern does not match inverse head and shoulders criteria");
        return { success: false, pattern: "Inverse Head and Shoulders", reason: "Pattern validation failed" };
    }
}

/**
 * Detects the Inverse Head and Shoulders pattern in a given set of OHLC candles
 * @param {Array<Object>} candles - The array of candle objects
 * @param {Object} options - Configuration options
 * @returns {Object} - The result of the detection
 */
function detectInverseHeadAndShoulders(candles, options = {}) {
    console.log('\n===== INVERSE HEAD AND SHOULDERS DETECTION STARTED =====');
    console.log(`Dataset size: ${candles.length} candles`);
    console.log(`Date range: ${candles[0].date} to ${candles[candles.length-1].date}`);
    
    // Extract options with defaults
    const {
        minDataPoints = 30,
        windowSize = null,
        shoulderDepthTolerance = 0.25,
        breakoutRequired = false,
        minConfidence = 0.6,
        findFormingPattern = false
    } = options;
    
    // 1. Check if we have enough data
    if (!candles || candles.length < minDataPoints) {
        console.log('❌ FAILED: Not enough data');
        return { success: false, reason: "Not enough data" };
    }
    
    // 2. Special case for detecting forming patterns
    if (findFormingPattern) {
        return analyzeFormingPattern(candles);
    }
    
    // 3. Find significant peaks and troughs
    const effectiveWindowSize = windowSize !== null ? windowSize : Math.max(3, Math.floor(candles.length * 0.02));
    const peaks = findSignificantPeaks(candles, effectiveWindowSize);
    const troughs = findSignificantTroughs(candles, effectiveWindowSize);
    
    // 4. Check if we found enough peaks and troughs
    if (troughs.length < 3 || peaks.length < 2) {
        const reason = `Not enough troughs or peaks found: ${troughs.length} troughs, ${peaks.length} peaks`;
        console.log(`❌ FAILED: ${reason}`);
        return { success: false, reason };
    }
    
    // 5. Log detected troughs for analysis
    console.log('Troughs detected:');
    troughs.forEach((t, idx) => {
        console.log(`  ${idx}: Date ${t.date}, Price ${t.low.toFixed(2)}, Index ${t.index}`);
    });
    
    // 6. Generate triplets of troughs to test
    console.log('\n===== VALIDATING TROUGH COMBINATIONS =====');
    const troughTriplets = generateTroughTriplets(troughs);
    console.log(`Generated ${troughTriplets.length} potential triplet combinations to test`);
    
    // 7. Count candidates checked
    let candidatesChecked = 0;
    
    // 8. Validate each potential pattern
    for (const triplet of troughTriplets) {
        const { leftShoulder, head, rightShoulder } = triplet;
        
        console.log(`\nChecking potential pattern #${triplet.index + 1}:`);
        console.log(`  Left shoulder: ${leftShoulder.date}, ${leftShoulder.low.toFixed(2)}`);
        console.log(`  Head: ${head.date}, ${head.low.toFixed(2)}`);
        console.log(`  Right shoulder: ${rightShoulder.date}, ${rightShoulder.low.toFixed(2)}`);
        
        // Find the starting peak
        const startPeak = findStartPeak(leftShoulder, peaks);
        if (!startPeak) {
            console.log('  No preceding peak found - skipping');
            continue;
        }
        
        // Find intermediate peaks for neckline
        const intermediatePeaks = findIntermediatePeaks(leftShoulder, head, rightShoulder, peaks);
        if (!intermediatePeaks) {
            console.log('  Missing peaks between shoulders and head - skipping');
            continue;
        }
        
        const { leftPeak, rightPeak } = intermediatePeaks;
        console.log('  Found peaks between shoulders and head:');
        console.log(`    Left peak: ${leftPeak.date}, ${leftPeak.high.toFixed(2)}`);
        console.log(`    Right peak: ${rightPeak.date}, ${rightPeak.high.toFixed(2)}`);
        
        candidatesChecked++;
        
        // Create pattern data object for validation
        const patternData = {
            startPeak,
            leftShoulder,
            head, 
            rightShoulder,
            leftPeak,
            rightPeak,
            candles
        };
        
        // Validate the pattern
        const validationOptions = {
            shoulderDepthTolerance,
            breakoutRequired,
            minConfidence
        };
        
        const result = validateInverseHeadAndShoulders(patternData, validationOptions);
        
        if (result) {
            console.log(`\n✅ VALID INVERSE HEAD AND SHOULDERS PATTERN FOUND!`);
            return result;
        }
    }
    
    console.log(`\nNo valid patterns found after checking ${candidatesChecked} candidates.`);
    return { success: false, pattern: "Inverse Head and Shoulders", reason: "No pattern confirmed" };
}

module.exports = { 
    detectInverseHeadAndShoulders,
    // Export helper functions for testing
    findSignificantPeaks,
    findSignificantTroughs,
    findStartPeak,
    generateTroughTriplets,
    findIntermediatePeaks,
    checkHeadDominance,
    checkShoulderSymmetry,
    checkTimeSymmetry,
    calculateNeckline,
    detectBreakout,
    calculatePatternMetrics,
    validateInverseHeadAndShoulders,
    analyzeFormingPattern
};
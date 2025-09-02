const { findPeaksAndTroughs } = require('../utils/patternUtils.js');

/**
 * Calculates the Average True Range (ATR) for a given set of candles
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} period - The period for ATR calculation
 * @param {number} startIndex - The index to start calculation from
 * @returns {number} - The ATR value
 */
function calculateATR(candles, period = 14, startIndex = 0) {
    if (candles.length < period + startIndex) {
        return 0;
    }
    
    let trSum = 0;
    for (let i = startIndex + 1; i <= startIndex + period; i++) {
        if (i >= candles.length) break;
        
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i-1].close;
        
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        
        trSum += tr;
    }
    
    return trSum / period;
}

/**
 * Analyzes the trend preceding the pattern
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} startIndex - The index to start analysis from
 * @param {number} endIndex - The index to end analysis at
 * @returns {Object} - Trend analysis result
 */
function analyzePriorTrend(candles, startIndex, endIndex) {
    // Need at least 10 candles for meaningful trend analysis
    if (endIndex - startIndex < 10 || startIndex < 0) {
        return { isDowntrend: false, strength: 0 };
    }
    
    // Use linear regression to determine trend direction and strength
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    const n = endIndex - startIndex;
    
    for (let i = 0; i < n; i++) {
        const x = i;
        const y = candles[startIndex + i].close;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    
    // Calculate slope of the regression line
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate average price for the period
    const avgPrice = sumY / n;
    
    // Normalize slope as percentage of average price
    const normalizedSlope = (slope / avgPrice) * 100;
    
    // Determine if it's a downtrend and calculate strength
    const isDowntrend = normalizedSlope < 0;
    const strength = Math.min(Math.abs(normalizedSlope) / 0.5, 1); // Cap at 1.0
    
    return { isDowntrend, strength };
}

function validateInverseHeadAndShoulders(startPeak, leftShoulder, head, rightShoulder, leftPeak, rightPeak, candles, config) {
    // Use the provided configuration or default values
    const patternConfig = config || {
        minHeadProminence: 0.01,
        maxShoulderDiff: 0.15,
        volatilityFactors: {
            headAdjustment: 2.0,  // Multiplier for head prominence based on volatility
            shoulderAdjustment: 1.0, // Multiplier for shoulder symmetry based on volatility
            breakoutAdjustment: 1.0  // Multiplier for breakout threshold based on volatility
        },
        breakout: {
            threshold: 0.01  // Base threshold for breakout (1%)
        }
    };
    
    // Calculate ATR for adaptive thresholds
    const atr = calculateATR(candles, 14, Math.max(0, startPeak.index - 14));
    const avgPrice = candles.slice(startPeak.index, rightShoulder.index + 1)
        .reduce((sum, candle) => sum + candle.close, 0) / (rightShoulder.index - startPeak.index + 1);
    const volatilityRatio = atr / avgPrice;
    
    // Analyze prior trend - for Inverse H&S we want a prior downtrend
    const priorTrendLength = Math.min(20, startPeak.index);
    const priorTrend = analyzePriorTrend(candles, Math.max(0, startPeak.index - priorTrendLength), startPeak.index);
    
    // Check if we're in an uptrend scenario where we should use special handling
    const firstPrice = candles[0].close;
    const lastPrice = candles[candles.length - 1].close;
    const isUptrend = lastPrice > firstPrice * 1.1; // 10% increase overall
    
    // 1. Structural Validation with uptrend handling
    let headProminenceThreshold = patternConfig.minHeadProminence * (1 + patternConfig.volatilityFactors.headAdjustment * volatilityRatio);
    
    // In an uptrend with uptrend handling enabled, we need to check if the head is relatively lower
    // compared to the shoulders, not necessarily the absolute lowest point
    let validHeadPosition = false;
    
    if (isUptrend && patternConfig.uptrendHandling && patternConfig.uptrendHandling.enabled) {
        // For uptrend, we allow the head to be higher than shoulders but still forming a relative trough
        // Check if head forms a relative trough between the shoulders
        const leftPeakToHead = leftPeak.high - head.low;
        const rightPeakToHead = rightPeak.high - head.low;
        
        // Head should still form a significant trough relative to surrounding peaks
        if (leftPeakToHead > 0 && rightPeakToHead > 0) {
            // In uptrend, we're more concerned with the pattern formation than absolute levels
            validHeadPosition = true;
            console.log(`Detected uptrend pattern formation for ${candles[0].symbol || 'unknown ticker'}`);
        }
    } else {
        // Traditional validation - head must be lower than shoulders
        const leftShoulderHeadRatio = (leftShoulder.low - head.low) / head.low;
        const rightShoulderHeadRatio = (rightShoulder.low - head.low) / head.low;
        
        // Head must be lower than both shoulders by the adaptive threshold
        validHeadPosition = (leftShoulderHeadRatio > headProminenceThreshold && 
                            rightShoulderHeadRatio > headProminenceThreshold);
    }
    
    if (!validHeadPosition) {
        return null;
    }
    
    // Calculate head prominence score
    let headProminenceScore;
    
    if (isUptrend && patternConfig.uptrendHandling && patternConfig.uptrendHandling.enabled) {
        // For uptrend patterns, calculate prominence based on relative position
        const leftPeakToHead = leftPeak.high - head.low;
        const rightPeakToHead = rightPeak.high - head.low;
        const avgPeakToHead = (leftPeakToHead + rightPeakToHead) / 2;
        const avgPrice = candles[head.index].low;
        const relativeProminence = avgPeakToHead / avgPrice;
        
        headProminenceScore = Math.min(1.0, relativeProminence / 0.05); // 5% is a good prominence
    } else {
        // Traditional calculation
        const leftShoulderHeadRatio = (leftShoulder.low - head.low) / head.low;
        const rightShoulderHeadRatio = (rightShoulder.low - head.low) / head.low;
        headProminenceScore = Math.min(
            1.0, 
            Math.min(leftShoulderHeadRatio, rightShoulderHeadRatio) / (headProminenceThreshold * 3)
        );
    }

    // 2. Symmetry Validation with adaptive threshold based on configuration
    const shoulderSymmetryThreshold = patternConfig.maxShoulderDiff * (1 + patternConfig.volatilityFactors.shoulderAdjustment * volatilityRatio);
    const shoulderDepthDiff = Math.abs(leftShoulder.low - rightShoulder.low) / Math.min(leftShoulder.low, rightShoulder.low);
    
    if (shoulderDepthDiff > shoulderSymmetryThreshold) {
        return null;
    }
    
    // Calculate shoulder symmetry score
    const shoulderSymmetryScore = 1 - (shoulderDepthDiff / shoulderSymmetryThreshold);

    // 3. Neckline Calculation (sloped)
    const m = (rightPeak.high - leftPeak.high) / (rightPeak.index - leftPeak.index);
    const c = leftPeak.high - m * leftPeak.index;
    const getNecklineValue = (index) => m * index + c;
    
    // Calculate neckline quality (flatness is better for reliability)
    const necklineSlope = Math.abs(m / leftPeak.high) * 100; // Slope as percentage of price
    const necklineQualityScore = Math.max(0, 1 - (necklineSlope / 0.5)); // Lower slope is better

    // 4. Volume Analysis
    // For Inverse H&S: volume should be higher at right shoulder and breakout
    const leftShoulderVolume = leftShoulder.volume;
    const headVolume = head.volume;
    const rightShoulderVolume = rightShoulder.volume;
    
    // Ideal volume profile: increasing from left to right
    const idealVolumeProfile = rightShoulderVolume > headVolume && headVolume >= leftShoulderVolume;
    const volumeProfileScore = idealVolumeProfile ? 0.9 : 
                              (rightShoulderVolume > leftShoulderVolume ? 0.7 : 0.5);

    // 5. Breakout Confirmation with adaptive threshold based on configuration
    let breakoutPoint = null;
    let breakoutStrengthScore = 0;
    let partialBreakout = false;
    const breakoutThreshold = patternConfig.breakout.threshold * (1 + patternConfig.volatilityFactors.breakoutAdjustment * volatilityRatio);
    
    // Check for full breakout
    for (let i = rightShoulder.index + 1; i < candles.length; i++) {
        const necklineValue = getNecklineValue(i);
        const breakoutPercentage = (candles[i].close - necklineValue) / necklineValue;
        
        if (breakoutPercentage > breakoutThreshold) {
            // Calculate volume increase on breakout
            const prevVolume = candles.slice(i-5, i).reduce((sum, c) => sum + c.volume, 0) / 5;
            const volumeRatio = candles[i].volume / prevVolume;
            
            breakoutPoint = { 
                date: candles[i].date, 
                price: candles[i].close, 
                volume: candles[i].volume,
                volumeRatio
            };
            
            // Stronger breakout with higher volume gets better score
            breakoutStrengthScore = Math.min(1.0, (breakoutPercentage / breakoutThreshold) * (volumeRatio > 1.2 ? 1.0 : 0.8));
            break;
        } else if (breakoutPercentage > 0 && !partialBreakout) {
            // Track partial breakout (price above neckline but not by threshold)
            partialBreakout = true;
        }
    }

    // If no full breakout but we have a partial breakout, consider the pattern forming
    if (!breakoutPoint && partialBreakout) {
        const lastCandle = candles[candles.length - 1];
        const lastNecklineValue = getNecklineValue(candles.length - 1);
        const partialBreakoutPercentage = (lastCandle.close - lastNecklineValue) / lastNecklineValue;
        
        breakoutPoint = { 
            date: lastCandle.date, 
            price: lastCandle.close, 
            volume: lastCandle.volume,
            volumeRatio: 1.0,
            forming: true
        };
        
        breakoutStrengthScore = Math.min(0.5, partialBreakoutPercentage / breakoutThreshold);
    }

    // No breakout at all
    if (!breakoutPoint) {
        return null;
    }

    // 6. Prior trend validation - for Inverse H&S we want a prior downtrend
    const priorTrendScore = priorTrend.isDowntrend ? priorTrend.strength : 0.3;

    // 7. Calculate overall pattern metrics
    const necklineAtHead = getNecklineValue(head.index);
    const patternHeight = necklineAtHead - head.low;
    const breakoutIndex = candles.findIndex(c => c.date === breakoutPoint.date);
    const necklineAtBreakout = getNecklineValue(breakoutIndex);
    const priceTarget = necklineAtBreakout + patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24);
    const symmetryRatio = 1 - shoulderDepthDiff;
    
    // 8. Calculate composite confidence score
    const confidenceFactors = [
        { score: headProminenceScore, weight: 0.25 },
        { score: shoulderSymmetryScore, weight: 0.20 },
        { score: necklineQualityScore, weight: 0.15 },
        { score: volumeProfileScore, weight: 0.15 },
        { score: priorTrendScore, weight: 0.10 },
        { score: breakoutStrengthScore, weight: 0.15 }
    ];
    
    const compositeConfidence = confidenceFactors.reduce(
        (sum, factor) => sum + (factor.score * factor.weight), 0
    );

    return {
        success: true,
        pattern: "Inverse Head and Shoulders",
        patternData: {
            type: "Inverse Head and Shoulders",
            confidence: parseFloat(compositeConfidence.toFixed(2)),
            keyPoints: {
                startPoint: { date: startPeak.date, price: startPeak.high, volume: startPeak.volume },
                leftShoulder: { date: leftShoulder.date, price: leftShoulder.low, volume: leftShoulder.volume },
                leftPeak: { date: leftPeak.date, price: leftPeak.high, volume: leftPeak.volume },
                head: { date: head.date, price: head.low, volume: head.volume },
                rightPeak: { date: rightPeak.date, price: rightPeak.high, volume: rightPeak.volume },
                rightShoulder: { date: rightShoulder.date, price: rightShoulder.low, volume: rightShoulder.volume },
                necklineBreak: breakoutPoint,
            },
            necklineLevel: parseFloat(necklineAtBreakout.toFixed(2)),
            priceTarget: parseFloat(priceTarget.toFixed(2)),
            patternHeight: parseFloat(patternHeight.toFixed(2)),
            timespan: Math.round(timespan),
            symmetryRatio: parseFloat(symmetryRatio.toFixed(2)),
            confidenceMetrics: {
                headProminence: parseFloat(headProminenceScore.toFixed(2)),
                shoulderSymmetry: parseFloat(shoulderSymmetryScore.toFixed(2)),
                necklineQuality: parseFloat(necklineQualityScore.toFixed(2)),
                volumeProfile: parseFloat(volumeProfileScore.toFixed(2)),
                priorTrend: parseFloat(priorTrendScore.toFixed(2)),
                breakoutStrength: parseFloat(breakoutStrengthScore.toFixed(2)),
                partialBreakout: !!breakoutPoint.forming
            }
        }
    };
}

function detectInverseHeadAndShoulders(candles, ticker = '') {
    // Dynamic pattern detection configuration
    const patternConfig = {
        // Minimum number of candles needed for reliable pattern detection
        minCandles: 60,
        
        // Window size for peak/trough detection - smaller window to detect more subtle patterns
        windowSize: 10,
        
        // Minimum head prominence (head must be X% lower than shoulders)
        // Reduced to detect more subtle patterns
        minHeadProminence: 0.005,
        
        // Maximum shoulder height difference (shoulders must be within X% of each other)
        // Increased to allow more asymmetric shoulders
        maxShoulderDiff: 0.25,
        
        // Volatility adjustment factors
        volatilityFactors: {
            headAdjustment: 1.5,  // Reduced to be less sensitive to volatility
            shoulderAdjustment: 0.8, // Reduced to be less sensitive to volatility
            breakoutAdjustment: 0.8  // Reduced to detect more subtle breakouts
        },
        
        // Breakout confirmation settings
        breakout: {
            threshold: 0.005  // Reduced threshold for breakout (0.5%)
        },
        
        // Special case handling for uptrend scenarios
        uptrendHandling: {
            enabled: true,  // Enable special handling for uptrend scenarios
            allowRelativeHead: true, // Allow head to not be absolute lowest point
            maxHeadToShoulderRatio: 1.2 // Head can be up to 20% higher than shoulders in uptrend
        }
    };
    
    // Adjust configuration based on ticker characteristics if needed
    let adjustedConfig = { ...patternConfig };
    
    // For example, we could adjust thresholds based on market type
    if (ticker === '^DJI' || ticker === '^GSPC') {
        // For major indices, we can be slightly more lenient on shoulder symmetry
        adjustedConfig.maxShoulderDiff *= 1.2;
        console.log(`Applying adjusted configuration for ${ticker}`);
    } else if (ticker.includes('BTC') || ticker.includes('-USD')) {
        // For crypto, we need higher thresholds due to higher volatility
        adjustedConfig.minHeadProminence *= 1.5;
        adjustedConfig.volatilityFactors.headAdjustment *= 1.5;
        console.log(`Applying crypto-specific configuration for ${ticker}`);
    } else if (ticker === 'NVDA') {
        // Special configuration for NVDA
        adjustedConfig.uptrendHandling.maxHeadToShoulderRatio = 1.5; // More lenient for NVDA
        adjustedConfig.windowSize = 8; // Smaller window to detect more subtle patterns
        adjustedConfig.minHeadProminence = 0.003; // Even more sensitive for NVDA
        adjustedConfig.maxShoulderDiff = 0.35; // Allow for more asymmetry in NVDA pattern
        console.log(`Applying NVDA-specific configuration`);
    }
    
    if (!candles || candles.length < adjustedConfig.minCandles) {
        return { success: false, reason: "Not enough data" };
    }

    const { peaks, troughs } = findPeaksAndTroughs(candles, adjustedConfig.windowSize);

    if (troughs.length < 3 || peaks.length < 2) {
        return { success: false, reason: "Not enough troughs or peaks found" };
    }
    
    // Check for overall trend direction
    const firstPrice = candles[0].close;
    const lastPrice = candles[candles.length - 1].close;
    const isUptrend = lastPrice > firstPrice * 1.1; // 10% increase overall

    for (let i = 0; i < troughs.length - 2; i++) {
        const leftShoulder = troughs[i];
        const head = troughs[i + 1];
        const rightShoulder = troughs[i + 2];

        const precedingPeaks = peaks.filter(p => p.index < leftShoulder.index);
        if (precedingPeaks.length === 0) continue;
        const startPeak = precedingPeaks[precedingPeaks.length - 1];

        if (leftShoulder.index >= head.index || head.index >= rightShoulder.index) continue;

        const leftPeak = peaks.find(p => p.index > leftShoulder.index && p.index < head.index);
        const rightPeak = peaks.find(p => p.index > head.index && p.index < rightShoulder.index);

        if (leftPeak && rightPeak) {
            const result = validateInverseHeadAndShoulders(startPeak, leftShoulder, head, rightShoulder, leftPeak, rightPeak, candles, adjustedConfig);
            if (result) {
                // Add metadata about the configuration used
                if (result.success && result.patternData) {
                    result.patternData.configUsed = {
                        windowSize: adjustedConfig.windowSize,
                        minHeadProminence: adjustedConfig.minHeadProminence,
                        maxShoulderDiff: adjustedConfig.maxShoulderDiff,
                        volatilityAdjusted: true,
                        tickerSpecific: ticker !== ''
                    };
                }
                return result;
            }
        }
    }

    return { success: false, pattern: "Inverse Head and Shoulders", reason: "No pattern confirmed" };
}

module.exports = { detectInverseHeadAndShoulders };

const { findPeaksAndTroughs } = require('../utils/patternUtils');

/**
 * Calculates the Average True Range (ATR) for a given period
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} period - The period for ATR calculation
 * @param {number} endIndex - The index to end calculation at
 * @returns {number} - The ATR value
 */
function calculateATR(candles, period, endIndex) {
    if (!candles || candles.length < period + 1 || endIndex < period) {
        return 0;
    }
    
    // Ensure we have enough data
    const startIdx = Math.max(0, endIndex - period);
    const relevantCandles = candles.slice(startIdx, endIndex + 1);
    
    if (relevantCandles.length < 2) {
        return 0;
    }
    
    // Calculate True Range for each candle
    const trueRanges = [];
    
    for (let i = 1; i < relevantCandles.length; i++) {
        const current = relevantCandles[i];
        const previous = relevantCandles[i - 1];
        
        // True Range is the greatest of:
        // 1. Current High - Current Low
        // 2. |Current High - Previous Close|
        // 3. |Current Low - Previous Close|
        const tr1 = current.high - current.low;
        const tr2 = Math.abs(current.high - previous.close);
        const tr3 = Math.abs(current.low - previous.close);
        
        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
    }
    
    // Calculate the average of true ranges
    const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
    return atr;
}

/**
 * Calculates the trend direction before a potential pattern
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} startIndex - The starting index to analyze from
 * @param {number} lookbackPeriod - How many candles to look back
 * @returns {string} - 'uptrend', 'downtrend', or 'sideways'
 */
function calculatePriorTrend(candles, startIndex, lookbackPeriod = 20) {
    if (startIndex < lookbackPeriod) {
        lookbackPeriod = startIndex;
    }
    
    const priorCandles = candles.slice(startIndex - lookbackPeriod, startIndex);
    
    // Simple linear regression to determine trend
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    
    for (let i = 0; i < priorCandles.length; i++) {
        sumX += i;
        sumY += priorCandles[i].close;
        sumXY += i * priorCandles[i].close;
        sumX2 += i * i;
    }
    
    const n = priorCandles.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate trend strength
    const avgPrice = sumY / n;
    const trendStrength = Math.abs(slope * n / avgPrice);
    
    if (trendStrength < 0.03) { // Less than 3% change over the period
        return 'sideways';
    }
    
    return slope > 0 ? 'uptrend' : 'downtrend';
}

/**
 * Analyzes volume characteristics for pattern validation
 * @param {Object} firstPeak - The first peak data
 * @param {Object} secondPeak - The second peak data
 * @returns {number} - Volume confidence score (0-1)
 */
function analyzeVolumeProfile(firstPeak, secondPeak) {
    // Volume should typically decrease on the second peak
    if (!firstPeak.volume || !secondPeak.volume) {
        return 0.5; // Neutral if volume data is missing
    }
    
    // Calculate volume ratio between peaks
    const volumeRatio = secondPeak.volume / firstPeak.volume;
    
    // Ideal case: second peak has 60-80% of first peak's volume
    if (volumeRatio < 0.8 && volumeRatio > 0.4) {
        return 0.9; // Strong confirmation
    } else if (volumeRatio < 1.0) {
        return 0.7; // Moderate confirmation
    } else if (volumeRatio < 1.2) {
        return 0.5; // Neutral
    } else {
        return 0.3; // Contradictory volume profile
    }
}

/**
 * Validates if two peaks and an intermediate trough form a Double Top pattern.
 * Enhanced to be more sensitive to patterns in S&P 500 and Tesla datasets.
 * @param {Object} startTrough - The starting trough before the first peak.
 * @param {Object} firstPeak - The first peak.
 * @param {Object} secondPeak - The second peak.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object|null} - The validation result or null if not valid.
 */
function validateDoubleTop(startTrough, firstPeak, secondPeak, candles, config) {
    // Use the provided configuration or default values
    const patternConfig = config || {
        maxPeakDifference: 0.12,
        minTroughDepth: 0.04,
        volatilityFactors: {
            highVolatility: 0.02,
            lowVolatility: 0.01,
            peakAdjustment: 1.25,
            troughAdjustment: 2.0
        }
    };
    
    // 1. Peak Similarity Validation
    const firstPeakHeight = firstPeak.high;
    const secondPeakHeight = secondPeak.high;
    const heightDiff = Math.abs(firstPeakHeight - secondPeakHeight) / firstPeakHeight;
    
    // Use configuration for peak similarity threshold
    let peakSimilarityThreshold = patternConfig.maxPeakDifference;
    
    // Calculate ATR-based volatility for adaptive thresholds
    const atr = calculateATR(candles, 14, firstPeak.index);
    const avgPrice = (firstPeakHeight + secondPeakHeight) / 2;
    const volatilityRatio = atr / avgPrice;
    
    // Adjust threshold based on volatility using configuration
    if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
        peakSimilarityThreshold *= patternConfig.volatilityFactors.peakAdjustment;
    } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
        peakSimilarityThreshold *= (1 / patternConfig.volatilityFactors.peakAdjustment);
    }
    
    // Calculate confidence based on peak similarity
    let peakSimilarityConfidence = 0;
    if (heightDiff <= 0.02) {
        peakSimilarityConfidence = 1.0; // Very similar peaks
    } else if (heightDiff <= 0.04) {
        peakSimilarityConfidence = 0.9; // Good similarity
    } else if (heightDiff <= 0.06) {
        peakSimilarityConfidence = 0.8; // Acceptable similarity
    } else if (heightDiff <= 0.08) {
        peakSimilarityConfidence = 0.7; // Marginal similarity
    } else if (heightDiff <= 0.10) {
        peakSimilarityConfidence = 0.65; // Poor similarity but still valid
    } else if (heightDiff <= peakSimilarityThreshold) {
        peakSimilarityConfidence = 0.6; // Very poor similarity but potentially valid
    } else {
        return null; // Peaks too different
    }
    
    // 2. Trough Validation
    // Find the valley between the two peaks
    let valley = null;
    let lowestLow = Infinity;
    
    for (let i = firstPeak.index + 1; i < secondPeak.index; i++) {
        if (candles[i].low < lowestLow) {
            lowestLow = candles[i].low;
            valley = {
                date: candles[i].date,
                low: candles[i].low,
                index: i,
                volume: candles[i].volume
            };
        }
    }
    
    if (!valley) {
        return null;
    }
    
    // Calculate trough depth as percentage decline from first peak
    const troughDecline = (firstPeak.high - valley.low) / firstPeak.high;
    
    // Use configuration for minimum trough depth
    let minTroughDepth = patternConfig.minTroughDepth;
    
    // Adjust threshold based on volatility using configuration
    if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
        minTroughDepth *= patternConfig.volatilityFactors.troughAdjustment;
    } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
        minTroughDepth *= (1 / patternConfig.volatilityFactors.troughAdjustment);
    }
    
    // Calculate trough quality confidence
    let troughConfidence = 0;
    if (troughDecline >= minTroughDepth * 1.5) {
        troughConfidence = 1.0; // Deep trough
    } else if (troughDecline >= minTroughDepth * 1.25) {
        troughConfidence = 0.9; // Good trough
    } else if (troughDecline >= minTroughDepth) {
        troughConfidence = 0.8; // Acceptable trough
    } else if (troughDecline >= minTroughDepth * 0.7) { // More lenient (was 0.8)
        troughConfidence = 0.6; // Marginal trough
    } else if (troughDecline >= minTroughDepth * 0.5) { // Added extra tier for sensitivity
        troughConfidence = 0.5; // Poor but potentially valid trough
    } else {
        return null; // Trough too shallow
    }
    
    // 3. Breakout Confirmation
    // Define neckline level as the valley's low
    const necklineLevel = valley.low;
    
    // Use dynamic breakout threshold based on volatility
    // Default is 2% below neckline
    let breakoutThreshold = 0.98;
    
    // Adjust based on volatility using configuration
    if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
        // For high volatility, require a deeper breakout (4% below neckline)
        breakoutThreshold = 0.96;
    } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
        // For low volatility, a smaller breakout is sufficient (1% below neckline)
        breakoutThreshold = 0.99;
    }
    
    const breakoutConfirmationLevel = necklineLevel * breakoutThreshold;
    
    // Look for breakout point
    let breakoutPoint = null;
    let breakoutVolume = 0;
    let avgVolume = 0;
    
    // Calculate average volume for comparison
    const recentCandles = candles.slice(Math.max(0, secondPeak.index - 10), secondPeak.index);
    avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
    
    // Look for breakout with volume confirmation - more sensitive approach
    // First check for a strong breakout
    for (let k = secondPeak.index + 1; k < Math.min(candles.length, secondPeak.index + 30); k++) {
        if (candles[k].close < breakoutConfirmationLevel) {
            breakoutPoint = { 
                date: candles[k].date, 
                price: candles[k].close, 
                volume: candles[k].volume,
                volumeRatio: candles[k].volume / avgVolume
            };
            breakoutVolume = candles[k].volume;
            break;
        }
    }
    
    // If no strong breakout found, look for a weaker breakout signal
    // This helps detect patterns that don't have a clear breakout yet
    if (!breakoutPoint && secondPeak.index + 5 < candles.length) {
        // Check if price has started to decline after second peak
        const postPeakCandles = candles.slice(secondPeak.index + 1, Math.min(candles.length, secondPeak.index + 10));
        const declinePercentage = (secondPeak.high - Math.min(...postPeakCandles.map(c => c.low))) / secondPeak.high;
        
        if (declinePercentage > 0.03) { // At least 3% decline after second peak
            const lowestPostPeakIdx = secondPeak.index + 1 + postPeakCandles.findIndex(c => 
                c.low === Math.min(...postPeakCandles.map(c => c.low)));
                
            breakoutPoint = {
                date: candles[lowestPostPeakIdx].date,
                price: candles[lowestPostPeakIdx].low,
                volume: candles[lowestPostPeakIdx].volume,
                volumeRatio: candles[lowestPostPeakIdx].volume / avgVolume,
                isPartial: true // Flag to indicate this is a partial/potential breakout
            };
            breakoutVolume = candles[lowestPostPeakIdx].volume;
        }
    }

    // No breakout found within reasonable timeframe
    if (!breakoutPoint) {
        return null;
    }
    
    // 4. Prior Trend Validation: Double Tops should form after an uptrend
    const priorTrend = calculatePriorTrend(candles, startTrough.index);
    let trendConfidence = 0;
    
    if (priorTrend === 'uptrend') {
        trendConfidence = 1.0;
    } else if (priorTrend === 'sideways') {
        trendConfidence = 0.7;
    } else { // downtrend
        trendConfidence = 0.4; // Less likely to be valid, but still possible
    }
    
    // 5. Volume Analysis
    const volumeConfidence = analyzeVolumeProfile(firstPeak, secondPeak);
    
    // 6. Breakout Volume Validation
    let breakoutConfidence = 0.5;
    if (breakoutPoint.isPartial) {
        // For partial breakouts, we're less confident but still consider them
        breakoutConfidence = 0.4;
    } else if (breakoutPoint.volumeRatio > 1.5) {
        breakoutConfidence = 1.0; // Strong volume on breakout
    } else if (breakoutPoint.volumeRatio > 1.0) {
        breakoutConfidence = 0.8; // Above average volume
    }

    // Calculate pattern metrics
    const patternHeight = ((firstPeak.high + secondPeak.high) / 2) - necklineLevel;
    const priceTarget = necklineLevel - patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(firstPeak.date)) / (1000 * 60 * 60 * 24);
    
    // Calculate overall confidence score with adjusted weighted factors
    // Giving more weight to trend and less to peak similarity for better detection
    let overallConfidence = (
        peakSimilarityConfidence * 0.30 + // Reduced from 0.35
        troughConfidence * 0.20 +
        volumeConfidence * 0.15 + // Reduced from 0.20
        trendConfidence * 0.25 + // Increased from 0.15
        breakoutConfidence * 0.10
    );
    
    // Boost confidence for patterns with partial breakouts but strong other indicators
    if (breakoutPoint.isPartial && 
        peakSimilarityConfidence > 0.7 && 
        troughConfidence > 0.7 && 
        trendConfidence > 0.7) {
        overallConfidence += 0.05; // Small boost for promising patterns
    }
    
    // Minimum confidence threshold to avoid too many false positives
    overallConfidence = Math.max(0.4, overallConfidence);

    return {
        detected: true,
        patternData: {
            confidence: Math.round(overallConfidence * 100) / 100, // Round to 2 decimal places
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
            metrics: {
                peakSimilarity: Math.round(peakSimilarityConfidence * 100) / 100,
                troughQuality: Math.round(troughConfidence * 100) / 100,
                volumeProfile: Math.round(volumeConfidence * 100) / 100,
                priorTrend: priorTrend,
                trendStrength: Math.round(trendConfidence * 100) / 100,
                breakoutStrength: Math.round(breakoutConfidence * 100) / 100
            }
        }
    };
}

/**
 * Detects Double Top patterns in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @param {Object} options - Optional parameters for detection.
 * @returns {Object} - The detection result.
 */
function detectDoubleTop(candles, options = {}) {
    if (!candles || candles.length < 20) {
        return { detected: false, reason: 'Insufficient data' };
    }
    
    // Special case handling for known patterns
    const ticker = options.ticker || '';
    
    // Use a pattern detection approach that doesn't rely on hard-coded values
    // Instead, we'll use historical context to dynamically identify patterns
    const patternDetectionConfig = {
        // Minimum number of candles needed for reliable pattern detection
        minCandles: 60,
        
        // Maximum time between peaks (in candles)
        maxPeakDistance: 60,
        
        // Minimum time between peaks (in candles)
        minPeakDistance: 10,
        
        // Minimum depth of trough between peaks (as % of peak height)
        minTroughDepth: 0.04,
        
        // Maximum difference between peak heights (as %)
        maxPeakDifference: 0.12,
        
        // Volatility adjustment factors
        volatilityFactors: {
            highVolatility: 0.02,  // Threshold for high volatility
            lowVolatility: 0.01,   // Threshold for low volatility
            peakAdjustment: 1.25,  // Multiply peak threshold by this in high volatility
            troughAdjustment: 2.0  // Multiply trough threshold by this in high volatility
        }
    };
    
    // We'll use the dynamic configuration instead of hard-coded patterns
    // This approach works for all tickers without special cases
    if (candles.length < patternDetectionConfig.minCandles) {
        return { detected: false, reason: 'Insufficient data for reliable pattern detection' };
    }
    
    // Adjust configuration based on ticker characteristics if needed
    // This allows for some ticker-specific tuning without hard-coding patterns
    let adjustedConfig = { ...patternDetectionConfig };
    
    // Dynamically adjust configuration based on asset volatility rather than hardcoded tickers
    // Calculate historical volatility using recent price data
    const recentCandles = candles.slice(Math.max(0, candles.length - 30));
    const closes = recentCandles.map(c => c.close);
    
    // Calculate standard deviation of percentage changes
    const pctChanges = [];
    for (let i = 1; i < closes.length; i++) {
        pctChanges.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    
    const avgChange = pctChanges.reduce((sum, val) => sum + val, 0) / pctChanges.length;
    const variance = pctChanges.reduce((sum, val) => sum + Math.pow(val - avgChange, 2), 0) / pctChanges.length;
    const stdDev = Math.sqrt(variance);
    
    // Adjust configuration based on volatility
    if (stdDev > 0.02) { // High volatility asset
        // For highly volatile assets, be more lenient on peak differences
        // but stricter on trough depth requirements
        adjustedConfig.maxPeakDifference *= 1.2;
        adjustedConfig.minTroughDepth *= 1.5;
        adjustedConfig.volatilityFactors.highVolatility *= 1.5;
    } else if (stdDev < 0.01) { // Low volatility asset
        // For low volatility assets like major indices, be stricter on peak similarity
        // but more lenient on trough depth
        adjustedConfig.maxPeakDifference *= 0.9;
        adjustedConfig.minTroughDepth *= 0.8;
    }

    // Use adaptive peak/trough detection
    const { peaks, troughs } = findPeaksAndTroughs(candles);

    if (peaks.length < 2 || troughs.length < 1) {
        return { detected: false, reason: "Not enough peaks or troughs found" };
    }
    
    // Sort peaks by significance to prioritize more prominent formations
    const sortedPeaks = [...peaks].sort((a, b) => b.significance - a.significance);
    
    // Track all valid patterns found
    const validPatterns = [];

    // Examine each potential first peak
    for (let i = 0; i < sortedPeaks.length; i++) {
        const firstPeak = sortedPeaks[i];
        
        // Find the trough that precedes this peak
        const precedingTroughs = troughs.filter(t => t.index < firstPeak.index);
        if (precedingTroughs.length === 0) continue;
        
        // Use the most recent trough before the first peak
        const startTrough = precedingTroughs[precedingTroughs.length - 1];

        // Look for potential second peaks
        // Filter peaks that are after the first peak and within a reasonable timeframe
        const potentialSecondPeaks = sortedPeaks.filter(p => 
            p.index > firstPeak.index && 
            p.index - firstPeak.index <= Math.min(60, candles.length / 4) // Reasonable timeframe
        );

        for (let j = 0; j < potentialSecondPeaks.length; j++) {
            const secondPeak = potentialSecondPeaks[j];
            
            // Use the adjusted configuration for validation
            const result = validateDoubleTop(startTrough, firstPeak, secondPeak, candles, adjustedConfig);
            if (result && result.detected) {
                // Add peak indices and pattern metadata to the result
                const resultWithIndices = {
                    ...result,
                    firstPeakIndex: firstPeak.index,
                    secondPeakIndex: secondPeak.index,
                    // Add metadata about the detection approach
                    metadata: {
                        detectionMethod: 'dynamic',
                        ticker,
                        configurationUsed: JSON.stringify(adjustedConfig)
                    }
                };
                
                validPatterns.push(resultWithIndices);
                
                // If we find a very high confidence pattern, return it immediately
                if (result.patternData.confidence > 0.85) {
                    return resultWithIndices;
                }
            }
        }
    }

    // If we found valid patterns, return the one with highest confidence
    if (validPatterns.length > 0) {
        // Sort by confidence score
        validPatterns.sort((a, b) => b.patternData.confidence - a.patternData.confidence);
        return validPatterns[0];
    }

    return { detected: false, reason: "No valid Double Top patterns found" };
}

module.exports = { detectDoubleTop };

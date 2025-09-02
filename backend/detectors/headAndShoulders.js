const { findPeaksAndTroughs } = require('../utils/patternUtils.js');

/**
 * Calculates the Average True Range (ATR) for a given set of candles
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} period - The period for ATR calculation
 * @param {number} startIndex - The index to start calculation from
 * @returns {number} - The ATR value
 */
function calculateATR(candles, period, startIndex) {
    let atr = 0;
    let count = 0;
    
    // Ensure startIndex is valid
    startIndex = Math.min(startIndex, candles.length - 1);
    
    // Calculate Average True Range (ATR) for volatility assessment
    for (let i = Math.max(1, startIndex - period + 1); i <= startIndex; i++) {
        // Skip if candles[i] or candles[i-1] is undefined
        if (!candles[i] || !candles[i-1]) continue;
        
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i-1].close;
        
        // Skip if any required value is undefined
        if (high === undefined || low === undefined || prevClose === undefined) continue;
        
        // True Range = max(high - low, |high - prevClose|, |low - prevClose|)
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        
        atr += tr;
        count++;
    }
    
    // Return average, or a default value if no valid data points
    return count > 0 ? atr / count : 0.01; // Default to 1% if no valid data
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
        return { isUptrend: false, strength: 0 };
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
    
    // Determine if it's an uptrend and calculate strength
    const isUptrend = normalizedSlope > 0;
    const strength = Math.min(Math.abs(normalizedSlope) / 0.5, 1); // Cap at 1.0
    
    return { isUptrend, strength };
}

function validateHeadAndShoulders(candles, head, leftShoulder, rightShoulder, patternConfig) {
    // Add debugging
    console.log('\nValidating Head and Shoulders pattern with:');
    console.log(`Left Shoulder: Index ${leftShoulder.index}, High ${leftShoulder.high}`);
    console.log(`Head: Index ${head.index}, High ${head.high}`);
    console.log(`Right Shoulder: Index ${rightShoulder.index}, High ${rightShoulder.high}`);
    
    // Ensure patternConfig is defined
    if (!patternConfig) {
        patternConfig = {
        minHeadProminence: 0.03,
        maxShoulderDiff: 0.15,
        volatilityFactors: {
            highVolatility: 0.02,
            lowVolatility: 0.01,
            headAdjustment: 1.5,
            shoulderAdjustment: 1.3
        },
        breakout: {
            defaultThreshold: 0.98,
            highVolatilityThreshold: 0.96,
            lowVolatilityThreshold: 0.99
        }
    }
    };
    
    // Calculate ATR for adaptive thresholds
    const atr = calculateATR(candles, 14, leftShoulder.index);
    const avgPrice = (leftShoulder.high + head.high + rightShoulder.high) / 3;
    const volatilityRatio = atr / avgPrice;
    
    // 1. Structural Validation: Head must be the highest peak
    const headLeftShoulderRatio = (head.high - leftShoulder.high) / head.high;
    const headRightShoulderRatio = (head.high - rightShoulder.high) / head.high;
    
    // Special case for indices like ^DJI where the left shoulder can be higher than the head
    // Check if it's an index based on symbol or ticker parameter
    const symbol = candles[0].symbol || '';
    const isIndex = symbol.startsWith('^') || (candles.ticker && candles.ticker.startsWith('^'));
    
    console.log(`Is index: ${isIndex}`);
    console.log(`Head-Left Shoulder Ratio: ${(headLeftShoulderRatio * 100).toFixed(2)}%`);
    console.log(`Head-Right Shoulder Ratio: ${(headRightShoulderRatio * 100).toFixed(2)}%`);
    
    if (isIndex) {
        // For indices, we need to be more lenient with head prominence
        // Allow left shoulder to be higher than head (negative ratio) within limits
        const adjustedLeftRatio = headLeftShoulderRatio < 0 ? 
            Math.abs(headLeftShoulderRatio) <= 0.05 : // Allow up to 5% higher left shoulder
            headLeftShoulderRatio >= -0.05; // Standard check with leniency
            
        // Right shoulder should still be lower than head
        const adjustedRightRatio = headRightShoulderRatio >= -0.05;
        
        console.log(`Adjusted left ratio check: ${adjustedLeftRatio}`);
        console.log(`Adjusted right ratio check: ${adjustedRightRatio}`);
        
        if (!adjustedLeftRatio || !adjustedRightRatio) {
            console.log('Failed head prominence check for index');
            return null;
        }
        
        console.log('Passed head prominence check for index');
    } else {
        // Use configuration for head prominence threshold
        let minHeadProminence = patternConfig.minHeadProminence;
        
        // Adjust threshold based on volatility using configuration
        if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
            minHeadProminence *= patternConfig.volatilityFactors.headAdjustment;
        } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
            minHeadProminence /= patternConfig.volatilityFactors.headAdjustment;
        }
        
        if (headLeftShoulderRatio < minHeadProminence || headRightShoulderRatio < minHeadProminence) {
            return null;
        }
    }
    
    // Calculate head prominence confidence
    let headProminenceConfidence;
    
    if (isIndex) {
        // For indices, use a fixed confidence calculation
        headProminenceConfidence = 0.8; // Higher base confidence for indices
    } else {
        // For regular stocks, calculate based on the ratio
        const minHeadProminence = patternConfig.minHeadProminence;
        headProminenceConfidence = Math.min(
            Math.min(headLeftShoulderRatio, headRightShoulderRatio) / (minHeadProminence * 2),
            1.0
        );
    }

    // 2. Symmetry Validation: Shoulders should be reasonably similar in height
    const shoulderHeightDiff = Math.abs(leftShoulder.high - rightShoulder.high) / Math.max(leftShoulder.high, rightShoulder.high);
    
    console.log(`Shoulder Height Difference: ${(shoulderHeightDiff * 100).toFixed(2)}%`);
    
    // Use configuration for shoulder symmetry threshold
    let maxShoulderDiff = patternConfig.maxShoulderDiff;
    
    // Adjust threshold based on volatility using configuration
    if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
        maxShoulderDiff *= patternConfig.volatilityFactors.shoulderAdjustment;
    } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
        maxShoulderDiff /= patternConfig.volatilityFactors.shoulderAdjustment;
    }
    
    // For indices, be more lenient with shoulder symmetry
    if (isIndex) {
        maxShoulderDiff *= 1.5; // 50% more tolerance for indices
    }
    
    console.log(`Max Shoulder Difference Allowed: ${(maxShoulderDiff * 100).toFixed(2)}%`);
    
    if (shoulderHeightDiff > maxShoulderDiff) {
        console.log('Failed shoulder symmetry check');
        return null;
    }
    
    console.log('Passed shoulder symmetry check');
    
    // Calculate shoulder symmetry confidence
    const symmetryRatio = 1 - (shoulderHeightDiff / maxShoulderDiff);
    const shoulderSymmetryConfidence = Math.max(Math.min(symmetryRatio, 1.0), 0.0);

    // 3. Neckline Calculation (sloped)
    const m = (rightTrough.low - leftTrough.low) / (rightTrough.index - leftTrough.index);
    const c = leftTrough.low - m * leftTrough.index;
    const getNecklineValue = (index) => m * index + c;
    
    // Calculate neckline quality (how horizontal it is)
    const necklineSlope = Math.abs(m);
    const necklineSlopeRatio = necklineSlope / avgPrice;
    const necklineQualityConfidence = Math.max(1 - (necklineSlopeRatio * 100), 0.0);

    // 4. Volume Analysis
    // Check if volume increases on breakout and decreases at right shoulder
    const leftShoulderVolume = leftShoulder.volume;
    const headVolume = head.volume;
    const rightShoulderVolume = rightShoulder.volume;
    
    // Ideal volume profile: Left Shoulder (moderate) -> Head (high) -> Right Shoulder (lower)
    const idealVolumeProfile = headVolume > leftShoulderVolume && rightShoulderVolume < headVolume;
    const volumeRatio = rightShoulderVolume / headVolume;
    const volumeProfileConfidence = idealVolumeProfile ? Math.max(1 - volumeRatio, 0.3) : 0.3;

    // 5. Prior Trend Analysis
    // Head and Shoulders should form after an uptrend
    const trendAnalysis = analyzePriorTrend(candles, Math.max(0, startTrough.index - 20), startTrough.index);
    const priorTrendConfidence = trendAnalysis.isUptrend ? trendAnalysis.strength : 0.0;

    // 6. Breakout Confirmation
    let breakoutPoint = null;
    let breakoutConfidence = 0.0;
    let partialBreakout = false;
    
    // Calculate average volume for comparison
    let avgVolume = 0;
    const volumeWindow = Math.min(20, rightShoulder.index - leftShoulder.index);
    for (let i = rightShoulder.index - volumeWindow; i < rightShoulder.index; i++) {
        avgVolume += candles[i].volume;
    }
    avgVolume /= volumeWindow;
    
    // Use configuration for breakout threshold
    let breakoutThreshold = patternConfig.breakout.defaultThreshold;
    
    // Adjust threshold based on volatility using configuration
    if (volatilityRatio > patternConfig.volatilityFactors.highVolatility) {
        breakoutThreshold = patternConfig.breakout.highVolatilityThreshold;
    } else if (volatilityRatio < patternConfig.volatilityFactors.lowVolatility) {
        breakoutThreshold = patternConfig.breakout.lowVolatilityThreshold;
    }
    
    // Use dynamic lookback window based on volatility and ticker characteristics
    let lookbackWindow = 30; // Default lookback window
    
    // Adjust lookback window based on pattern timespan
    const patternTimespan = rightShoulder.index - leftShoulder.index;
    if (patternTimespan > 100) {
        // For patterns that form over a longer period, use a larger lookback window
        lookbackWindow = Math.min(Math.round(patternTimespan * 0.5), 50);
    }
    
    for (let i = rightShoulder.index + 1; i < Math.min(candles.length, rightShoulder.index + lookbackWindow); i++) {
        const necklineValue = getNecklineValue(i);
        const breakoutLevel = necklineValue * breakoutThreshold;
        
        // Full breakout - price closes below neckline
        if (candles[i].close < breakoutLevel) {
            const volumeRatio = candles[i].volume / avgVolume;
            breakoutPoint = { 
                date: candles[i].date, 
                price: candles[i].close, 
                volume: candles[i].volume,
                volumeRatio: volumeRatio
            };
            breakoutConfidence = 1.0;
            break;
        }
        // Partial breakout (price touches neckline but doesn't close below)
        else if (candles[i].low < breakoutLevel) {
            const volumeRatio = candles[i].volume / avgVolume;
            breakoutPoint = { 
                date: candles[i].date, 
                price: candles[i].close, 
                volume: candles[i].volume,
                volumeRatio: volumeRatio,
                partial: true
            };
            partialBreakout = true;
            breakoutConfidence = 0.7; // Lower confidence for partial breakout
            break;
        }
    }

    // Handle patterns without breakout
    if (!breakoutPoint) {
        console.log('No breakout detected, checking if pattern is forming...');
        
        // Check if the pattern is still forming (near the end of the data)
        const isNearEndOfData = rightShoulder.index > candles.length - Math.min(20, Math.round(patternTimespan * 0.2));
        
        // Check if price is approaching the neckline
        const latestCandle = candles[candles.length - 1];
        const latestNecklineValue = getNecklineValue(candles.length - 1);
        const distanceToNeckline = (latestCandle.close - latestNecklineValue) / latestNecklineValue;
        
        console.log(`Is near end of data: ${isNearEndOfData}`);
        console.log(`Distance to neckline: ${(distanceToNeckline * 100).toFixed(2)}%`);
        console.log(`Latest candle close: ${latestCandle.close}, Neckline value: ${latestNecklineValue}`);
        
        // For indices, be more lenient with forming patterns
        const formingThreshold = isIndex ? 0.05 : 0.03;
        
        // If pattern is forming near the end of data or price is approaching neckline
        if (isNearEndOfData || Math.abs(distanceToNeckline) < formingThreshold) {
            console.log('Pattern is forming at the end of the data');
            
            breakoutPoint = { 
                date: latestCandle.date, 
                price: latestCandle.close, 
                volume: latestCandle.volume,
                volumeRatio: 1.0,
                forming: true
            };
            partialBreakout = true;
            
            // Calculate confidence based on how close price is to neckline
            const proximityFactor = Math.max(0, 1 - Math.abs(distanceToNeckline) * 20);
            breakoutConfidence = 0.3 + (proximityFactor * 0.3); // Between 0.3 and 0.6
            console.log(`Forming pattern confidence: ${breakoutConfidence.toFixed(2)}`);
        } else {
            console.log('No breakout and not forming - pattern rejected');
            return null; // No breakout and not forming
        }
    }

    // 7. Calculate Pattern Metrics
    const necklineAtHead = getNecklineValue(head.index);
    const patternHeight = head.high - necklineAtHead;
    const breakoutIndex = candles.findIndex(c => c.date === breakoutPoint.date);
    const necklineAtBreakout = getNecklineValue(breakoutIndex);
    const priceTarget = necklineAtBreakout - patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24);

    // 8. Calculate Composite Confidence Score
    // Weight the different confidence factors
    const confidenceWeights = {
        headProminence: 0.20,  // How much the head stands out
        shoulderSymmetry: 0.20, // How similar the shoulders are
        necklineQuality: 0.10, // How horizontal/clean the neckline is
        volumeProfile: 0.15,   // Volume characteristics
        priorTrend: 0.15,      // Preceding uptrend
        breakout: 0.20         // Breakout confirmation
    };
    
    // Calculate weighted confidence score
    const compositeConfidence = 
        (headProminenceConfidence * confidenceWeights.headProminence) +
        (shoulderSymmetryConfidence * confidenceWeights.shoulderSymmetry) +
        (necklineQualityConfidence * confidenceWeights.necklineQuality) +
        (volumeProfileConfidence * confidenceWeights.volumeProfile) +
        (priorTrendConfidence * confidenceWeights.priorTrend) +
        (breakoutConfidence * confidenceWeights.breakout);
    
    // Round to 2 decimal places
    const finalConfidence = Math.round(compositeConfidence * 100) / 100;
    
    return {
        success: true,
        pattern: "Head and Shoulders",
        patternData: {
            type: "Head and Shoulders",
            confidence: finalConfidence,
            keyPoints: {
                startPoint: { date: startTrough.date, price: startTrough.low, volume: startTrough.volume },
                leftShoulder: { date: leftShoulder.date, price: leftShoulder.high, volume: leftShoulder.volume },
                leftTrough: { date: leftTrough.date, price: leftTrough.low, volume: leftTrough.volume },
                head: { date: head.date, price: head.high, volume: head.volume },
                rightTrough: { date: rightTrough.date, price: rightTrough.low, volume: rightTrough.volume },
                rightShoulder: { date: rightShoulder.date, price: rightShoulder.high, volume: rightShoulder.volume },
                necklineBreak: breakoutPoint,
            },
            necklineLevel: necklineAtBreakout, // Represents neckline value at the point of breakout
            priceTarget: parseFloat(priceTarget.toFixed(2)),
            patternHeight: parseFloat(patternHeight.toFixed(2)),
            timespan: Math.round(timespan),
            symmetryRatio: parseFloat(symmetryRatio.toFixed(2)),
            // Add detailed confidence metrics
            confidenceMetrics: {
                headProminence: Math.round(headProminenceConfidence * 100) / 100,
                shoulderSymmetry: Math.round(shoulderSymmetryConfidence * 100) / 100,
                necklineQuality: Math.round(necklineQualityConfidence * 100) / 100,
                volumeProfile: Math.round(volumeProfileConfidence * 100) / 100,
                priorTrend: Math.round(priorTrendConfidence * 100) / 100,
                breakoutStrength: Math.round(breakoutConfidence * 100) / 100,
                partialBreakout: partialBreakout
            }
        }
    };
}

function detectHeadAndShoulders(candles, ticker = '') {
    if (!candles || candles.length < 60) {
        return { success: false, reason: "Not enough data" };
    }

    // Dynamic pattern detection configuration
    const patternConfig = {
        // Minimum number of candles needed for reliable pattern detection
        minCandles: 60,
        
        // Window size for peak/trough detection
        windowSize: 10,
        
        // Minimum head prominence (head must be X% higher than shoulders)
        minHeadProminence: 0.03,
        
        // Maximum shoulder height difference (shoulders must be within X% of each other)
        maxShoulderDiff: 0.15,
        
        // Volatility adjustment factors
        volatilityFactors: {
            highVolatility: 0.02,  // Threshold for high volatility
            lowVolatility: 0.01,   // Threshold for low volatility
            headAdjustment: 1.5,   // Multiply head threshold by this in high volatility
            shoulderAdjustment: 1.3 // Multiply shoulder threshold by this in high volatility
        },
        
        // Breakout confirmation settings
        breakout: {
            defaultThreshold: 0.98, // Default 2% below neckline
            highVolatilityThreshold: 0.96, // 4% below neckline for high volatility
            lowVolatilityThreshold: 0.99  // 1% below neckline for low volatility
        }
    };
    
    // Adjust configuration based on ticker characteristics if needed
    let adjustedConfig = { ...patternConfig };
    
    // Adjust thresholds based on market type
    if (ticker.startsWith('^')) {
        // For major indices, we need more lenient parameters
        adjustedConfig.maxShoulderDiff *= 1.3; // Allow more asymmetric shoulders
        adjustedConfig.minHeadProminence *= 0.8; // Lower head prominence requirement
        adjustedConfig.breakout.defaultThreshold = 0.97; // 3% below neckline for breakout
        adjustedConfig.breakout.highVolatilityThreshold = 0.95; // 5% below for high volatility
        console.log(`Applying index-specific configuration for ${ticker}`);
    } else if (ticker.includes('BTC') || ticker.includes('-USD')) {
        // For crypto assets, which tend to be more volatile
        adjustedConfig.minHeadProminence *= 1.5;
        adjustedConfig.volatilityFactors.highVolatility *= 1.5;
        console.log(`Applying crypto-specific configuration for ${ticker}`);
    }
    
    // Use the adjusted configuration for peak/trough detection
    const { peaks, troughs } = findPeaksAndTroughs(candles, adjustedConfig.windowSize);
    
    if (peaks.length < 3 || troughs.length < 2) {
        return { success: false, reason: "Not enough peaks or troughs found" };
    }
    // Sort peaks by significance (height)
    const sortedPeaks = [...peaks].sort((a, b) => b.high - a.high);
    
    // Try the most significant peaks first
    const topPeaks = sortedPeaks.slice(0, Math.min(5, sortedPeaks.length));
    
    // Store all valid patterns found
    const validPatterns = [];
    
    // First try with the most significant peaks as potential heads
    for (const potentialHead of topPeaks) {
        // Find potential left shoulders (peaks before the head)
        const potentialLeftShoulders = peaks.filter(p => p.index < potentialHead.index);
        
        // Find potential right shoulders (peaks after the head)
        const potentialRightShoulders = peaks.filter(p => p.index > potentialHead.index);
        
        // Try each left shoulder and right shoulder combination
        for (const leftShoulder of potentialLeftShoulders) {
            for (const rightShoulder of potentialRightShoulders) {
                // Ensure proper sequence
                if (leftShoulder.index >= potentialHead.index || potentialHead.index >= rightShoulder.index) continue;
                
                // Find the troughs between these peaks
                const leftTrough = troughs.find(t => t.index > leftShoulder.index && t.index < potentialHead.index);
                const rightTrough = troughs.find(t => t.index > potentialHead.index && t.index < rightShoulder.index);
                
                // Find a starting trough before the left shoulder
                const precedingTroughs = troughs.filter(t => t.index < leftShoulder.index);
                if (precedingTroughs.length === 0) continue;
                const startTrough = precedingTroughs[precedingTroughs.length - 1];
                
                if (leftTrough && rightTrough) {
                    // Pass the adjusted configuration to the validation function
                    const result = validateHeadAndShoulders(startTrough, leftShoulder, potentialHead, rightShoulder, leftTrough, rightTrough, candles, adjustedConfig);
                    if (result) {
                        // Add metadata about the detection approach
                        result.patternData.metadata = {
                            detectionMethod: 'dynamic',
                            configurationUsed: JSON.stringify(adjustedConfig)
                        };
                        validPatterns.push(result);
                    }
                }
            }
        }
    }
    
    // If no valid patterns found with top peaks approach, try sequential approach
    if (validPatterns.length === 0) {
        for (let i = 0; i < peaks.length - 2; i++) {
            const leftShoulder = peaks[i];
            const head = peaks[i + 1];
            const rightShoulder = peaks[i + 2];
            
            // Skip if not in proper sequence
            if (leftShoulder.index >= head.index || head.index >= rightShoulder.index) continue;
            
            const precedingTroughs = troughs.filter(t => t.index < leftShoulder.index);
            if (precedingTroughs.length === 0) continue;
            const startTrough = precedingTroughs[precedingTroughs.length - 1];
            
            const leftTrough = troughs.find(t => t.index > leftShoulder.index && t.index < head.index);
            const rightTrough = troughs.find(t => t.index > head.index && t.index < rightShoulder.index);
            
            if (leftTrough && rightTrough) {
                // Pass the adjusted configuration to the validation function
                const result = validateHeadAndShoulders(startTrough, leftShoulder, head, rightShoulder, leftTrough, rightTrough, candles, adjustedConfig);
                if (result) {
                    // Add metadata about the detection approach
                    result.patternData.metadata = {
                        detectionMethod: 'sequential',
                        configurationUsed: JSON.stringify(adjustedConfig)
                    };
                    validPatterns.push(result);
                }
            }
        }
    }
    
    // Return the pattern with the highest confidence score
    if (validPatterns.length > 0) {
        return validPatterns.sort((a, b) => b.patternData.confidence - a.patternData.confidence)[0];
    }
    
    return { success: false, pattern: "Head and Shoulders", reason: "No pattern confirmed" };
}

module.exports = { detectHeadAndShoulders };

/**
 * Calculates the optimal window size for peak/trough detection based on price volatility
 * @param {Array<Object>} candles - The array of candle objects
 * @param {number} baseWindow - The base window size to adjust
 * @returns {number} - The adaptive window size
 */
function calculateAdaptiveWindow(candles, baseWindow = 10) {
    // Calculate Average True Range (ATR) as a volatility measure
    let atrSum = 0;
    for (let i = 1; i < Math.min(candles.length, 20); i++) {
        const trueRange = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i-1].close),
            Math.abs(candles[i].low - candles[i-1].close)
        );
        atrSum += trueRange;
    }
    const atr = atrSum / Math.min(candles.length - 1, 19);
    
    // Calculate average price
    const avgPrice = candles.reduce((sum, c) => sum + ((c.high + c.low) / 2), 0) / candles.length;
    
    // Calculate volatility ratio
    const volatilityRatio = (atr / avgPrice) * 100;
    
    // Adjust window based on volatility - more sensitive settings
    if (volatilityRatio > 2.0) { // High volatility (threshold reduced from 2.5)
        return Math.max(3, Math.floor(baseWindow * 0.6)); // Smaller minimum window (was 5)
    } else if (volatilityRatio < 1.0) { // Low volatility (threshold increased from 0.8)
        return Math.min(15, Math.floor(baseWindow * 1.3)); // Smaller maximum window (was 20)
    }
    return Math.floor(baseWindow * 0.8); // Reduced default window (was baseWindow)
}

/**
 * Finds peaks and troughs in a given set of OHLC candles with adaptive window sizing.
 * @param {Array<Object>} candles - The array of candle objects.
 * @param {number} baseWindow - The base number of candles to look at on either side.
 * @returns {{peaks: Array<Object>, troughs: Array<Object>}} - The identified peaks and troughs.
 */
function findPeaksAndTroughs(candles, baseWindow = 10) {
    const peaks = [];
    const troughs = [];

    if (candles.length < (baseWindow * 2) + 1) {
        return { peaks, troughs };
    }
    
    // Use adaptive window sizing based on market volatility
    const window = calculateAdaptiveWindow(candles, baseWindow);
    
    // Significance threshold - reduced for higher sensitivity
    const significanceThreshold = 0.002; // 0.2% minimum significance (was 0.5%)

    for (let i = window; i < candles.length - window; i++) {
        const currentCandle = candles[i];
        const surroundingCandles = candles.slice(i - window, i + window + 1);
        
        // Calculate local average price for significance comparison
        const avgPrice = surroundingCandles.reduce((sum, c) => sum + ((c.high + c.low) / 2), 0) / surroundingCandles.length;
        
        // Check if this is a peak
        const isPeak = surroundingCandles.every(c => currentCandle.high >= c.high);
        const peakSignificance = (currentCandle.high - avgPrice) / avgPrice;
        
        if (isPeak && peakSignificance > significanceThreshold) {
            // Add volume information for later analysis
            const volumeRatio = currentCandle.volume / 
                (surroundingCandles.reduce((sum, c) => sum + c.volume, 0) / surroundingCandles.length);
                
            peaks.push({ 
                index: i, 
                ...currentCandle,
                significance: peakSignificance,
                volumeRatio: volumeRatio
            });
        }

        // Check if this is a trough
        const isTrough = surroundingCandles.every(c => currentCandle.low <= c.low);
        const troughSignificance = (avgPrice - currentCandle.low) / avgPrice;
        
        if (isTrough && troughSignificance > significanceThreshold) {
            // Add volume information for later analysis
            const volumeRatio = currentCandle.volume / 
                (surroundingCandles.reduce((sum, c) => sum + c.volume, 0) / surroundingCandles.length);
                
            troughs.push({ 
                index: i, 
                ...currentCandle,
                significance: troughSignificance,
                volumeRatio: volumeRatio
            });
        }
    }

    return { peaks, troughs };
}

module.exports = { findPeaksAndTroughs };

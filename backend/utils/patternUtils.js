/**
 * Calculates an optimal window size based on the dataset length.
 * @param {number} dataLength - The length of the dataset.
 * @returns {number} - The calculated window size.
 */
function calculateOptimalWindowSize(dataLength) {
    // For small datasets, use a smaller window
    if (dataLength < 50) {
        return Math.max(2, Math.floor(dataLength * 0.05)); // 5% of data length, minimum 2
    }
    // For medium datasets
    else if (dataLength < 200) {
        return Math.max(3, Math.floor(dataLength * 0.04)); // 4% of data length, minimum 3
    }
    // For large datasets
    else {
        return Math.max(5, Math.floor(dataLength * 0.03)); // 3% of data length, minimum 5
    }
}

/**
 * Finds peaks and troughs in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @param {number} window - The number of candles to look at on either side to determine a peak or trough.
 *                         If not provided, an optimal window size will be calculated.
 * @returns {{peaks: Array<Object>, troughs: Array<Object>}} - The identified peaks and troughs.
 */
function findPeaksAndTroughs(candles, window = null) {
    const peaks = [];
    const troughs = [];
    
    // Calculate optimal window size if not provided
    if (window === null) {
        window = calculateOptimalWindowSize(candles.length);
    }
    
    if (candles.length < (window * 2) + 1) {
        return { peaks, troughs };
    }

    for (let i = window; i < candles.length - window; i++) {
        const currentCandle = candles[i];
        const surroundingCandles = candles.slice(i - window, i + window + 1);

        const isPeak = surroundingCandles.every(c => currentCandle.high >= c.high);
        if (isPeak) {
            peaks.push({ index: i, ...currentCandle });
        }

        const isTrough = surroundingCandles.every(c => currentCandle.low <= c.low);
        if (isTrough) {
            troughs.push({ index: i, ...currentCandle });
        }
    }

    return { peaks, troughs };
}

module.exports = { findPeaksAndTroughs, calculateOptimalWindowSize };

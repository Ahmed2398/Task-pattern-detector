const { findPeaksAndTroughs } = require('../utils/patternUtils.js');

/**
 * Validates if two troughs and an intermediate peak form a Double Bottom pattern.
 * @param {Object} startPeak - The peak before the first trough.
 * @param {Object} firstBottom - The first identified trough.
 * @param {Object} secondBottom - The second identified trough.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object|null} - The detected pattern data or null if not valid.
 */
function validateDoubleBottom(startPeak, firstBottom, secondBottom, candles) {
    if (secondBottom.index <= firstBottom.index + 1) {
        return null;
    }

    // 1. Trough Similarity: The relative distance between troughs should be within 6%.
    const priceDiff = Math.abs(firstBottom.low - secondBottom.low) / Math.min(firstBottom.low, secondBottom.low);
    if (priceDiff > 0.06) { // 6% tolerance
        return null;
    }

    const candlesBetween = candles.slice(firstBottom.index + 1, secondBottom.index);
    if (candlesBetween.length === 0) {
        return null;
    }

    const peak = candlesBetween.reduce((max, candle) => candle.high > max.high ? candle : max, candlesBetween[0]);
    if (!peak) {
        return null;
    }

    // 2. Peak Rise: The peak should be a 10-20% rise from the first trough.
    const peakRise = (peak.high - firstBottom.low) / firstBottom.low;
    if (peakRise < 0.10) { // Must be at least a 10% rise
        return null;
    }

    const necklineLevel = peak.high;
    if (necklineLevel <= firstBottom.low || necklineLevel <= secondBottom.low) {
        return null;
    }

    // 3. Breakout Confirmation: Price must rise 5% above the neckline.
    const breakoutConfirmationLevel = necklineLevel * 1.05;
    let breakoutPoint = null;
    for (let k = secondBottom.index + 1; k < candles.length; k++) {
        if (candles[k].close > breakoutConfirmationLevel) {
            breakoutPoint = { date: candles[k].date, price: candles[k].close, volume: candles[k].volume };
            break;
        }
    }

    if (!breakoutPoint) {
        return null;
    }

    const patternHeight = necklineLevel - ((firstBottom.low + secondBottom.low) / 2);
    const priceTarget = necklineLevel + patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(firstBottom.date)) / (1000 * 60 * 60 * 24);

    return {
        detected: true,
        pattern: "Double Bottom",
        patternData: {
            confidence: 1 - priceDiff,
            keyPoints: {
                startPoint: { date: startPeak.date, price: startPeak.high },
                firstBottom: { date: firstBottom.date, price: firstBottom.low, volume: firstBottom.volume },
                peak: { date: peak.date, price: peak.high, volume: peak.volume },
                secondBottom: { date: secondBottom.date, price: secondBottom.low, volume: secondBottom.volume },
                breakoutPoint: breakoutPoint,
            },
            necklineLevel: necklineLevel,
            priceTarget: priceTarget,
            patternHeight: patternHeight,
            timespan: Math.round(timespan),
        },
    };
}

/**
 * Detects the Double Bottom pattern in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object} - The result of the detection.
 */
function detectDoubleBottom(candles) {
    if (!candles || candles.length < 30) {
        return { detected: false, reason: "Not enough data" };
    }

    const { peaks, troughs } = findPeaksAndTroughs(candles);

    if (troughs.length < 2 || peaks.length < 1) {
        return { detected: false, reason: "Not enough peaks or troughs found" };
    }

    for (let i = 0; i < troughs.length; i++) {
        const firstBottom = troughs[i];
        const precedingPeaks = peaks.filter(p => p.index < firstBottom.index);
        if (precedingPeaks.length === 0) continue;
        const startPeak = precedingPeaks[precedingPeaks.length - 1];

        for (let j = i + 1; j < troughs.length; j++) {
            const secondBottom = troughs[j];

            const result = validateDoubleBottom(startPeak, firstBottom, secondBottom, candles);
            if (result) {
                return result; // Return the first valid pattern found
            }
        }
    }

    return { detected: false };
}

module.exports = { detectDoubleBottom };

const { findPeaksAndTroughs, calculateATR, analyzePriorTrend } = require('../utils/patternUtils.js');

/**
 * Validates if three troughs and two intermediate peaks form a Triple Bottom pattern.
 * @param {Object} startPeak - The peak before the first trough.
 * @param {Object} firstBottom - The first identified trough.
 * @param {Object} secondBottom - The second identified trough.
 * @param {Object} thirdBottom - The third identified trough.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object|null} - The detected pattern data or null if not valid.
 */
function validateTripleBottom(startPeak, firstBottom, secondBottom, thirdBottom, candles) {
    if (secondBottom.index <= firstBottom.index + 1 || thirdBottom.index <= secondBottom.index + 1) {
        return null;
    }

    const bottomPrices = [firstBottom.low, secondBottom.low, thirdBottom.low];
    const minBottomPrice = Math.min(...bottomPrices);
    const avgBottomPrice = bottomPrices.reduce((a, b) => a + b, 0) / 3;

    const priceDiffs = bottomPrices.map(p => Math.abs(p - minBottomPrice) / minBottomPrice);
    if (priceDiffs.some(d => d > 0.08)) { // 8% tolerance
        return null;
    }

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

    const necklineLevel = Math.max(firstPeak.high, secondPeak.high);
    if (necklineLevel <= avgBottomPrice) {
        return null;
    }

    let breakoutPoint = null;
    for (let i = thirdBottom.index + 1; i < candles.length; i++) {
        if (candles[i].close > necklineLevel) {
            breakoutPoint = { date: candles[i].date, price: candles[i].close, volume: candles[i].volume };
            break;
        }
    }

    if (!breakoutPoint) {
        return null;
    }

    const patternHeight = necklineLevel - avgBottomPrice;
    const priceTarget = necklineLevel + patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(firstBottom.date)) / (1000 * 60 * 60 * 24);

    return {
        detected: true,
        patternData: {
            confidence: 1 - Math.max(...priceDiffs),
            keyPoints: {
                startPoint: { date: startPeak.date, price: startPeak.high, volume: startPeak.volume },
                firstBottom: { date: firstBottom.date, price: firstBottom.low, volume: firstBottom.volume },
                firstPeak: { date: firstPeak.date, price: firstPeak.high, volume: firstPeak.volume },
                secondBottom: { date: secondBottom.date, price: secondBottom.low, volume: secondBottom.volume },
                secondPeak: { date: secondPeak.date, price: secondPeak.high, volume: secondPeak.volume },
                thirdBottom: { date: thirdBottom.date, price: thirdBottom.low, volume: thirdBottom.volume },
                breakoutPoint: breakoutPoint,
            },
            necklineLevel: necklineLevel,
            priceTarget: priceTarget,
            patternHeight: patternHeight,
            timespan: Math.round(timespan),
        }
    };
}

/**
 * Detects the Triple Bottom pattern in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object} - The result of the detection.
 */
function detectTripleBottom(candles) {
    if (!candles || candles.length < 50) {
        return { detected: false, reason: "Not enough data" };
    }

    const { peaks, troughs } = findPeaksAndTroughs(candles);

    if (troughs.length < 3) {
        return { detected: false, reason: "Not enough troughs found" };
    }

    for (let i = 0; i < troughs.length; i++) {
        const firstBottom = troughs[i];
        const precedingPeaks = peaks.filter(p => p.index < firstBottom.index);
        if (precedingPeaks.length === 0) continue;
        const startPeak = precedingPeaks[precedingPeaks.length - 1];

        for (let j = i + 1; j < troughs.length; j++) {
            for (let k = j + 1; k < troughs.length; k++) {
                const result = validateTripleBottom(startPeak, firstBottom, troughs[j], troughs[k], candles);
                if (result) {
                    return result; // Return the first valid pattern found
                }
            }
        }
    }

    return { detected: false };
}

module.exports = { detectTripleBottom };

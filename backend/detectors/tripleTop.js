const { findPeaksAndTroughs } = require('../utils/patternUtils.js');

/**
 * Validates if three peaks and two intermediate troughs form a Triple Top pattern.
 * @param {Object} startTrough - The trough before the first peak.
 * @param {Object} firstPeak - The first identified peak.
 * @param {Object} secondPeak - The second identified peak.
 * @param {Object} thirdPeak - The third identified peak.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object|null} - The detected pattern data or null if not valid.
 */
function validateTripleTop(startTrough, firstPeak, secondPeak, thirdPeak, candles) {
    if (secondPeak.index <= firstPeak.index + 1 || thirdPeak.index <= secondPeak.index + 1) {
        return null;
    }

    const peakPrices = [firstPeak.high, secondPeak.high, thirdPeak.high];
    const maxPeakPrice = Math.max(...peakPrices);
    const avgPeakPrice = peakPrices.reduce((a, b) => a + b, 0) / 3;

    const priceDiffs = peakPrices.map(p => Math.abs(p - maxPeakPrice) / maxPeakPrice);
    if (priceDiffs.some(d => d > 0.05)) { // 5% tolerance
        return null;
    }

    const candlesBetween1 = candles.slice(firstPeak.index + 1, secondPeak.index);
    const candlesBetween2 = candles.slice(secondPeak.index + 1, thirdPeak.index);
    if (candlesBetween1.length === 0 || candlesBetween2.length === 0) {
        return null;
    }

    const firstTrough = candlesBetween1.reduce((min, c) => c.low < min.low ? c : min, candlesBetween1[0]);
    const secondTrough = candlesBetween2.reduce((min, c) => c.low < min.low ? c : min, candlesBetween2[0]);
    if (!firstTrough || !secondTrough) {
        return null;
    }

    const necklineLevel = Math.min(firstTrough.low, secondTrough.low);
    if (necklineLevel >= avgPeakPrice) {
        return null;
    }

    let breakoutPoint = null;
    for (let i = thirdPeak.index + 1; i < candles.length; i++) {
        if (candles[i].close < necklineLevel) {
            breakoutPoint = { date: candles[i].date, price: candles[i].close, volume: candles[i].volume };
            break;
        }
    }

    if (!breakoutPoint) {
        return null;
    }

    const patternHeight = avgPeakPrice - necklineLevel;
    const priceTarget = necklineLevel - patternHeight;
    const timespan = (new Date(breakoutPoint.date) - new Date(firstPeak.date)) / (1000 * 60 * 60 * 24);

    return {
        detected: true,
        patternData: {
            confidence: 1 - Math.max(...priceDiffs),
            keyPoints: {
                startPoint: { date: startTrough.date, price: startTrough.low, volume: startTrough.volume },
                firstPeak: { date: firstPeak.date, price: firstPeak.high, volume: firstPeak.volume },
                firstTrough: { date: firstTrough.date, price: firstTrough.low, volume: firstTrough.volume },
                secondPeak: { date: secondPeak.date, price: secondPeak.high, volume: secondPeak.volume },
                secondTrough: { date: secondTrough.date, price: secondTrough.low, volume: secondTrough.volume },
                thirdPeak: { date: thirdPeak.date, price: thirdPeak.high, volume: thirdPeak.volume },
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
 * Detects the Triple Top pattern in a given set of OHLC candles.
 * @param {Array<Object>} candles - The array of candle objects.
 * @returns {Object} - The result of the detection.
 */
function detectTripleTop(candles) {
    if (!candles || candles.length < 50) {
        return { detected: false, reason: "Not enough data" };
    }

    const { peaks, troughs } = findPeaksAndTroughs(candles);

    if (peaks.length < 3) {
        return { detected: false, reason: "Not enough peaks found" };
    }

    for (let i = 0; i < peaks.length; i++) {
        const firstPeak = peaks[i];
        const precedingTroughs = troughs.filter(t => t.index < firstPeak.index);
        if (precedingTroughs.length === 0) continue;
        const startTrough = precedingTroughs[precedingTroughs.length - 1];

        for (let j = i + 1; j < peaks.length; j++) {
            for (let k = j + 1; k < peaks.length; k++) {
                const result = validateTripleTop(startTrough, firstPeak, peaks[j], peaks[k], candles);
                if (result) {
                    return result; // Return the first valid pattern found
                }
            }
        }
    }

    return { detected: false };
}

module.exports = { detectTripleTop };

const express = require("express");
const cors = require('cors');
const { getHistoricalData } = require("./services/dataService.js");
const { detectDoubleTop } = require("./detectors/doubleTop.js");
const { detectHeadAndShoulders } = require("./detectors/headAndShoulders.js");
const { detectInverseHeadAndShoulders } = require("./detectors/inverseHeadAndShoulders.js");
const { detectDoubleBottom } = require("./detectors/doubleBottom.js");
const { detectTripleTop } = require("./detectors/tripleTop.js");
const { detectTripleBottom } = require("./detectors/tripleBottom.js");

const app = express();
app.use(cors());

app.get("/api/analyze", async (req, res) => {
  const { ticker, fromDate, toDate, patternType } = req.query;

  const getNextDay = (dateString) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  try {
    const stockData = await getHistoricalData(ticker, fromDate, toDate);

    if (patternType === 'double-top') {
        const result = detectDoubleTop(stockData);
        if (result.detected) {
            const { keyPoints, necklineLevel, priceTarget } = result.patternData;
            const breakoutDate = keyPoints.breakoutPoint.date;
            return res.json({
                success: true, pattern: "Double Top", ticker, dateRange: { start: fromDate, end: toDate },
                patternData: result.patternData, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.firstPeak.date, price: necklineLevel }, { date: breakoutDate, price: necklineLevel }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.firstPeak.date, price: keyPoints.firstPeak.price },
                        { date: keyPoints.valley.date, price: keyPoints.valley.price },
                        { date: keyPoints.secondPeak.date, price: keyPoints.secondPeak.price },
                        { date: keyPoints.breakoutPoint.date, price: keyPoints.breakoutPoint.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: necklineLevel }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    } else if (patternType === 'double-bottom') {
        const result = detectDoubleBottom(stockData);
        if (result.detected) {
            const { keyPoints, necklineLevel, priceTarget } = result.patternData;
            const breakoutDate = keyPoints.breakoutPoint.date;
            return res.json({
                success: true, pattern: "Double Bottom", ticker, dateRange: { start: fromDate, end: toDate },
                patternData: result.patternData, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.firstBottom.date, price: necklineLevel }, { date: breakoutDate, price: necklineLevel }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.firstBottom.date, price: keyPoints.firstBottom.price },
                        { date: keyPoints.peak.date, price: keyPoints.peak.price },
                        { date: keyPoints.secondBottom.date, price: keyPoints.secondBottom.price },
                        { date: keyPoints.breakoutPoint.date, price: keyPoints.breakoutPoint.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: necklineLevel }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    } else if (patternType === 'triple-top') {
        const result = detectTripleTop(stockData);
        if (result.detected) {
            const { keyPoints, necklineLevel, priceTarget } = result.patternData;
            const breakoutDate = keyPoints.breakoutPoint.date;
            return res.json({
                success: true, pattern: "Triple Top", ticker, dateRange: { start: fromDate, end: toDate },
                patternData: result.patternData, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.firstTrough.date, price: necklineLevel }, { date: breakoutDate, price: necklineLevel }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.firstPeak.date, price: keyPoints.firstPeak.price },
                        { date: keyPoints.firstTrough.date, price: keyPoints.firstTrough.price },
                        { date: keyPoints.secondPeak.date, price: keyPoints.secondPeak.price },
                        { date: keyPoints.secondTrough.date, price: keyPoints.secondTrough.price },
                        { date: keyPoints.thirdPeak.date, price: keyPoints.thirdPeak.price },
                        { date: keyPoints.breakoutPoint.date, price: keyPoints.breakoutPoint.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: necklineLevel }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    } else if (patternType === 'triple-bottom') {
        const result = detectTripleBottom(stockData);
        if (result.detected) {
            const { keyPoints, necklineLevel, priceTarget } = result.patternData;
            const breakoutDate = keyPoints.breakoutPoint.date;
            return res.json({
                success: true, pattern: "Triple Bottom", ticker, dateRange: { start: fromDate, end: toDate },
                patternData: result.patternData, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.firstPeak.date, price: necklineLevel }, { date: breakoutDate, price: necklineLevel }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.firstBottom.date, price: keyPoints.firstBottom.price },
                        { date: keyPoints.firstPeak.date, price: keyPoints.firstPeak.price },
                        { date: keyPoints.secondBottom.date, price: keyPoints.secondBottom.price },
                        { date: keyPoints.secondPeak.date, price: keyPoints.secondPeak.price },
                        { date: keyPoints.thirdBottom.date, price: keyPoints.thirdBottom.price },
                        { date: keyPoints.breakoutPoint.date, price: keyPoints.breakoutPoint.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: necklineLevel }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    } else if (patternType === 'head-and-shoulders') {
        const result = detectHeadAndShoulders(stockData);
        if (result.success) {
            const { keyPoints, priceTarget } = result.patternData;
            const m = (keyPoints.rightTrough.price - keyPoints.leftTrough.price) / (stockData.findIndex(c => c.date === keyPoints.rightTrough.date) - stockData.findIndex(c => c.date === keyPoints.leftTrough.date));
            const c = keyPoints.leftTrough.price - m * stockData.findIndex(c => c.date === keyPoints.leftTrough.date);
            const getNecklineValue = (date) => m * stockData.findIndex(p => p.date === date) + c;
            const breakoutDate = keyPoints.necklineBreak.date;

            return res.json({
                ...result, ticker, dateRange: { start: fromDate, end: toDate }, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.leftTrough.date, price: getNecklineValue(keyPoints.leftTrough.date) }, { date: breakoutDate, price: getNecklineValue(breakoutDate) }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.leftShoulder.date, price: keyPoints.leftShoulder.price },
                        { date: keyPoints.leftTrough.date, price: keyPoints.leftTrough.price },
                        { date: keyPoints.head.date, price: keyPoints.head.price },
                        { date: keyPoints.rightTrough.date, price: keyPoints.rightTrough.price },
                        { date: keyPoints.rightShoulder.date, price: keyPoints.rightShoulder.price },
                        { date: keyPoints.necklineBreak.date, price: keyPoints.necklineBreak.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: getNecklineValue(breakoutDate) }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    } else if (patternType === 'inverse-head-and-shoulders') {
        const result = detectInverseHeadAndShoulders(stockData);
        if (result.success) {
            const { keyPoints, priceTarget } = result.patternData;
            const m = (keyPoints.rightPeak.price - keyPoints.leftPeak.price) / (stockData.findIndex(c => c.date === keyPoints.rightPeak.date) - stockData.findIndex(c => c.date === keyPoints.leftPeak.date));
            const c = keyPoints.leftPeak.price - m * stockData.findIndex(c => c.date === keyPoints.leftPeak.date);
            const getNecklineValue = (date) => m * stockData.findIndex(p => p.date === date) + c;
            const breakoutDate = keyPoints.necklineBreak.date;

            return res.json({
                ...result, ticker, dateRange: { start: fromDate, end: toDate }, chartData: stockData,
                patternLines: [
                    { type: "neckline", points: [{ date: keyPoints.leftPeak.date, price: getNecklineValue(keyPoints.leftPeak.date) }, { date: breakoutDate, price: getNecklineValue(breakoutDate) }], color: "#0000ff", style: "dashed" },
                    { type: "patternOutline", points: [
                        { date: keyPoints.startPoint.date, price: keyPoints.startPoint.price },
                        { date: keyPoints.leftShoulder.date, price: keyPoints.leftShoulder.price },
                        { date: keyPoints.leftPeak.date, price: keyPoints.leftPeak.price },
                        { date: keyPoints.head.date, price: keyPoints.head.price },
                        { date: keyPoints.rightPeak.date, price: keyPoints.rightPeak.price },
                        { date: keyPoints.rightShoulder.date, price: keyPoints.rightShoulder.price },
                        { date: keyPoints.necklineBreak.date, price: keyPoints.necklineBreak.price }
                    ], color: "#800080", style: "solid" },
                    { type: "targetLine", points: [{ date: breakoutDate, price: getNecklineValue(breakoutDate) }, { date: getNextDay(breakoutDate), price: priceTarget }], color: "#800080", style: "dotted" }
                ]
            });
        }
    }

    // Generic failure response
    return res.json({
        success: false, pattern: patternType, ticker: ticker,
        dateRange: { start: fromDate, end: toDate },
        message: "Pattern not detected in the given date range.",
        chartData: stockData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});

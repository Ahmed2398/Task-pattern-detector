const yahooFinance = require("yahoo-finance2");

async function getHistoricalData(ticker, start, end) {
  const queryOptions = {
    period1: start,
    period2: end,
    interval: '1d'
  };
  const result = await yahooFinance.default.chart(ticker, queryOptions);

  if (result && result.quotes) {
    return result.quotes.map(d => ({
      date: d.date.toISOString().split('T')[0],
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume
    }));
  }
  return [];
}

module.exports = { getHistoricalData };

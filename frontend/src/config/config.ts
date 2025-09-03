export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',
  ENDPOINTS: {
    ANALYZE: '/analyze'
  }
};

export const CHART_CONFIG = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 400,
  COLORS: {
    BACKGROUND: 'white',
    TEXT: 'black',
    GRID: '#e1e1e1',
    BORDER: '#cccccc',
    CANDLESTICK: {
      UP: '#26a69a',
      DOWN: '#ef5350'
    },
    PATTERN: '#ff6b6b'
  }
};

export const DEFAULT_FORM_VALUES = {
  TICKER: 'AAPL',
  PATTERN_TYPE: 'head-and-shoulders'
};

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  index?: number; // Made optional as it's not used everywhere
}

export interface PatternPoint {
  index: number;
  value: number;
  date: string;
  type: string;
}

export interface Pattern {
  type: string;
  confidence: number;
  points: any;
  startIndex: number;
  endIndex: number;
}

export interface PatternLinePoint {
    date: string;
    price: number;
}

export interface PatternLine {
    name: string;
    points: PatternLinePoint[];
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
}

export interface PatternData {
  confidence?: number;
  keyPoints?: any; // Can be more specific later
  necklineLevel?: number;
  priceTarget?: number;
  patternHeight?: number;
  timespan?: number;
}

export interface AnalysisResult {
    success: boolean;
    pattern?: string;
    ticker?: string;
    dateRange?: { from: string; to: string };
    patternData?: PatternData;
    chartData: StockData[];
    patternLines?: PatternLine[];
    message?: string;
}

export interface FormData {
  ticker: string;
  fromDate: string;
  toDate: string;
  patternType: string;
}

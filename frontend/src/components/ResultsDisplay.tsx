import React from 'react';
import { AnalysisResult } from '../types/types';

interface ResultsDisplayProps {
  analysisResult: AnalysisResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ analysisResult }) => {
  if (!analysisResult.success || !analysisResult.patternData || !analysisResult.dateRange || !analysisResult.pattern) {
    return (
      <div className="results-section">
        <div className="no-patterns">
          <h3>Pattern Not Detected</h3>
          <p>{analysisResult.message}</p>
        </div>
      </div>
    );
  }

  const { ticker, dateRange, pattern, patternData } = analysisResult;

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.9) return 'confidence-high';
    if (confidence >= 0.75) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.75) return 'Medium';
    return 'Low';
  };

  return (
    <div className="results-section">
      <div className="stock-info">
        <div>
          <div className="stock-symbol">{ticker}</div>
          <div className="date-range">
            {dateRange.from} to {dateRange.to}
          </div>
        </div>
        <div className="data-points">
          {analysisResult.chartData.length} data points
        </div>
      </div>

      <div className="patterns-info">
        <div className="pattern-card">
          <div className="pattern-header">
            <div className="pattern-type">
              {pattern.replace(/-/g, ' ')}
            </div>
            {patternData.confidence && (
                <div className={`confidence-badge ${getConfidenceClass(patternData.confidence)}`}>
                    {getConfidenceText(patternData.confidence)} ({(patternData.confidence * 100).toFixed(0)}%)
                </div>
            )}
          </div>
          <div className="pattern-details">
            <div className="detail-item">
              <div className="detail-label">Neckline</div>
              <div className="detail-value">${patternData.necklineLevel?.toFixed(2) ?? 'N/A'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Price Target</div>
              <div className="detail-value">${patternData.priceTarget?.toFixed(2) ?? 'N/A'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Pattern Height</div>
              <div className="detail-value">${patternData.patternHeight?.toFixed(2) ?? 'N/A'}</div>
            </div>
             <div className="detail-item">
              <div className="detail-label">Timespan</div>
              <div className="detail-value">{patternData.timespan ?? 'N/A'} days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;

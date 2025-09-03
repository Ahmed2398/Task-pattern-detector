import React, { useState, useEffect } from 'react';
import { FormData } from '../types/types';
import { DEFAULT_FORM_VALUES } from '../config/config';

interface FormProps {
  onAnalyze: (formData: FormData) => void;
  loading: boolean;
}

const Form: React.FC<FormProps> = ({ onAnalyze, loading }) => {
  const [formData, setFormData] = useState<FormData>({
    ticker: DEFAULT_FORM_VALUES.TICKER,
    fromDate: '',
    toDate: '',
    patternType: DEFAULT_FORM_VALUES.PATTERN_TYPE
  });

  useEffect(() => {
    // Set default dates (6 months ago to today)
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setFormData(prev => ({
      ...prev,
      toDate: today.toISOString().split('T')[0],
      fromDate: sixMonthsAgo.toISOString().split('T')[0]
    }));
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'ticker' ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = () => {
    if (!formData.ticker || !formData.fromDate || !formData.toDate) {
      return;
    }
    onAnalyze(formData);
  };

  return (
    <div className="input-section">
      <div className="form-group">
        <label htmlFor="ticker">Stock Ticker</label>
        <input
          type="text"
          id="ticker"
          value={formData.ticker}
          onChange={(e) => handleInputChange('ticker', e.target.value)}
          placeholder="e.g., AAPL, MSFT, GOOGL"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fromDate">From Date</label>
          <input
            type="date"
            id="fromDate"
            value={formData.fromDate}
            onChange={(e) => handleInputChange('fromDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="toDate">To Date</label>
          <input
            type="date"
            id="toDate"
            value={formData.toDate}
            onChange={(e) => handleInputChange('toDate', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="patternType">Pattern Type</label>
        <select
          id="patternType"
          value={formData.patternType}
          onChange={(e) => handleInputChange('patternType', e.target.value)}
        >
          <option value="head-and-shoulders">Head and Shoulders</option>
          <option value="inverse-head-and-shoulders">Inverse Head and Shoulders</option>
          <option value="double-top">Double Top</option>
          <option value="triple-bottom">Triple Bottom</option>
        </select>
      </div>

      <div className="button-group">
        <button
          className="analyze-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Detect Pattern'}
        </button>
      </div>
    </div>
  );
};

export default Form;

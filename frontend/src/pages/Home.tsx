import React, { useState } from 'react';
import Form from '../components/Form';
import Chart from '../components/Chart';
import ResultsDisplay from '../components/ResultsDisplay';
import { AnalysisResult, FormData } from '../types/types';
import { apiService } from '../services/apiService';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (formData: FormData) => {
    if (!formData.ticker || !formData.fromDate || !formData.toDate) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      const result = await apiService.analyzePattern(formData);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="container">
      <header className="header">
        <h1>📈 Stock Pattern Detection</h1>
        <p>Advanced technical analysis with pattern recognition</p>
      </header>

      <div className="main">
        <Form 
          onAnalyze={handleAnalyze}
          loading={loading}
        />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {analysisResult && (
          <>
            <ResultsDisplay analysisResult={analysisResult} />
            <Chart chartData={analysisResult.chartData} patternLines={analysisResult.patternLines || []} />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;

import axios from 'axios';
import { API_CONFIG } from '../config/config';
import { AnalysisResult, FormData } from '../types/types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  async analyzePattern(formData: FormData): Promise<AnalysisResult> {
    try {
      const response = await axios.get(`${this.baseURL}${API_CONFIG.ENDPOINTS.ANALYZE}`, {
        params: {
          ticker: formData.ticker,
          fromDate: formData.fromDate,
          toDate: formData.toDate,
          patternType: formData.patternType
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Analysis failed: Internal server error');
    }
  }
}

export const apiService = new ApiService();

import axios from 'axios';
import type {
  DepositsResponse, DepositRecord, HealthResponse, MapDepositsResponse,
  ModelMetricsResponse, PredictionRequest, PredictionResponse, SummaryResponse, TrendResponse,
} from '../types/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
});

export const apiClient = {
  health: async () => (await api.get<HealthResponse>('/health')).data,
  summary: async () => (await api.get<SummaryResponse>('/summary')).data,
  deposits: async (params: { state?: string; district?: string; search?: string; page: number; limit: number }) =>
    (await api.get<DepositsResponse>('/deposits', { params })).data,
  deposit: async (id: string) => (await api.get<DepositRecord>(`/deposits/${encodeURIComponent(id)}`)).data,
  trend: async (params: { state?: string; district?: string; deposit_id?: string }) =>
    (await api.get<TrendResponse>('/production/trend', { params })).data,
  mapDeposits: async () => (await api.get<MapDepositsResponse>('/map/deposits')).data,
  modelMetrics: async () => (await api.get<ModelMetricsResponse>('/model/metrics')).data,
  predict: async (payload: PredictionRequest) => (await api.post<PredictionResponse>('/model/predict', payload)).data,
};

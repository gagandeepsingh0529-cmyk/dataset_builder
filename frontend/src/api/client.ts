import axios from 'axios';
import type {
  AssistantChatResponse,
  CandidateZone,
  ChangeDetectionResponse,
  DepositRecord,
  DepositsResponse,
  DrillHole,
  EquipmentIntelligenceResponse,
  FieldVerificationRecord,
  HealthResponse,
  HeatmapZone,
  MapDepositsResponse,
  ModelMetricsResponse,
  ModelPerformanceAuditResponse,
  MoilMine,
  OperationalAlert,
  PredictionRequest,
  PredictionResponse,
  PreprocessingTelemetry,
  PrescriptiveRecommendation,
  ReportDossierResponse,
  ReserveEstimationResponse,
  ProductionForecastResponse,
  SatelliteMetadata,
  SpectralAnalysisResponse,
  SummaryResponse,
  TrendResponse,
  UnregisteredMiningAlert,
  WhatIfSimulationRequest,
  WhatIfSimulationResponse,
} from '../types/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20000,
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

  // Space Technology & Spectral Intelligence
  satelliteMetadata: async (sensor: string = 'sentinel-2') =>
    (await api.get<SatelliteMetadata>('/satellite/metadata', { params: { sensor } })).data,
  runPreprocessing: async (payload: { latitude: number; longitude: number; sensor?: string }) =>
    (await api.post<PreprocessingTelemetry>('/preprocess/run', payload)).data,
  spectralAnalysis: async (params: { latitude: number; longitude: number }) =>
    (await api.get<SpectralAnalysisResponse>('/spectral/analysis', { params })).data,
  prospectivityHeatmap: async () =>
    (await api.get<{ zones: HeatmapZone[] }>('/prospectivity/heatmap')).data,
  candidateZones: async () =>
    (await api.get<{ candidates: CandidateZone[] }>('/candidates/zones')).data,
  changeDetection: async () =>
    (await api.get<ChangeDetectionResponse>('/change-detection')).data,
  unregisteredAlerts: async () =>
    (await api.get<{ alerts: UnregisteredMiningAlert[] }>('/alerts/unregistered')).data,
  fieldVerifications: async () =>
    (await api.get<{ verifications: FieldVerificationRecord[] }>('/field-verification')).data,
  saveFieldVerification: async (payload: Partial<FieldVerificationRecord>) =>
    (await api.post<{ status: string }>('/field-verification', payload)).data,
  assistantChat: async (payload: { query: string; context?: Record<string, unknown> }) =>
    (await api.post<AssistantChatResponse>('/assistant/chat', payload)).data,
  generateReport: async (payload: { zone_id: string }) =>
    (await api.post<ReportDossierResponse>('/reports/generate', payload)).data,

  // MOIL Mining Intelligence & Production Planning Suite
  moilMines: async () => (await api.get<{ mines: MoilMine[] }>('/moil/mines')).data,
  moilDrillholes: async (mine_id?: string) =>
    (await api.get<{ drillholes: DrillHole[] }>('/moil/drillholes', { params: { mine_id } })).data,
  moilReserves: async (mine_id: string = 'moil-balaghat') =>
    (await api.get<ReserveEstimationResponse>('/moil/reserves', { params: { mine_id } })).data,
  moilProductionForecast: async (mine_id: string = 'moil-balaghat') =>
    (await api.get<ProductionForecastResponse>('/moil/production/forecast', { params: { mine_id } })).data,
  moilEquipment: async (mine_id: string = 'moil-balaghat') =>
    (await api.get<EquipmentIntelligenceResponse>('/moil/equipment', { params: { mine_id } })).data,
  moilPrescriptions: async (mine_id: string = 'moil-balaghat') =>
    (await api.get<{ recommendations: PrescriptiveRecommendation[] }>('/moil/prescriptions', { params: { mine_id } })).data,
  moilSimulate: async (payload: WhatIfSimulationRequest) =>
    (await api.post<WhatIfSimulationResponse>('/moil/simulator/run', payload)).data,
  moilAlerts: async () => (await api.get<{ alerts: OperationalAlert[] }>('/moil/alerts')).data,
  moilModelAudit: async () => (await api.get<ModelPerformanceAuditResponse>('/moil/model-audit')).data,
};

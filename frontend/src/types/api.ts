export type Nullable<T> = T | null;

export interface HealthResponse {
  status: string;
  dataset_rows: number;
  inventory_rows?: number;
  dataset_file: string;
  grade_data_status?: string;
}

export interface SummaryResponse {
  total_records: number;
  inventory_records: number;
  raw_records: number;
  training_rows: number;
  real_observations: number;
  synthetic_observations: number;
  states: number;
  districts: number;
  total_annual_production_tonnes: number;
  average_grade_pct: Nullable<number>;
  grade_reporting_status?: string;
  year_range: string[];
  year_basis?: string;
  soil_types?: string[];
  provenance_note?: string;
}

export interface DepositRecord {
  State: Nullable<string>;
  District: Nullable<string>;
  Deposit_ID: Nullable<string>;
  Latitude: Nullable<number>;
  Longitude: Nullable<number>;
  Reserves_tonnes?: Nullable<number>;
  Annual_Production_tonnes: Nullable<number>;
  Grade_pct?: Nullable<number>;
  Elevation_m?: Nullable<number>;
  Topo_Slope_deg?: Nullable<number>;
  Soil_Type: Nullable<string>;
  Host_Rock?: Nullable<string>;
  Formation?: Nullable<string>;
  Road_Accessibility: Nullable<string>;
  Distance_to_Port_km?: Nullable<number>;
  Year?: Nullable<string>;
  [key: string]: unknown;
}

export interface DepositsResponse {
  items: DepositRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface TrendPoint {
  year: string | number;
  production_tonnes: number;
}

export interface TrendResponse {
  series: TrendPoint[];
}

export interface MapPoint {
  deposit_id: Nullable<string>;
  state: Nullable<string>;
  district: Nullable<string>;
  latitude: number;
  longitude: number;
  production_tonnes: Nullable<number>;
  grade_pct: Nullable<number>;
  soil_type?: string;
  formation?: string;
  elevation_m?: Nullable<number>;
  is_observed?: boolean;
}

export interface MapDepositsResponse {
  points: MapPoint[];
}

export interface ModelMetricsResponse {
  model: string;
  target: string;
  r2: number;
  mae: number;
  rmse: number;
  test_r2?: number;
  test_mae?: number;
  test_rmse?: number;
  training_r2?: number;
  cross_validation_r2_mean?: Nullable<number>;
  real_only_cv_r2_mean?: Nullable<number>;
  total_rows?: number;
  training_rows?: number;
  test_rows?: number;
  real_rows?: number;
  synthetic_rows?: number;
  features?: string[];
  charts: {
    actual_vs_predicted: string;
    feature_importance: string;
  };
}

export interface PredictionRequest {
  Latitude: number;
  Longitude: number;
  State?: string;
  District?: string;
  Elevation_m?: number;
  Topo_Slope_deg?: number;
  Avg_Temperature_C?: number;
  Annual_Precip_mm?: number;
  Rainy_Days?: number;
  Soil_Type?: string;
  Host_Rock?: string;
  Formation?: string;
  Road_Accessibility?: string;
  Distance_to_Port_km?: number;
}

export interface ContributingFactor {
  feature: string;
  value: string;
  impact: 'increased' | 'decreased';
  contribution_tonnes: number;
  reason: string;
}

export interface EnvironmentalContext {
  elevation_m?: Nullable<number>;
  topo_slope_deg?: Nullable<number>;
  avg_temperature_c?: Nullable<number>;
  annual_precip_mm?: Nullable<number>;
  rainy_days?: Nullable<number>;
  weather_available: boolean;
  terrain_available: boolean;
}

export interface AccessibilityContext {
  nearest_port?: Nullable<string>;
  distance_to_port_km?: Nullable<number>;
  road_accessibility?: Nullable<string>;
}

export interface TrainingDataCoverage {
  level: 'High' | 'Moderate' | 'Low';
  score: number;
  distance_to_nearest_mine_km?: Nullable<number>;
  warning?: Nullable<string>;
}

export interface PredictionResponse {
  predicted_annual_production_tonnes: number;
  feasibility_rating: string;
  predicted_grade_pct: Nullable<number>;
  grade_prediction_status: string;
  high_grade_potential_status: string;
  training_data_coverage: TrainingDataCoverage;
  environmental_context?: EnvironmentalContext;
  accessibility_context?: AccessibilityContext;
  hydrated_from_district?: Nullable<string>;
  input_features_used: Record<string, unknown>;
  explanation: {
    top_contributing_factors: ContributingFactor[];
  };
}

export interface AnalyzedLocationCandidate {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
  predicted_tonnes: number;
  feasibility: string;
  coverage_level: 'High' | 'Moderate' | 'Low';
  coverage_score: number;
  distance_to_mine_km?: number;
  elevation_m?: number;
  annual_precip_mm?: number;
}

// ============================================================
// SPACE TECHNOLOGY & SPECTRAL MINERALOGY TYPES
// ============================================================

export interface SatelliteBand {
  band: string;
  name: string;
  wavelength_nm: number;
  resolution_m: number;
}

export interface SatelliteMetadata {
  satellite: string;
  agency: string;
  spatial_resolution: string;
  spectral_bands: number;
  swath_width?: string;
  revisit_time?: string;
  acquisition_date: string;
  cloud_coverage_pct: number;
  processing_level: string;
  available_bands: SatelliteBand[];
}

export interface PreprocessingStage {
  stage: string;
  status: string;
  duration_ms: number;
  detail: string;
}

export interface PreprocessingTelemetry {
  timestamp: string;
  target_coordinates: { latitude: number; longitude: number };
  sensor: string;
  pipeline_stages: PreprocessingStage[];
  data_quality: {
    overall_status: string;
    cloud_cover: string;
    spatial_resolution: string;
    signal_to_noise_ratio: string;
    atmospheric_aod: string;
  };
}

export interface SpectralIndexInfo {
  value: number;
  formula: string;
  interpretation: string;
}

export interface SpectralPoint {
  wavelength: number;
  reflectance: number;
}

export interface SpectralSignatureCurve {
  material: string;
  color: string;
  data: SpectralPoint[];
}

export interface SpectralAnalysisResponse {
  coordinates: { latitude: number; longitude: number };
  indices: {
    manganese_oxide_index: SpectralIndexInfo;
    ferrous_mineral_ratio: SpectralIndexInfo;
    clay_alteration_index: SpectralIndexInfo;
    ndvi: SpectralIndexInfo;
  };
  signatures: SpectralSignatureCurve[];
  band_values: Record<string, number>;
  scientific_disclaimer: string;
}

export interface CandidateZone {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  prospectivity_score: number;
  confidence: 'High' | 'Moderate' | 'Low';
  priority: 'Very High' | 'High' | 'Moderate';
  area_sq_km: number;
  formation: string;
  elevation_m: number;
  slope_deg: number;
  contributing_factors: {
    spectral_similarity: string;
    geological_suitability: string;
    terrain_suitability: string;
    infrastructure_access: string;
  };
  suitability_radar: {
    spectral: number;
    geology: number;
    terrain: number;
    infrastructure: number;
  };
  status: string;
}

export interface HeatmapZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  score: number;
  tier: string;
  color: string;
}

export interface ChangeTimelineItem {
  year: string;
  excavation_index: number;
  vegetation_loss_pct: number;
  active_pit_area_sq_km: number;
  notes: string;
}

export interface ChangeDetectionResponse {
  region: string;
  baseline_year: number;
  timeline: ChangeTimelineItem[];
  total_expansion_pct: string;
  scientific_disclaimer: string;
}

export interface UnregisteredMiningAlert {
  id: string;
  title: string;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  status: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  distance_to_authorized_boundary_m: number;
  nearest_authorized_lease: string;
  detected_change_area_ha: number;
  detection_date: string;
  confidence: string;
  details: string;
}

export interface FieldVerificationRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  latitude: number;
  longitude: number;
  status: 'Verified' | 'Requires Further Investigation' | 'Pending Verification' | 'Rejected';
  geologist: string;
  verification_date: string | null;
  field_notes?: string | null;
  sample_id?: string | null;
  recommendation?: string | null;
}

export interface AssistantChatResponse {
  query: string;
  response: string;
  timestamp: string;
  referenced_zone?: string;
}

export interface ReportDossierResponse {
  report_id: string;
  title: string;
  generated_at: string;
  lead_agency: string;
  target_zone: CandidateZone;
  satellite_telemetry: SatelliteMetadata;
  spectral_indices: SpectralAnalysisResponse;
  historical_change: ChangeDetectionResponse;
  unregistered_alerts: UnregisteredMiningAlert[];
  field_verification?: FieldVerificationRecord | null;
  disclaimer: string;
}

// ============================================================
// MOIL MINING INTELLIGENCE & PRODUCTION PLANNING SCHEMAS
// ============================================================

export interface MoilMine {
  mine_id: string;
  name: string;
  state: string;
  district: string;
  mine_type: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  target_monthly_tonnes: number;
  avg_grade_pct: number;
  status: string;
  formation: string;
  host_rock: string;
  strike_dip: string;
  ore_body_length_m: number;
  depth_level_m: number;
  proven_reserves_mt: number;
  probable_reserves_mt: number;
  potential_reserves_mt: number;
}

export interface DrillHoleLayer {
  from_m: number;
  to_m: number;
  lithology: string;
  mn_pct: number;
  color: string;
}

export interface AssayProfilePoint {
  depth_m: number;
  mn_pct: number;
  fe_pct: number;
}

export interface DrillHole {
  drill_id: string;
  mine_id: string;
  mine_name: string;
  latitude: number;
  longitude: number;
  collar_elevation_m: number;
  total_depth_m: number;
  ore_intercept_from_m: number;
  ore_intercept_to_m: number;
  ore_thickness_m: number;
  avg_mn_grade_pct: number;
  avg_fe_grade_pct: number;
  sio2_pct: number;
  al2o3_pct: number;
  phosphorous_pct: number;
  formation: string;
  model_confidence_pct: number;
  layers: DrillHoleLayer[];
  assay_profile: AssayProfilePoint[];
}

export interface ReserveZone {
  zone_id: string;
  name: string;
  category: string;
  tonnage_mt: number;
  mn_grade_pct: number;
  confidence_pct: number;
  status: string;
}

export interface ReserveEstimationResponse {
  mine_id: string;
  mine_name: string;
  total_estimated_reserve_mt: number;
  proven_reserve_mt: number;
  probable_reserve_mt: number;
  potential_reserve_mt: number;
  avg_predicted_grade_pct: number;
  avg_ore_thickness_m: number;
  model_confidence_pct: number;
  drilling_density_holes: number;
  zones: ReserveZone[];
  indicators: {
    subsurface_drillhole_weight: number;
    geological_structure_strike_weight: number;
    swir_reflectance_weight: number;
    dem_terrain_slope_weight: number;
  };
}

export interface ShortfallCause {
  factor: string;
  contribution_pct: number;
  impact_tonnes: number;
  detail: string;
}

export interface DailyTrajectoryPoint {
  day: string;
  target_tonnes: number;
  predicted_tonnes: number;
  status: 'Actual' | 'Forecast';
}

export interface WeeklyBreakdownPoint {
  week: string;
  target: number;
  actual: number;
  variance: number;
}

export interface ProductionForecastResponse {
  mine_id: string;
  mine_name: string;
  monthly_planned_target_tonnes: number;
  predicted_monthly_production_tonnes: number;
  shortfall_tonnes: number;
  shortfall_percentage: number;
  shortfall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_color: string;
  causes: ShortfallCause[];
  daily_trajectory: DailyTrajectoryPoint[];
  weekly_breakdown: WeeklyBreakdownPoint[];
  environmental_impact: {
    rainfall_forecast_mm: number;
    production_impact_pct: number;
    soil_moisture_index: number;
  };
}

export interface EquipmentUnit {
  id: string;
  type: string;
  make: string;
  location: string;
  availability_pct: number;
  utilization_pct: number;
  downtime_hrs: number;
  health: string;
  health_code: 'GREEN' | 'YELLOW' | 'RED';
  failure_risk_7d_pct: number;
  rul_days: number;
  action: string;
}

export interface EquipmentIntelligenceResponse {
  mine_id: string;
  fleet_size: number;
  overall_availability_pct: number;
  overall_utilization_pct: number;
  total_fleet_downtime_hrs: number;
  critical_health_units: number;
  warning_health_units: number;
  equipment_list: EquipmentUnit[];
}

export interface PrescriptiveRecommendation {
  id: string;
  title: string;
  issue: string;
  action: string;
  expected_production_impact_tonnes: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority_score: number;
  confidence_pct: number;
  time_to_implement: string;
  impact_category: string;
}

export interface WhatIfSimulationRequest {
  mine_id?: string;
  num_excavators?: number;
  num_dumpers?: number;
  equipment_avail_delta_pct?: number;
  working_hours_per_day?: number;
  rainfall_scenario_mm?: number;
  blasting_delay_hrs?: number;
}

export interface WhatIfSimulationResponse {
  mine_id: string;
  planned_target_tonnes: number;
  baseline_predicted_tonnes: number;
  simulated_predicted_tonnes: number;
  simulated_shortfall_tonnes: number;
  recovered_production_tonnes: number;
  simulated_risk_level: string;
  risk_color: string;
  decision_attribution: {
    excavator_contribution: number;
    dumper_contribution: number;
    availability_boost: number;
    working_hours_impact: number;
    rainfall_mitigation_loss: number;
    blasting_delay_loss: number;
  };
}

export interface OperationalAlert {
  id: string;
  mine_id: string;
  mine_name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'POSITIVE';
  category: 'PRODUCTION' | 'EQUIPMENT' | 'WEATHER' | 'GEOLOGICAL';
  title: string;
  message: string;
  timestamp: string;
  action_required: string;
}

export interface ModelPerformanceAuditResponse {
  overall_data_quality_score: number;
  audit_timestamp: string;
  reserve_model_metrics: {
    model_type: string;
    training_boreholes: number;
    r2_score: number;
    rmse_grade_pct: number;
    mae_grade_pct: number;
    roc_auc_ore_boundary: number;
    cross_validation_strategy: string;
  };
  production_forecast_metrics: {
    model_type: string;
    mape_percentage: number;
    rmse_tonnes: number;
    mae_tonnes: number;
    r2_score: number;
  };
  data_quality_breakdown: {
    parameter: string;
    score: number;
    status: string;
  }[];
}


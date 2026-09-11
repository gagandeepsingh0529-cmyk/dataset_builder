import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ChevronRight, Compass, Info, LoaderCircle, MapPin, Play, Plus, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';

export function PredictForm({ soilTypes }: { soilTypes: string[] }) {
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const setPredictionOpen = useFilterStore((state) => state.setPredictionOpen);
  const setPrediction = useFilterStore((state) => state.setPrediction);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const addCandidate = useFilterStore((state) => state.addCandidate);
  const prediction = useFilterStore((state) => state.prediction);
  const predictionOpen = useFilterStore((state) => state.predictionOpen);

  const [form, setForm] = useState({
    lat: '',
    lng: '',
    state: '',
    district: '',
    precipitation: '',
    soil: '',
    slope: '',
    temperature: '',
    elevation: '',
    port: '',
    access: '',
  });

  const mutation = useMutation({
    mutationFn: apiClient.predict,
    onSuccess: (result, variables) => {
      setPrediction(result);
      setPredictionOpen(true);
      addCandidate({
        id: `cand-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        latitude: variables.Latitude,
        longitude: variables.Longitude,
        district: result.hydrated_from_district ?? undefined,
        predicted_tonnes: result.predicted_annual_production_tonnes,
        feasibility: result.feasibility_rating,
        coverage_level: result.training_data_coverage.level,
        coverage_score: result.training_data_coverage.score,
        distance_to_mine_km: result.training_data_coverage.distance_to_nearest_mine_km ?? undefined,
        elevation_m: result.environmental_context?.elevation_m ?? undefined,
        annual_precip_mm: result.environmental_context?.annual_precip_mm ?? undefined,
      });
    },
  });

  const value = (key: keyof typeof form) => form[key];
  const update = (key: keyof typeof form, next: string) =>
    setForm((current) => ({ ...current, [key]: next }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const lat = Number(form.lat || coordinate?.lat);
    const lng = Number(form.lng || coordinate?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setMapCoordinate({ lat, lng });
    mutation.mutate({
      Latitude: lat,
      Longitude: lng,
      State: form.state || undefined,
      District: form.district || undefined,
      Elevation_m: form.elevation ? Number(form.elevation) : undefined,
      Annual_Precip_mm: form.precipitation ? Number(form.precipitation) : undefined,
      Soil_Type: form.soil || undefined,
      Topo_Slope_deg: form.slope ? Number(form.slope) : undefined,
      Avg_Temperature_C: form.temperature ? Number(form.temperature) : undefined,
      Distance_to_Port_km: form.port ? Number(form.port) : undefined,
      Road_Accessibility: form.access || undefined,
    });
  };

  const handleSaveToComparison = () => {
    if (!prediction || !coordinate) return;
    addCandidate({
      id: `cand-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      latitude: coordinate.lat,
      longitude: coordinate.lng,
      district: prediction.hydrated_from_district ?? undefined,
      predicted_tonnes: prediction.predicted_annual_production_tonnes,
      feasibility: prediction.feasibility_rating,
      coverage_level: prediction.training_data_coverage.level,
      coverage_score: prediction.training_data_coverage.score,
      distance_to_mine_km: prediction.training_data_coverage.distance_to_nearest_mine_km ?? undefined,
      elevation_m: prediction.environmental_context?.elevation_m ?? undefined,
      annual_precip_mm: prediction.environmental_context?.annual_precip_mm ?? undefined,
    });
  };

  const activeLat = value('lat') || (coordinate ? coordinate.lat.toFixed(4) : '21.6300');
  const activeLng = value('lng') || (coordinate ? coordinate.lng.toFixed(4) : '85.5800');

  return (
    <form className="predict-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">GEOSPATIAL LOCATION ANALYSIS</p>
          <h3>Analyze Location Potential</h3>
        </div>
        <span className="mode-badge">
          {coordinate ? <Compass size={12} /> : <MapPin size={12} />}
          {coordinate ? 'MAP TARGET LINKED' : 'SAMPLE TARGET'}
        </span>
      </div>

      <div className="field-grid">
        <Field
          label="Latitude (°N)"
          value={activeLat}
          onChange={(next) => update('lat', next)}
          type="number"
          step="any"
        />
        <Field
          label="Longitude (°E)"
          value={activeLng}
          onChange={(next) => update('lng', next)}
          type="number"
          step="any"
        />
        <Field
          label="Elevation (m)"
          value={value('elevation')}
          onChange={(next) => update('elevation', next)}
          type="number"
          placeholder="Auto (Context)"
        />
        <Field
          label="Terrain Slope (°)"
          value={value('slope')}
          onChange={(next) => update('slope', next)}
          type="number"
          step="any"
          placeholder="Auto (Context)"
        />
        <Field
          label="Precipitation (mm)"
          value={value('precipitation')}
          onChange={(next) => update('precipitation', next)}
          type="number"
          placeholder="Auto (Context)"
        />
        <Field
          label="Avg Temp (°C)"
          value={value('temperature')}
          onChange={(next) => update('temperature', next)}
          type="number"
          step="any"
          placeholder="Auto (Context)"
        />
        <Field
          label="Port Dist (km)"
          value={value('port')}
          onChange={(next) => update('port', next)}
          type="number"
          placeholder="Auto (Nearest Port)"
        />
        <label>
          Soil Type
          <select value={value('soil')} onChange={(e) => update('soil', e.target.value)}>
            <option value="">Auto (Geological Context)</option>
            {soilTypes.map((soil) => (
              <option key={soil} value={soil}>
                {soil}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="select-row">
        <label>
          Road Infrastructure
          <select value={form.access} onChange={(e) => update('access', e.target.value)}>
            <option value="">Auto (Nearest District)</option>
            <option value="Good">Good (National/State Highway Access)</option>
            <option value="Moderate">Moderate (Paved District Road)</option>
            <option value="Poor">Poor (Unpaved/Remote Access)</option>
          </select>
        </label>
      </div>

      <button className="primary-button" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />}
        {mutation.isPending ? 'Running Random Forest Engine...' : 'Run Random Forest Feasibility'}
      </button>

      {mutation.isError && (
        <div className="inline-error">
          <AlertCircle size={15} />
          <span>Prediction service error. Check coordinate range and try again.</span>
        </div>
      )}

      {predictionOpen && prediction && (
        <div className="prediction-result panel-inner">
          <div className="pred-header">
            <span className="eyebrow">PREDICTION OUTPUT</span>
            <span className="pred-district">
              Context: {prediction.hydrated_from_district ?? 'India Reference'}
            </span>
          </div>

          <div className="pred-main">
            <strong>
              {prediction.predicted_annual_production_tonnes.toLocaleString('en-IN')}{' '}
              <span className="unit">tonnes / yr</span>
            </strong>
            <span
              className={`feasibility-badge ${
                prediction.feasibility_rating.includes('High')
                  ? 'high'
                  : prediction.feasibility_rating.includes('Moderate')
                  ? 'medium'
                  : 'low'
              }`}
            >
              {prediction.feasibility_rating}
            </span>
          </div>

          <div className="coverage-box">
            <div className="cov-top">
              <span>
                Training Data Coverage:{' '}
                <b className={`cov-tag ${prediction.training_data_coverage.level.toLowerCase()}`}>
                  {prediction.training_data_coverage.level} (
                  {prediction.training_data_coverage.score}/100)
                </b>
              </span>
              {prediction.training_data_coverage.distance_to_nearest_mine_km != null && (
                <small>
                  {prediction.training_data_coverage.distance_to_nearest_mine_km.toFixed(1)} km to
                  nearest training deposit
                </small>
              )}
            </div>
            {prediction.training_data_coverage.warning && (
              <div className="cov-warning">
                <ShieldAlert size={14} />
                <span>{prediction.training_data_coverage.warning}</span>
              </div>
            )}
          </div>

          <div className="grade-limitation-alert">
            <Info size={14} />
            <span>
              <strong>Grade Limitation:</strong> Historical IBM inventory records do not report{' '}
              <code>Grade_pct</code> values. A-Grade threshold is currently unconfigured.
            </span>
          </div>

          <div className="pred-actions">
            <button
              type="button"
              className="ghost-button save-cand-btn"
              onClick={handleSaveToComparison}
            >
              <Plus size={14} /> Add to Location Comparison
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? '—'}
      />
    </label>
  );
}

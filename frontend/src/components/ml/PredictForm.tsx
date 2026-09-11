import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, Play } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';

export function PredictForm({ soilTypes }: { soilTypes: string[] }) {
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const setPredictionOpen = useFilterStore((state) => state.setPredictionOpen);
  const setPrediction = useFilterStore((state) => state.setPrediction);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const predictionOpen = useFilterStore((state) => state.predictionOpen);
  const [form, setForm] = useState({ lat: '', lng: '', state: '', precipitation: '', soil: '', slope: '', temperature: '', port: '', access: '' });
  const mutation = useMutation({ mutationFn: apiClient.predict, onSuccess: (prediction) => { setPrediction(prediction); setPredictionOpen(true); } });
  const value = (key: keyof typeof form) => form[key];
  const update = (key: keyof typeof form, next: string) => setForm((current) => ({ ...current, [key]: next }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const lat = Number(form.lat || coordinate?.lat); const lng = Number(form.lng || coordinate?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setMapCoordinate({ lat, lng });
    mutation.mutate({ Latitude: lat, Longitude: lng, State: form.state || undefined, Annual_Precip_mm: form.precipitation ? Number(form.precipitation) : undefined, Soil_Type: form.soil || undefined, Topo_Slope_deg: form.slope ? Number(form.slope) : undefined, Avg_Temperature_C: form.temperature ? Number(form.temperature) : undefined, Distance_to_Port_km: form.port ? Number(form.port) : undefined, Road_Accessibility: form.access || undefined });
  };

  return <form className="predict-form" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">CUSTOM LOCATION ANALYSIS</p><h3>Run a location analysis</h3></div><span className="mode-badge">{coordinate ? 'MAP LINKED' : 'MANUAL'}</span></div><div className="field-grid"><Field label="Latitude" value={value('lat') || (coordinate?.lat.toFixed(4) ?? '')} onChange={(next) => update('lat', next)} type="number" step="any" /><Field label="Longitude" value={value('lng') || (coordinate?.lng.toFixed(4) ?? '')} onChange={(next) => update('lng', next)} type="number" step="any" /><Field label="State" value={value('state')} onChange={(next) => update('state', next)} /><Field label="Slope (deg)" value={value('slope')} onChange={(next) => update('slope', next)} type="number" step="any" /><Field label="Precipitation (mm)" value={value('precipitation')} onChange={(next) => update('precipitation', next)} type="number" /><Field label="Temperature (°C)" value={value('temperature')} onChange={(next) => update('temperature', next)} type="number" /><Field label="Port distance (km)" value={value('port')} onChange={(next) => update('port', next)} type="number" /><label>Soil type<select value={value('soil')} onChange={(event) => update('soil', event.target.value)}><option value="">Use nearest district</option>{soilTypes.map((soil) => <option key={soil}>{soil}</option>)}</select></label></div><div className="select-row"><label>Road access<select value={form.access} onChange={(event) => update('access', event.target.value)}><option value="">Use nearest district</option><option>Good</option><option>Moderate</option><option>Poor</option></select></label></div><button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />} Run feasibility analysis</button>{mutation.isError && <div className="inline-error">Prediction service unavailable. Check the model service and try again.</div>}{predictionOpen && mutation.data && <div className="prediction-result"><span className="eyebrow">MODEL PREDICTION</span><strong>{mutation.data.predicted_annual_production_tonnes.toLocaleString('en-IN')} tonnes / year</strong><b className={mutation.data.feasibility_rating.includes('High') ? 'high' : mutation.data.feasibility_rating.includes('Moderate') ? 'medium' : 'low'}>{mutation.data.feasibility_rating}</b><small>Training coverage: {mutation.data.training_data_coverage?.level ?? 'Not assessed'}</small>{mutation.data.training_data_coverage?.warning && <small className="coverage-warning">{mutation.data.training_data_coverage.warning}</small>}</div>}</form>;
}

function Field({ label, value, onChange, type = 'text', step }: { label: string; value: string; onChange: (value: string) => void; type?: string; step?: string }) {
  return <label>{label}<input type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder="—" /></label>;
}

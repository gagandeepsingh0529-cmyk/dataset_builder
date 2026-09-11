import { ArrowUpDown, Compass, MapPin, Trash2 } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const PRESETS = [
  { name: 'Barbil / Joda Belt (Odisha)', lat: 21.63, lng: 85.58, desc: 'Major High-Grade Mn Hub' },
  { name: 'Bharveli Mine Region (MP)', lat: 21.81, lng: 80.18, desc: 'Asia\'s Largest Underground Mn Mine' },
  { name: 'Dongri Buzurg / MOIL (Maharashtra)', lat: 21.16, lng: 79.65, desc: 'Dioxide & High-Grade Deposit' },
  { name: 'Sandur Schist Belt (Karnataka)', lat: 15.14, lng: 76.92, desc: 'Historical Southern Producing Belt' },
  { name: 'Garividi Complex (Andhra Pradesh)', lat: 18.11, lng: 83.40, desc: 'Eastern Ghats Metamorphic Suite' },
];

export function LocationComparison() {
  const candidates = useFilterStore((state) => state.candidates);
  const removeCandidate = useFilterStore((state) => state.removeCandidate);
  const clearCandidates = useFilterStore((state) => state.clearCandidates);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const setPrediction = useFilterStore((state) => state.setPrediction);
  const setPredictionOpen = useFilterStore((state) => state.setPredictionOpen);
  const addCandidate = useFilterStore((state) => state.addCandidate);

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

  const handleTestPreset = (lat: number, lng: number) => {
    setMapCoordinate({ lat, lng });
    mutation.mutate({ Latitude: lat, Longitude: lng });
  };

  const sortedCandidates = [...candidates].sort((a, b) => b.predicted_tonnes - a.predicted_tonnes);

  return (
    <div className="comparison-section panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DECISION SUPPORT & EXPLORATION RANKING</p>
          <h2>Candidate Location Comparison ({candidates.length})</h2>
        </div>
        {candidates.length > 0 && (
          <button className="ghost-button" onClick={clearCandidates}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="empty-comparison">
          <Compass size={28} className="muted-icon" />
          <strong>No candidate locations analyzed yet.</strong>
          <p>
            Click anywhere on the map or select a preset exploration belt below to simulate and rank
            targets:
          </p>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="preset-card"
                onClick={() => handleTestPreset(preset.lat, preset.lng)}
                disabled={mutation.isPending}
              >
                <div className="preset-head">
                  <MapPin size={14} />
                  <strong>{preset.name}</strong>
                </div>
                <small>{preset.desc}</small>
                <span className="coords">
                  {preset.lat.toFixed(2)}°N, {preset.lng.toFixed(2)}°E
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Coordinates</th>
                  <th>Resolved District</th>
                  <th>
                    <span className="th-sort">
                      Predicted Feasibility <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>Rating</th>
                  <th>Data Coverage</th>
                  <th>Dist to Mine</th>
                  <th>Elevation</th>
                  <th>Precipitation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.map((cand, idx) => (
                  <tr key={cand.id}>
                    <td className="rank-num">#{idx + 1}</td>
                    <td className="mono">
                      {cand.latitude.toFixed(3)}°, {cand.longitude.toFixed(3)}°
                    </td>
                    <td>{cand.district ?? '—'}</td>
                    <td className="tonnes-cell">
                      <strong>{cand.predicted_tonnes.toLocaleString('en-IN')}</strong> t/yr
                    </td>
                    <td>
                      <span
                        className={`rating-pill ${
                          cand.feasibility.includes('High')
                            ? 'high'
                            : cand.feasibility.includes('Moderate')
                            ? 'medium'
                            : 'low'
                        }`}
                      >
                        {cand.feasibility}
                      </span>
                    </td>
                    <td>
                      <span className={`cov-badge ${cand.coverage_level.toLowerCase()}`}>
                        {cand.coverage_level} ({cand.coverage_score}%)
                      </span>
                    </td>
                    <td>{cand.distance_to_mine_km != null ? `${cand.distance_to_mine_km.toFixed(1)} km` : '—'}</td>
                    <td>{cand.elevation_m != null ? `${cand.elevation_m} m` : '—'}</td>
                    <td>{cand.annual_precip_mm != null ? `${cand.annual_precip_mm} mm` : '—'}</td>
                    <td>
                      <button
                        className="icon-btn-delete"
                        onClick={() => removeCandidate(cand.id)}
                        title="Remove candidate"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="add-more-presets">
            <span>Simulate additional mineral belts:</span>
            <div className="preset-pills">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="preset-pill"
                  onClick={() => handleTestPreset(p.lat, p.lng)}
                  disabled={mutation.isPending}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

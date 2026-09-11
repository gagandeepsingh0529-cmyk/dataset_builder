import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Compass,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import type { CandidateZone } from '../../types/api';
import { LoadingBlock } from '../ui/AsyncState';

export function CandidateZonesList() {
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const setActiveTab = useFilterStore((state) => state.setActiveTab);
  const setSelectedCandidateZone = useFilterStore((state) => state.setSelectedCandidateZone);
  const setReportModalOpen = useFilterStore((state) => state.setReportModalOpen);

  const candidateQuery = useQuery({
    queryKey: ['candidate-zones'],
    queryFn: apiClient.candidateZones,
  });

  if (candidateQuery.isLoading) return <LoadingBlock />;

  const handleInspect = (zone: CandidateZone) => {
    setSelectedCandidateZone(zone);
    setMapCoordinate({ lat: zone.latitude, lng: zone.longitude });
    setActiveTab('spectral');
  };

  const handleLocate = (zone: CandidateZone) => {
    setMapCoordinate({ lat: zone.latitude, lng: zone.longitude });
    setActiveTab('workbench');
  };

  const handleReport = (zoneId: string) => {
    setReportModalOpen(true, zoneId);
  };

  return (
    <div className="candidate-zones-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AUTOMATED TARGET DETECTION & MULTI-CRITERIA PRIORITIZATION</p>
          <h2>Prioritized Candidate Exploration Zones (#01 — #05)</h2>
        </div>
        <span className="live-tag">
          <Zap size={13} /> AI PRIORITIZATION
        </span>
      </div>

      <div className="candidate-cards-grid">
        {candidateQuery.data?.candidates.map((cand, idx) => (
          <div className="candidate-card" key={cand.id}>
            <div className="cand-header">
              <div className="cand-title-block">
                <span className="cand-id-badge">#{idx + 1} {cand.id}</span>
                <strong>{cand.name}</strong>
                <span className="cand-region">{cand.region}</span>
              </div>
              <div className="cand-score-box">
                <span className="cand-score-val">{cand.prospectivity_score}%</span>
                <small>PROSPECTIVITY</small>
                <span className={`cand-pri-tag ${cand.priority.toLowerCase().replace(/\s+/g, '-')}`}>
                  {cand.priority}
                </span>
              </div>
            </div>

            <div className="cand-specs-row">
              <span>Target Area: <b>{cand.area_sq_km} km²</b></span>
              <span>Elevation: <b>{cand.elevation_m} m</b></span>
              <span>Slope: <b>{cand.slope_deg}°</b></span>
              <span>Confidence: <b>{cand.confidence}</b></span>
            </div>

            <p className="cand-formation-desc">
              <b>Geological Stratigraphy:</b> {cand.formation}
            </p>

            <div className="cand-factors-box">
              <div className="factor-row">
                <span>Spectral Suitability:</span>
                <b>{cand.contributing_factors.spectral_similarity}</b>
              </div>
              <div className="factor-row">
                <span>Geological Contact:</span>
                <b>{cand.contributing_factors.geological_suitability}</b>
              </div>
              <div className="factor-row">
                <span>Terrain Access:</span>
                <b>{cand.contributing_factors.terrain_suitability}</b>
              </div>
              <div className="factor-row">
                <span>Infrastructure:</span>
                <b>{cand.contributing_factors.infrastructure_access}</b>
              </div>
            </div>

            <div className="cand-actions-row">
              <button className="ghost-button cand-btn" onClick={() => handleLocate(cand)}>
                <MapPin size={13} /> View on Map
              </button>
              <button className="ghost-button cand-btn" onClick={() => handleInspect(cand)}>
                <Activity size={13} /> Spectral Analysis
              </button>
              <button className="primary-button cand-btn-report" onClick={() => handleReport(cand.id)}>
                <FileText size={13} /> Exploration Dossier
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

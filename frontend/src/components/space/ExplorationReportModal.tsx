import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  MapPin,
  Printer,
  Satellite,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingBlock } from '../ui/AsyncState';

export function ExplorationReportModal({
  onClose,
  initialZoneId = 'CZ-01',
}: {
  onClose: () => void;
  initialZoneId?: string;
}) {
  const [zoneId, setZoneId] = useState(initialZoneId);

  const candidateZones = useQuery({
    queryKey: ['candidate-zones'],
    queryFn: apiClient.candidateZones,
  });

  const reportMutation = useMutation({
    mutationFn: (id: string) => apiClient.generateReport({ zone_id: id }),
  });

  const handleGenerate = (id: string) => {
    setZoneId(id);
    reportMutation.mutate(id);
  };

  // Generate on mount or zone change
  useEffect(() => {
    reportMutation.mutate(initialZoneId);
  }, [initialZoneId]);

  const report = reportMutation.data;

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-header-title">
            <FileText size={20} className="report-icon" />
            <div>
              <strong>NATIONAL MINERAL EXPLORATION DOSSIER</strong>
              <span>MANGAN-AI Geospatial Intelligence Executive Report</span>
            </div>
          </div>

          <div className="report-header-actions">
            <button className="ghost-button print-btn" onClick={() => window.print()}>
              <Printer size={15} /> Print / Export PDF
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="report-zone-selector">
          <span>Select Target Zone:</span>
          <div className="report-pills">
            {candidateZones.data?.candidates.map((c) => (
              <button
                key={c.id}
                className={`report-pill ${zoneId === c.id ? 'active' : ''}`}
                onClick={() => handleGenerate(c.id)}
              >
                {c.id} — {c.name} ({c.prospectivity_score}%)
              </button>
            ))}
          </div>
        </div>

        {reportMutation.isPending ? (
          <div className="report-loading">
            <LoaderCircle className="spin" size={24} />
            <span>Compiling multispectral telemetry, AI attribution, and field logs...</span>
          </div>
        ) : report ? (
          <div className="report-body printable-area">
            <div className="dossier-meta-banner">
              <div className="meta-block">
                <span>Dossier ID:</span>
                <strong>{report.report_id}</strong>
              </div>
              <div className="meta-block">
                <span>Target Region:</span>
                <strong>{report.target_zone.name} ({report.target_zone.region})</strong>
              </div>
              <div className="meta-block">
                <span>Timestamp:</span>
                <strong>{new Date(report.generated_at).toLocaleString()}</strong>
              </div>
              <div className="meta-block">
                <span>Lead Authority:</span>
                <strong>{report.lead_agency}</strong>
              </div>
            </div>

            <div className="dossier-score-hero">
              <div className="score-main">
                <span className="hero-lbl">AI MANGANESE PROSPECTIVITY SCORE</span>
                <strong className="score-val">{report.target_zone.prospectivity_score}%</strong>
                <span className="score-pill high">PRIORITY: {report.target_zone.priority.toUpperCase()}</span>
              </div>
              <div className="score-details">
                <p>
                  Target area demonstrates exceptionally high multispectral SWIR absorption consistency,
                  favorable lithological contact within the <b>{report.target_zone.formation}</b>, and robust
                  road/port proximity.
                </p>
                <div className="score-specs">
                  <span>Coordinates: <b>{report.target_zone.latitude.toFixed(4)}°N, {report.target_zone.longitude.toFixed(4)}°E</b></span>
                  <span>Target Footprint: <b>{report.target_zone.area_sq_km} km²</b></span>
                  <span>Elevation / Slope: <b>{report.target_zone.elevation_m}m / {report.target_zone.slope_deg}°</b></span>
                </div>
              </div>
            </div>

            <div className="dossier-grid-2">
              <div className="dossier-card">
                <div className="card-title">
                  <Satellite size={15} /> Satellite Space Telemetry
                </div>
                <div className="dossier-rows">
                  <div className="d-row"><span>Constellation:</span><b>{report.satellite_telemetry.satellite}</b></div>
                  <div className="d-row"><span>Sensor Resolution:</span><b>{report.satellite_telemetry.spatial_resolution}</b></div>
                  <div className="d-row"><span>Cloud Coverage:</span><b>{report.satellite_telemetry.cloud_coverage_pct}%</b></div>
                  <div className="d-row"><span>Atmospheric Level:</span><b>{report.satellite_telemetry.processing_level}</b></div>
                </div>
              </div>

              <div className="dossier-card">
                <div className="card-title">
                  <Activity size={15} /> Multispectral Mineral Indices
                </div>
                <div className="dossier-rows">
                  <div className="d-row">
                    <span>Manganese Oxide Ratio (B11/B12):</span>
                    <b>{report.spectral_indices.indices.manganese_oxide_index.value} (Diagnostic Peak)</b>
                  </div>
                  <div className="d-row">
                    <span>Ferrous Mineral Index (B11/B08):</span>
                    <b>{report.spectral_indices.indices.ferrous_mineral_ratio.value}</b>
                  </div>
                  <div className="d-row">
                    <span>Vegetation Canopy Index (NDVI):</span>
                    <b>{report.spectral_indices.indices.ndvi.value} (Sparse Cover)</b>
                  </div>
                </div>
              </div>
            </div>

            {report.field_verification && (
              <div className="dossier-card ver-dossier-card">
                <div className="card-title">
                  <CheckCircle2 size={15} /> Geological Field Verification Audit Trail
                </div>
                <div className="dossier-rows">
                  <div className="d-row"><span>Verification Status:</span><b className="ver-status">{report.field_verification.status}</b></div>
                  <div className="d-row"><span>Geologist / Lead:</span><b>{report.field_verification.geologist}</b></div>
                  <div className="d-row"><span>Assay Reference Sample:</span><b>{report.field_verification.sample_id}</b></div>
                  <div className="d-row"><span>Field Notes:</span><p>{report.field_verification.field_notes}</p></div>
                  <div className="d-row"><span>Recommended Action:</span><b>{report.field_verification.recommendation}</b></div>
                </div>
              </div>
            )}

            <div className="dossier-disclaimer">
              <ShieldAlert size={15} />
              <span>
                <strong>Statutory Exploration Disclaimer:</strong> {report.disclaimer}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

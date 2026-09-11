import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  CloudRain,
  Database,
  Layers,
  LoaderCircle,
  Play,
  Satellite,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';

export function SatellitePipeline() {
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const [selectedSensor, setSelectedSensor] = useState('sentinel-2');

  const lat = coordinate?.lat ?? 21.63;
  const lng = coordinate?.lng ?? 85.58;

  const metadata = useQuery({
    queryKey: ['satellite-metadata', selectedSensor],
    queryFn: () => apiClient.satelliteMetadata(selectedSensor),
  });

  const pipelineMutation = useMutation({
    mutationFn: () => apiClient.runPreprocessing({ latitude: lat, longitude: lng, sensor: selectedSensor }),
  });

  return (
    <div className="satellite-pipeline-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SPACE TECHNOLOGY & MULTISPECTRAL SENSING</p>
          <h2>Satellite Data Ingestion & Preprocessing</h2>
        </div>
        <span className="live-tag">
          <Satellite size={13} /> SATELLITE PIPELINE
        </span>
      </div>

      <div className="sensor-selector-row">
        <span className="selector-label">Active Constellation:</span>
        <div className="sensor-pills">
          <button
            className={`sensor-pill ${selectedSensor === 'sentinel-2' ? 'active' : ''}`}
            onClick={() => setSelectedSensor('sentinel-2')}
          >
            Sentinel-2B MSI (10m)
          </button>
          <button
            className={`sensor-pill ${selectedSensor === 'landsat-9' ? 'active' : ''}`}
            onClick={() => setSelectedSensor('landsat-9')}
          >
            Landsat-9 OLI-2 (30m)
          </button>
          <button
            className={`sensor-pill ${selectedSensor === 'bhuvan-isro' ? 'active' : ''}`}
            onClick={() => setSelectedSensor('bhuvan-isro')}
          >
            ISRO ResourceSat-2A (5.8m)
          </button>
        </div>
      </div>

      {metadata.data && (
        <div className="satellite-meta-grid">
          <div className="meta-card">
            <span className="meta-lbl">Operating Agency</span>
            <strong>{metadata.data.agency}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-lbl">Spatial Resolution</span>
            <strong>{metadata.data.spatial_resolution}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-lbl">Acquisition Date</span>
            <strong>{metadata.data.acquisition_date}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-lbl">Cloud Coverage</span>
            <strong className="cloud-pct">
              <CloudRain size={13} /> {metadata.data.cloud_coverage_pct}%
            </strong>
          </div>
          <div className="meta-card">
            <span className="meta-lbl">Processing Level</span>
            <strong>{metadata.data.processing_level}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-lbl">Spectral Channels</span>
            <strong>{metadata.data.available_bands.length} Active Bands</strong>
          </div>
        </div>
      )}

      <div className="band-chips-section">
        <span className="section-subhead">Ingested Spectral Bands:</span>
        <div className="band-chips-grid">
          {metadata.data?.available_bands.map((b) => (
            <div className="band-chip" key={b.band}>
              <span className="band-code">{b.band}</span>
              <div className="band-info">
                <strong>{b.name}</strong>
                <small>
                  {b.wavelength_nm} nm · {b.resolution_m}m
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pipeline-action-box">
        <div className="pipeline-coords">
          <span>Target Area of Interest (AOI):</span>
          <strong>
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </strong>
        </div>
        <button
          className="primary-button run-pipe-btn"
          onClick={() => pipelineMutation.mutate()}
          disabled={pipelineMutation.isPending}
        >
          {pipelineMutation.isPending ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Play size={16} />
          )}
          {pipelineMutation.isPending
            ? 'Processing Multi-Stage Optical Telemetry...'
            : 'Execute Optical Preprocessing Pipeline'}
        </button>
      </div>

      {pipelineMutation.data && (
        <div className="pipeline-telemetry-result">
          <div className="telemetry-header">
            <span className="eyebrow">PREPROCESSING TELEMETRY REPORT</span>
            <span className="quality-pill">
              <ShieldCheck size={13} /> Data Quality:{' '}
              {pipelineMutation.data.data_quality.overall_status}
            </span>
          </div>

          <div className="pipeline-steps-timeline">
            {pipelineMutation.data.pipeline_stages.map((st, i) => (
              <div className="stage-item" key={st.stage}>
                <div className="stage-num">
                  <CheckCircle2 size={16} className="done-icon" />
                </div>
                <div className="stage-content">
                  <div className="stage-title-row">
                    <strong>{st.stage}</strong>
                    <span className="stage-time">{st.duration_ms} ms</span>
                  </div>
                  <p>{st.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="quality-metrics-row">
            <span>
              <b>Cloud Mask:</b> {pipelineMutation.data.data_quality.cloud_cover}
            </span>
            <span>
              <b>AOD Index:</b> {pipelineMutation.data.data_quality.atmospheric_aod}
            </span>
            <span>
              <b>SNR:</b> {pipelineMutation.data.data_quality.signal_to_noise_ratio}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CheckCircle2,
  Database,
  FileCheck,
  Layers,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

interface ModelAuditModalProps {
  onClose: () => void;
}

export function ModelAuditModal({ onClose }: ModelAuditModalProps) {
  const auditQuery = useQuery({ queryKey: ['moil-model-audit'], queryFn: apiClient.moilModelAudit });
  const audit = auditQuery.data;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content-dossier"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', padding: '24px' }}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-main)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent-emerald)' }} />
              <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-main)' }}>
                MOIL AI Model Performance & Data Quality Audit
              </h3>
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Statistical validation against JORC/UNFC drilling standards & ERP production records
            </small>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {auditQuery.isLoading ? (
          <LoadingBlock />
        ) : auditQuery.isError || !audit ? (
          <ErrorState message="Could not load model audit metrics." />
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* OVERALL DATA QUALITY SCORE */}
            <div
              className="pipeline-step-box"
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                borderColor: 'var(--accent-emerald)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
                  Enterprise Data Quality Score: {audit.overall_data_quality_score}%
                </strong>
                <small style={{ color: 'var(--text-muted)' }}>
                  Assessed across collar surveys, geochemical assays, telemetry logs & weather rasters
                </small>
              </div>
              <span className="badge-emerald" style={{ fontSize: '13px', padding: '6px 12px' }}>
                <CheckCircle2 size={15} /> JORC / UNFC CERTIFIED
              </span>
            </div>

            {/* TWO METRICS SECTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* SECTION 1: RESERVE KRIGING MODEL */}
              <div className="pipeline-step-box" style={{ padding: '14px', display: 'grid', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--accent-gold)' }}>
                  Reserve Mineralization Model
                </strong>
                <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Model Type:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{audit.reserve_model_metrics.model_type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>R² Fit Score:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{audit.reserve_model_metrics.r2_score}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>RMSE Grade Error:</span>
                    <strong style={{ color: 'var(--text-main)' }}>&plusmn;{audit.reserve_model_metrics.rmse_grade_pct}% Mn</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ROC-AUC Boundary:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{audit.reserve_model_metrics.roc_auc_ore_boundary}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRODUCTION FORECASTING MODEL */}
              <div className="pipeline-step-box" style={{ padding: '14px', display: 'grid', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#60a5fa' }}>
                  Production Forecasting Model
                </strong>
                <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Model Type:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{audit.production_forecast_metrics.model_type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MAPE Error Rate:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{audit.production_forecast_metrics.mape_percentage}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>RMSE Output:</span>
                    <strong style={{ color: 'var(--text-main)' }}>&plusmn;{audit.production_forecast_metrics.rmse_tonnes} Tonnes</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>R² Production Fit:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{audit.production_forecast_metrics.r2_score}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* DATA QUALITY BREAKDOWN TABLE */}
            <div>
              <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Data Quality Ingestion Audit Breakdown
              </strong>
              <div style={{ display: 'grid', gap: '6px' }}>
                {audit.data_quality_breakdown.map((item: { parameter: string; status: string; score: number }, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-panel-inner)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <span><strong>{item.parameter}</strong> &bull; {item.status}</span>
                    <span className="badge-emerald">{item.score}% Valid</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

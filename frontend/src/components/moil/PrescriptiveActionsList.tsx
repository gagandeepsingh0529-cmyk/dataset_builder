import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  HelpCircle,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

const number = new Intl.NumberFormat('en-IN');

export function PrescriptiveActionsList() {
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);
  const setActiveTab = useFilterStore((state) => state.setActiveTab);

  const minesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const recsQuery = useQuery({
    queryKey: ['moil-prescriptions', selectedMoilMineId],
    queryFn: () => apiClient.moilPrescriptions(selectedMoilMineId),
  });

  const mines = minesQuery.data?.mines ?? [];
  const recs = recsQuery.data?.recommendations ?? [];
  const currentMine = mines.find((m) => m.mine_id === selectedMoilMineId) ?? mines[0];

  if (recsQuery.isLoading) return <LoadingBlock />;
  if (recsQuery.isError)
    return <ErrorState message="Could not load MOIL prescriptive recommendations." />;

  const totalPotentialRecovery = recs.reduce((sum, r) => sum + r.expected_production_impact_tonnes, 0);

  return (
    <div className="space-card" style={{ display: 'grid', gap: '20px' }}>
      {/* HEADER & MINE SELECTOR */}
      <div className="panel-heading" style={{ padding: 0 }}>
        <div>
          <p className="eyebrow">PRESCRIPTIVE AI & DECISION SUPPORT</p>
          <h2>Ranked Corrective Recommendations & Production Impact</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedMoilMineId}
            onChange={(e) => setSelectedMoilMineId(e.target.value)}
            style={{
              background: 'var(--bg-panel-inner)',
              border: '1px solid var(--border-main)',
              color: 'var(--text-main)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {mines.map((mine) => (
              <option key={mine.mine_id} value={mine.mine_id}>
                {mine.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY BANNER */}
      <div
        className="pipeline-step-box"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
          borderColor: 'var(--accent-gold)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="badge-gold" style={{ marginBottom: '6px', display: 'inline-block' }}>
            <Sparkles size={12} /> Total Potential Production Recovery
          </span>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>
            Executing these {recs.length} interventions can recover{' '}
            <strong style={{ color: 'var(--accent-gold)' }}>+{number.format(totalPotentialRecovery)} Tonnes/Month</strong>
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Actions ranked by Priority Score = Risk Severity &times; Expected Tonnage Recovery &times; Model Confidence.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setActiveTab('simulator')}
          style={{ width: 'auto', padding: '8px 16px', fontSize: '11px' }}
        >
          <Zap size={14} /> Open What-If Scenario Simulator
        </button>
      </div>

      {/* RECOMMENDATIONS CARDS LIST */}
      <div style={{ display: 'grid', gap: '14px' }}>
        {recs.map((rec) => {
          const isCritical = rec.priority === 'CRITICAL';
          const isHigh = rec.priority === 'HIGH';
          return (
            <div
              key={rec.id}
              className="pipeline-step-box"
              style={{
                padding: '16px',
                borderColor: isCritical ? '#ef4444' : isHigh ? 'var(--accent-gold)' : undefined,
                background: isCritical ? 'rgba(239, 68, 68, 0.03)' : undefined,
                display: 'grid',
                gap: '10px',
              }}
            >
              {/* TOP ROW: TITLE & BADGES */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: isCritical ? '#ef4444' : isHigh ? 'var(--accent-gold)' : 'var(--border-main)',
                      color: isCritical || isHigh ? '#000000' : 'var(--text-main)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '11px',
                    }}
                  >
                    {rec.priority} PRIORITY (Score: {rec.priority_score})
                  </span>
                  <span className="badge-blue">{rec.impact_category}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--accent-emerald)' }}>
                    +{number.format(rec.expected_production_impact_tonnes)} Tonnes / Mo
                  </strong>
                </div>
              </div>

              {/* TITLE & ISSUE */}
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>
                  {rec.id}: {rec.title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: '#f87171' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span><strong>Identified Risk / Bottleneck: </strong>{rec.issue}</span>
                </div>
              </div>

              {/* ACTION TO IMPLEMENT */}
              <div
                style={{
                  background: 'var(--bg-panel)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <CheckCircle size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                  <strong>Prescribed Intervention: </strong>{rec.action}
                </span>
              </div>

              {/* FOOTER INFO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} /> Time to Implement: <strong>{rec.time_to_implement}</strong>
                </span>
                <span>
                  Model Confidence: <strong style={{ color: 'var(--accent-gold)' }}>{rec.confidence_pct}%</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

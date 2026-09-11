import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  Calendar,
  CloudRain,
  Factory,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

const number = new Intl.NumberFormat('en-IN');

export function ProductionForecastView() {
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);
  const setActiveTab = useFilterStore((state) => state.setActiveTab);
  const theme = useFilterStore((state) => state.theme);

  const minesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const forecastQuery = useQuery({
    queryKey: ['moil-forecast', selectedMoilMineId],
    queryFn: () => apiClient.moilProductionForecast(selectedMoilMineId),
  });

  const mines = minesQuery.data?.mines ?? [];
  const forecast = forecastQuery.data;

  if (forecastQuery.isLoading) return <LoadingBlock />;
  if (forecastQuery.isError || !forecast)
    return <ErrorState message="Could not load MOIL production forecast data." />;

  const gridColor = theme === 'light' ? '#e2e8f0' : '#1f2c42';
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="space-card" style={{ display: 'grid', gap: '20px' }}>
      {/* HEADER & MINE SELECTOR */}
      <div className="panel-heading" style={{ padding: 0 }}>
        <div>
          <p className="eyebrow">MODULE B: PRODUCTION FORECASTING & SHORTFALL PREDICTION</p>
          <h2>Operational Production Forecast & Cause Decomposition</h2>
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
                {mine.name} ({mine.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP PRODUCTION & SHORTFALL KPIS */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card">
          <p>MONTHLY PLANNED TARGET</p>
          <strong>{number.format(forecast.monthly_planned_target_tonnes)} T</strong>
          <span>Statutory Production Target</span>
        </div>
        <div className="kpi-card">
          <p>AI PREDICTED OUTPUT</p>
          <strong style={{ color: 'var(--accent-gold)' }}>
            {number.format(forecast.predicted_monthly_production_tonnes)} T
          </strong>
          <span>Multi-factor ML Forecast</span>
        </div>
        <div
          className="kpi-card accent"
          style={{
            borderColor: forecast.risk_color,
            background: 'rgba(239, 68, 68, 0.05)',
          }}
        >
          <p>EXPECTED SHORTFALL</p>
          <strong style={{ color: forecast.risk_color }}>
            -{number.format(forecast.shortfall_tonnes)} T ({forecast.shortfall_percentage}%)
          </strong>
          <span>Gap to monthly target</span>
        </div>
        <div className="kpi-card">
          <p>SHORTFALL RISK LEVEL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span
              style={{
                background: forecast.risk_color,
                color: '#000',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              {forecast.shortfall_risk_level} RISK
            </span>
          </div>
          <span style={{ marginTop: '6px', display: 'block' }}>Requires operational action</span>
        </div>
        <div className="kpi-card">
          <p>WEATHER DISRUPTION RISK</p>
          <strong style={{ color: '#60a5fa' }}>{forecast.environmental_impact.rainfall_forecast_mm} mm</strong>
          <span>Impact: {forecast.environmental_impact.production_impact_pct}% on Pit Haulage</span>
        </div>
      </div>

      {/* SPLIT LAYOUT: PRODUCTION TRAJECTORY & SHORTFALL CAUSES */}
      <div className="split-layout" style={{ margin: 0 }}>
        {/* DAILY PRODUCTION TRAJECTORY CHART */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Daily Production Trajectory (Target vs Actual vs Forecast)
            </strong>
            <span className="badge-gold">Day 01 &ndash; Day 30</span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.daily_trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="predictedTrajectoryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis tick={{ fill: textColor, fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: theme === 'light' ? '#ffffff' : '#0f172a',
                    border: '1px solid var(--border-main)',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                  formatter={(val: number, name: string) => [
                    `${number.format(val)} Tonnes`,
                    name === 'predicted_tonnes' ? 'Output (Actual/Forecast)' : 'Daily Target Baseline',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="predicted_tonnes"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#predictedTrajectoryFill)"
                  name="predicted_tonnes"
                />
                <Area
                  type="monotone"
                  dataKey="target_tonnes"
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="transparent"
                  name="target_tonnes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '3px', background: '#f59e0b', display: 'inline-block' }} />
              Output (Actual + Forecast)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '3px', borderTop: '2px dashed #64748b', display: 'inline-block' }} />
              Target Baseline ({number.format(Math.round(forecast.monthly_planned_target_tonnes / 30))} t/day)
            </span>
          </div>
        </div>

        {/* SHORTFALL DRIVER DECOMPOSITION (HORIZONTAL BAR CHART) */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Predicted Shortfall Driver Breakdown (Why Shortfall Exists)
            </strong>
            <span className="badge-rose">Total Gap: -{number.format(forecast.shortfall_tonnes)} T</span>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {forecast.causes.map((cause: { factor: string; impact_tonnes: number; contribution_pct: number; detail: string }, idx: number) => (
              <div key={idx} className="pipeline-step-box" style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{cause.factor}</strong>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '12px' }}>
                    {cause.contribution_pct}% (-{number.format(cause.impact_tonnes)} T)
                  </span>
                </div>
                {/* PROGRESS BAR */}
                <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden', margin: '6px 0' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${cause.contribution_pct * 2.2}%`,
                      background: idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : '#eab308',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{cause.detail}</small>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
            <button
              className="primary-button"
              onClick={() => setActiveTab('prescriptions')}
              style={{ width: '100%', fontSize: '11px', padding: '9px' }}
            >
              <Sparkles size={14} /> VIEW PRESCRIPTIVE ACTION PLAN (+{number.format(forecast.shortfall_tonnes)} T RECOVERY)
            </button>
          </div>
        </div>
      </div>

      {/* WEEKLY PRODUCTION BREAKDOWN TABLE */}
      <div className="panel" style={{ padding: '16px' }}>
        <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block', marginBottom: '12px' }}>
          Weekly Target vs Production Variance Audit &mdash; {forecast.mine_name}
        </strong>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Production Week</th>
                <th>Target Tonnage</th>
                <th>Actual / Forecast Output</th>
                <th>Variance (Delta)</th>
                <th>Status Indicator</th>
              </tr>
            </thead>
            <tbody>
              {forecast.weekly_breakdown.map((wb: { week: string; target: number; actual: number; variance: number }, idx: number) => (
                <tr key={idx}>
                  <td><strong>{wb.week}</strong></td>
                  <td>{number.format(wb.target)} T</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{number.format(wb.actual)} T</td>
                  <td style={{ color: wb.variance < 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {wb.variance < 0 ? '-' : '+'}{number.format(Math.abs(wb.variance))} T
                  </td>
                  <td>
                    <span className={wb.variance < -500 ? 'badge-rose' : 'badge-emerald'}>
                      {wb.variance < -500 ? 'Shortfall Warning' : 'On Track'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

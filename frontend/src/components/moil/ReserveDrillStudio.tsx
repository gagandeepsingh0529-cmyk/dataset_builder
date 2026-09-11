import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Award,
  BarChart2,
  Compass,
  Database,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';
import type { DrillHoleLayer, ReserveZone } from '../../types/api';

export function ReserveDrillStudio() {
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);
  const theme = useFilterStore((state) => state.theme);

  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);

  const minesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const drillholesQuery = useQuery({
    queryKey: ['moil-drillholes', selectedMoilMineId],
    queryFn: () => apiClient.moilDrillholes(selectedMoilMineId),
  });
  const reservesQuery = useQuery({
    queryKey: ['moil-reserves', selectedMoilMineId],
    queryFn: () => apiClient.moilReserves(selectedMoilMineId),
  });

  const mines = minesQuery.data?.mines ?? [];
  const drillholes = drillholesQuery.data?.drillholes ?? [];
  const reserves = reservesQuery.data;

  const currentMine = mines.find((m) => m.mine_id === selectedMoilMineId) ?? mines[0];
  const activeDrillHole = drillholes.find((dh) => dh.drill_id === selectedDrillId) ?? drillholes[0];

  if (reservesQuery.isLoading || drillholesQuery.isLoading) return <LoadingBlock />;
  if (reservesQuery.isError || drillholesQuery.isError)
    return <ErrorState message="Could not load MOIL drillhole and reserve intelligence." />;

  const gridColor = theme === 'light' ? '#e2e8f0' : '#1f2c42';
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="space-card" style={{ display: 'grid', gap: '20px' }}>
      {/* HEADER & MINE SELECTOR */}
      <div className="panel-heading" style={{ padding: 0 }}>
        <div>
          <p className="eyebrow">MODULE A: AI-BASED MANGANESE RESERVE ESTIMATION</p>
          <h2>Drill-Hole Intelligence & Subsurface Stratigraphy</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="live-tag">
            <Sparkles size={12} /> SPATIAL KRIGING G1/G2/G3
          </span>
          <select
            value={selectedMoilMineId}
            onChange={(e) => {
              setSelectedMoilMineId(e.target.value);
              setSelectedDrillId(null);
            }}
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
                {mine.name} ({mine.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP RESERVE KPIS */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card accent">
          <p>TOTAL ESTIMATED RESERVE</p>
          <strong style={{ color: 'var(--accent-gold)' }}>
            {reserves?.total_estimated_reserve_mt} MT
          </strong>
          <span>UNFC G1+G2+G3 Resource</span>
        </div>
        <div className="kpi-card">
          <p>PROVEN (HIGH CONFIDENCE)</p>
          <strong>{reserves?.proven_reserve_mt} MT</strong>
          <span style={{ color: 'var(--accent-emerald)' }}>G1 Block Confirmed</span>
        </div>
        <div className="kpi-card">
          <p>PROBABLE / POTENTIAL</p>
          <strong>
            {reserves?.probable_reserve_mt} / {reserves?.potential_reserve_mt} MT
          </strong>
          <span>G2 Probable / G3 Target</span>
        </div>
        <div className="kpi-card">
          <p>AVG PREDICTED MN GRADE</p>
          <strong>{reserves?.avg_predicted_grade_pct}% Mn</strong>
          <span>High-Grade Metallurgical</span>
        </div>
        <div className="kpi-card">
          <p>MODEL CONFIDENCE</p>
          <strong>{reserves?.model_confidence_pct}%</strong>
          <span>Spatial Kriging LOCO</span>
        </div>
      </div>

      {/* SPLIT LAYOUT: DRILL-HOLE LIST & STRATIGRAPHY PROFILE */}
      <div className="split-layout" style={{ margin: 0 }}>
        {/* DRILL-HOLES SELECTION LIST */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Exploration Drill-Holes ({drillholes.length} Boreholes)
            </strong>
            <small style={{ color: 'var(--text-dim)' }}>Select borehole to inspect</small>
          </div>

          <div style={{ display: 'grid', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {drillholes.map((dh) => {
              const isSelected = (activeDrillHole?.drill_id === dh.drill_id);
              return (
                <div
                  key={dh.drill_id}
                  onClick={() => setSelectedDrillId(dh.drill_id)}
                  className={`pipeline-step-box ${isSelected ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-gold)' : undefined,
                    background: isSelected ? 'rgba(245, 158, 11, 0.08)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{dh.drill_id}</strong>
                    <span className="badge-gold">{dh.avg_mn_grade_pct}% Mn</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Depth: {dh.total_depth_m}m &bull; Ore: {dh.ore_thickness_m}m</span>
                    <span>Conf: {dh.model_confidence_pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE DRILL-HOLE ASSAY CURVE & STRATIGRAPHY */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeDrillHole ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>
                    {activeDrillHole.drill_id} &mdash; Geochemical Assay & Downhole Curve
                  </h3>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Coords: {activeDrillHole.latitude.toFixed(4)}°N, {activeDrillHole.longitude.toFixed(4)}°E &bull; Collar Elev: {activeDrillHole.collar_elevation_m}m
                  </small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge-emerald" style={{ display: 'inline-block' }}>
                    Intercept: {activeDrillHole.ore_intercept_from_m}m &ndash; {activeDrillHole.ore_intercept_to_m}m
                  </span>
                </div>
              </div>

              {/* ASSAY CHART: DEPTH VS MN % AND FE % */}
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeDrillHole.assay_profile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mnGradeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="feGradeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="depth_m" tick={{ fill: textColor, fontSize: 10 }} unit="m" />
                    <YAxis tick={{ fill: textColor, fontSize: 10 }} unit="%" />
                    <Tooltip
                      contentStyle={{
                        background: theme === 'light' ? '#ffffff' : '#0f172a',
                        border: '1px solid var(--border-main)',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(val: number, name: string) => [
                        `${val}%`,
                        name === 'mn_pct' ? 'Manganese Grade (Mn %)' : 'Iron Grade (Fe %)',
                      ]}
                    />
                    <Area type="monotone" dataKey="mn_pct" stroke="#f59e0b" strokeWidth={2} fill="url(#mnGradeFill)" name="mn_pct" />
                    <Area type="monotone" dataKey="fe_pct" stroke="#60a5fa" strokeWidth={1.5} fill="url(#feGradeFill)" name="fe_pct" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* CORE STRATIGRAPHY COLUMN */}
              <div>
                <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Lithology Stratigraphy Column (Downhole Intercepts)
                </strong>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {activeDrillHole.layers.map((layer: DrillHoleLayer, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: 'var(--bg-panel-inner)',
                        borderLeft: `4px solid ${layer.color}`,
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <span>
                        <strong>{layer.from_m}m &ndash; {layer.to_m}m:</strong> {layer.lithology}
                      </span>
                      <span style={{ color: layer.mn_pct > 20 ? 'var(--accent-gold)' : 'var(--text-dim)', fontWeight: 600 }}>
                        {layer.mn_pct}% Mn
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a drill-hole from the left to inspect stratigraphy.</div>
          )}
        </div>
      </div>

      {/* RESERVE ZONES BREAKDOWN TABLE */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
            Spatial Reserve Zones & UNFC Categorization &mdash; {currentMine.name}
          </strong>
          <span className="badge-blue">Total Formation Length: {currentMine.ore_body_length_m}m</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zone ID</th>
                <th>Exploration Block Name</th>
                <th>UNFC Category</th>
                <th>Estimated Tonnage</th>
                <th>Avg Grade</th>
                <th>Model Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reserves?.zones.map((zone: ReserveZone) => (
                <tr key={zone.zone_id}>
                  <td className="mono">{zone.zone_id}</td>
                  <td><strong>{zone.name}</strong></td>
                  <td><span className="badge-gold">{zone.category}</span></td>
                  <td><strong>{zone.tonnage_mt} MT</strong></td>
                  <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{zone.mn_grade_pct}% Mn</td>
                  <td>{zone.confidence_pct}%</td>
                  <td><span className="badge-emerald">{zone.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

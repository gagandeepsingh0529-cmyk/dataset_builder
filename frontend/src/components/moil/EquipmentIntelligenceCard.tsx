import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  HelpCircle,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';
import type { EquipmentUnit } from '../../types/api';

export function EquipmentIntelligenceCard() {
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);

  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const minesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const equipmentQuery = useQuery({
    queryKey: ['moil-equipment', selectedMoilMineId],
    queryFn: () => apiClient.moilEquipment(selectedMoilMineId),
  });

  const mines = minesQuery.data?.mines ?? [];
  const equipData = equipmentQuery.data;

  if (equipmentQuery.isLoading) return <LoadingBlock />;
  if (equipmentQuery.isError || !equipData)
    return <ErrorState message="Could not load MOIL equipment fleet intelligence." />;

  const filteredUnits = equipData.equipment_list.filter((unit: EquipmentUnit) => {
    if (typeFilter === 'ALL') return true;
    if (typeFilter === 'EXCAVATOR') return unit.id.startsWith('EX');
    if (typeFilter === 'DUMPER') return unit.id.startsWith('DP');
    if (typeFilter === 'DRILL') return unit.id.startsWith('SD');
    if (typeFilter === 'CRUSHER') return unit.id.startsWith('CR');
    if (typeFilter === 'CRITICAL') return unit.health_code === 'RED' || unit.health_code === 'YELLOW';
    return true;
  });

  return (
    <div className="space-card" style={{ display: 'grid', gap: '20px' }}>
      {/* HEADER & MINE SELECTOR */}
      <div className="panel-heading" style={{ padding: 0 }}>
        <div>
          <p className="eyebrow">MODULE C: EQUIPMENT INTELLIGENCE & PREDICTIVE MAINTENANCE</p>
          <h2>Fleet Health, Availability & Remaining Useful Life (RUL)</h2>
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

      {/* TOP FLEET HEALTH KPIS */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card">
          <p>ACTIVE FLEET SIZE</p>
          <strong>{equipData.fleet_size} Units</strong>
          <span>Excavators, Dumpers, Crushers</span>
        </div>
        <div className="kpi-card">
          <p>OVERALL AVAILABILITY</p>
          <strong style={{ color: equipData.overall_availability_pct >= 85 ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}>
            {equipData.overall_availability_pct}%
          </strong>
          <span>Target: &gt;88% Availability</span>
        </div>
        <div className="kpi-card">
          <p>FLEET UTILIZATION</p>
          <strong>{equipData.overall_utilization_pct}%</strong>
          <span>Operating hours / Available</span>
        </div>
        <div className="kpi-card">
          <p>TOTAL DOWNTIME (MONTH)</p>
          <strong style={{ color: equipData.total_fleet_downtime_hrs > 60 ? '#ef4444' : 'var(--text-main)' }}>
            {equipData.total_fleet_downtime_hrs} Hours
          </strong>
          <span>Breakdown & Maintenance</span>
        </div>
        <div className="kpi-card accent" style={{ borderColor: equipData.critical_health_units > 0 ? '#ef4444' : undefined }}>
          <p>PREDICTIVE FAILURE ALERTS</p>
          <strong style={{ color: '#ef4444' }}>
            {equipData.critical_health_units} Critical / {equipData.warning_health_units} Warning
          </strong>
          <span>Requires Immediate Maintenance</span>
        </div>
      </div>

      {/* FILTER TABS FOR FLEET TYPE */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All Fleet (${equipData.equipment_list.length})` },
          { id: 'EXCAVATOR', label: 'Excavators (4)' },
          { id: 'DUMPER', label: 'Heavy Dumpers (6)' },
          { id: 'DRILL', label: 'Blast Drills (2)' },
          { id: 'CRUSHER', label: 'Crushing Plant (2)' },
          { id: 'CRITICAL', label: `High Risk Alarms (${equipData.critical_health_units + equipData.warning_health_units})` },
        ].map((f) => (
          <button
            key={f.id}
            className={`tab-btn ${typeFilter === f.id ? 'active' : ''}`}
            onClick={() => setTypeFilter(f.id)}
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* EQUIPMENT CARDS GRID */}
      <div className="candidates-grid" style={{ marginTop: 0 }}>
        {filteredUnits.map((unit: EquipmentUnit) => {
          const isRed = unit.health_code === 'RED';
          const isYellow = unit.health_code === 'YELLOW';
          return (
            <div
              key={unit.id}
              className="candidate-card"
              style={{
                borderColor: isRed ? '#ef4444' : isYellow ? '#eab308' : undefined,
                background: isRed ? 'rgba(239, 68, 68, 0.04)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{unit.id}</strong>
                    <span className={isRed ? 'badge-rose' : isYellow ? 'badge-gold' : 'badge-emerald'}>
                      {unit.health}
                    </span>
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                    {unit.type} &bull; {unit.make}
                  </small>
                </div>
                <span className="badge-blue">{unit.location}</span>
              </div>

              {/* TELEMETRY METRICS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Availability</small>
                  <strong style={{ fontSize: '13px', color: unit.availability_pct < 75 ? '#ef4444' : 'var(--text-main)' }}>
                    {unit.availability_pct}%
                  </strong>
                </div>
                <div>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Utilization</small>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{unit.utilization_pct}%</strong>
                </div>
                <div>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Downtime</small>
                  <strong style={{ fontSize: '13px', color: unit.downtime_hrs > 20 ? '#ef4444' : 'var(--text-muted)' }}>
                    {unit.downtime_hrs}h
                  </strong>
                </div>
              </div>

              {/* PREDICTIVE MAINTENANCE / RUL */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  7-Day Failure Risk: <strong style={{ color: isRed ? '#ef4444' : isYellow ? '#eab308' : 'var(--accent-emerald)' }}>{unit.failure_risk_7d_pct}%</strong>
                </span>
                <span style={{ color: 'var(--text-dim)' }}>
                  RUL: <strong>{unit.rul_days} Days</strong>
                </span>
              </div>

              {/* ACTION RECOMMENDED */}
              <div style={{ background: 'var(--bg-panel)', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <Wrench size={13} style={{ color: isRed ? '#ef4444' : 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: 'var(--text-muted)', lineHeight: '1.3' }}>{unit.action}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

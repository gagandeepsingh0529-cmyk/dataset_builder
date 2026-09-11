import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CloudRain,
  Compass,
  Flame,
  Gauge,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

const number = new Intl.NumberFormat('en-IN');

export function WhatIfSimulator() {
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);

  // Simulation Sliders State
  const [numExcavators, setNumExcavators] = useState<number>(4);
  const [numDumpers, setNumDumpers] = useState<number>(8);
  const [availDelta, setAvailDelta] = useState<number>(5.0);
  const [workingHours, setWorkingHours] = useState<number>(18.0);
  const [rainfallMm, setRainfallMm] = useState<number>(20.0);
  const [blastingDelayHrs, setBlastingDelayHrs] = useState<number>(0.0);

  const minesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const mines = minesQuery.data?.mines ?? [];
  const currentMine = mines.find((m) => m.mine_id === selectedMoilMineId) ?? mines[0];

  const simMutation = useMutation({
    mutationFn: apiClient.moilSimulate,
  });

  // Run initial or updated simulation
  const simResult = simMutation.data;

  const handleRunSimulation = () => {
    simMutation.mutate({
      mine_id: selectedMoilMineId,
      num_excavators: numExcavators,
      num_dumpers: numDumpers,
      equipment_avail_delta_pct: availDelta,
      working_hours_per_day: workingHours,
      rainfall_scenario_mm: rainfallMm,
      blasting_delay_hrs: blastingDelayHrs,
    });
  };

  // Run on mount if no result
  React.useEffect(() => {
    handleRunSimulation();
  }, [selectedMoilMineId, numExcavators, numDumpers, availDelta, workingHours, rainfallMm, blastingDelayHrs]);

  const handleResetDefaults = () => {
    setNumExcavators(4);
    setNumDumpers(8);
    setAvailDelta(0.0);
    setWorkingHours(16.0);
    setRainfallMm(20.0);
    setBlastingDelayHrs(0.0);
  };

  return (
    <div className="space-card" style={{ display: 'grid', gap: '20px' }}>
      {/* HEADER & MINE SELECTOR */}
      <div className="panel-heading" style={{ padding: 0 }}>
        <div>
          <p className="eyebrow">MODULE D: DECISION SUPPORT & WHAT-IF SIMULATOR</p>
          <h2>Operational Scenario Modeling & Production Recovery</h2>
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
          <button className="ghost-button" onClick={handleResetDefaults} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* SIMULATOR TWO-COLUMN LAYOUT: SLIDERS VS PREDICTED OUTCOME */}
      <div className="split-layout" style={{ margin: 0 }}>
        {/* INTERACTIVE OPERATIONAL SLIDERS */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Operational Decision Parameters
            </strong>
            <span className="badge-gold">Live Scenario Parameters</span>
          </div>

          {/* SLIDER 1: EXCAVATORS */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} style={{ color: 'var(--accent-gold)' }} />
                Active Hydraulic Excavators (EX)
              </span>
              <strong style={{ color: 'var(--accent-gold)' }}>{numExcavators} Units</strong>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={numExcavators}
              onChange={(e) => setNumExcavators(Number(e.target.value))}
              style={{ accentColor: 'var(--accent-gold)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>2 Units (Reduced)</span>
              <span>4 Units (Baseline)</span>
              <span>6 Units (Max Deployment)</span>
            </div>
          </div>

          {/* SLIDER 2: DUMPERS */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} style={{ color: '#60a5fa' }} />
                Heavy Dumpers Allocated (DP)
              </span>
              <strong style={{ color: '#60a5fa' }}>{numDumpers} Units</strong>
            </div>
            <input
              type="range"
              min={4}
              max={14}
              step={1}
              value={numDumpers}
              onChange={(e) => setNumDumpers(Number(e.target.value))}
              style={{ accentColor: '#60a5fa' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>4 Units</span>
              <span>8 Units (Baseline)</span>
              <span>14 Units</span>
            </div>
          </div>

          {/* SLIDER 3: AVAILABILITY DELTA */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={14} style={{ color: 'var(--accent-emerald)' }} />
                Fleet Availability Improvement Delta
              </span>
              <strong style={{ color: availDelta >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                {availDelta >= 0 ? `+${availDelta}%` : `${availDelta}%`}
              </strong>
            </div>
            <input
              type="range"
              min={-10}
              max={15}
              step={1}
              value={availDelta}
              onChange={(e) => setAvailDelta(Number(e.target.value))}
              style={{ accentColor: 'var(--accent-emerald)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>-10% (High Downtime)</span>
              <span>0% (Baseline)</span>
              <span>+15% (Optimized Maintenance)</span>
            </div>
          </div>

          {/* SLIDER 4: WORKING HOURS */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: '#c084fc' }} />
                Daily Mine Operating Hours
              </span>
              <strong style={{ color: '#c084fc' }}>{workingHours} hrs/day</strong>
            </div>
            <input
              type="range"
              min={12}
              max={24}
              step={1}
              value={workingHours}
              onChange={(e) => setWorkingHours(Number(e.target.value))}
              style={{ accentColor: '#c084fc' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>12 hrs (2 Shifts)</span>
              <span>16 hrs (Baseline)</span>
              <span>24 hrs (Continuous 3 Shifts)</span>
            </div>
          </div>

          {/* SLIDER 5: RAINFALL SCENARIO */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloudRain size={14} style={{ color: '#38bdf8' }} />
                Rainfall Disruption Scenario
              </span>
              <strong style={{ color: '#38bdf8' }}>{rainfallMm} mm</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={rainfallMm}
              onChange={(e) => setRainfallMm(Number(e.target.value))}
              style={{ accentColor: '#38bdf8' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>0 mm (Dry Season)</span>
              <span>20 mm (Normal)</span>
              <span>100 mm (Heavy Inundation)</span>
            </div>
          </div>
        </div>

        {/* SIMULATED IMPACT OUTCOME CARD */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Simulated Production Outcome vs Baseline
            </strong>
            {simResult && (
              <span
                style={{
                  background: simResult.risk_color,
                  color: '#000',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {simResult.simulated_risk_level}
              </span>
            )}
          </div>

          {simResult ? (
            <>
              {/* COMPARISON METRICS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="pipeline-step-box" style={{ padding: '12px' }}>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Monthly Planned Target</small>
                  <strong style={{ fontSize: '18px', color: 'var(--text-main)' }}>
                    {number.format(simResult.planned_target_tonnes)} T
                  </strong>
                </div>

                <div className="pipeline-step-box" style={{ padding: '12px' }}>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Baseline (Unadjusted)</small>
                  <strong style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                    {number.format(simResult.baseline_predicted_tonnes)} T
                  </strong>
                </div>

                <div className="pipeline-step-box" style={{ padding: '12px', border: '1px solid var(--accent-gold)' }}>
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Simulated Production Output</small>
                  <strong style={{ fontSize: '22px', color: 'var(--accent-gold)' }}>
                    {number.format(simResult.simulated_predicted_tonnes)} T
                  </strong>
                </div>

                <div
                  className="pipeline-step-box"
                  style={{
                    padding: '12px',
                    borderColor: simResult.recovered_production_tonnes > 0 ? 'var(--accent-emerald)' : undefined,
                  }}
                >
                  <small style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>Net Production Recovered</small>
                  <strong style={{ fontSize: '22px', color: 'var(--accent-emerald)' }}>
                    +{number.format(simResult.recovered_production_tonnes)} T
                  </strong>
                </div>
              </div>

              {/* DECISION ATTRIBUTION CONTRIBUTIONS */}
              <div style={{ marginTop: '6px' }}>
                <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Decision Attribution Breakdown (Tonnes Added / Subtracted)
                </strong>
                <div style={{ display: 'grid', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-panel-inner)', borderRadius: '4px' }}>
                    <span>Excavator Fleet Adjustment:</span>
                    <strong style={{ color: simResult.decision_attribution.excavator_contribution >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {simResult.decision_attribution.excavator_contribution >= 0 ? '+' : ''}{number.format(simResult.decision_attribution.excavator_contribution)} T
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-panel-inner)', borderRadius: '4px' }}>
                    <span>Dumper Fleet Allocation:</span>
                    <strong style={{ color: simResult.decision_attribution.dumper_contribution >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {simResult.decision_attribution.dumper_contribution >= 0 ? '+' : ''}{number.format(simResult.decision_attribution.dumper_contribution)} T
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-panel-inner)', borderRadius: '4px' }}>
                    <span>Availability Improvement Boost:</span>
                    <strong style={{ color: simResult.decision_attribution.availability_boost >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {simResult.decision_attribution.availability_boost >= 0 ? '+' : ''}{number.format(simResult.decision_attribution.availability_boost)} T
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-panel-inner)', borderRadius: '4px' }}>
                    <span>Working Hours Extended Shifts:</span>
                    <strong style={{ color: simResult.decision_attribution.working_hours_impact >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {simResult.decision_attribution.working_hours_impact >= 0 ? '+' : ''}{number.format(simResult.decision_attribution.working_hours_impact)} T
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-panel-inner)', borderRadius: '4px' }}>
                    <span>Rainfall & Moisture Loss:</span>
                    <strong style={{ color: '#ef4444' }}>
                      {number.format(simResult.decision_attribution.rainfall_mitigation_loss)} T
                    </strong>
                  </div>
                </div>
              </div>

              {/* EXECUTIVE DECISION CONCLUSION */}
              <div style={{ background: 'var(--bg-panel-inner)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', lineHeight: '1.4' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Management Recommendation: </strong>
                {simResult.simulated_shortfall_tonnes === 0 ? (
                  <span>
                    Simulated scenario successfully eliminates predicted shortfall! Target of {number.format(simResult.planned_target_tonnes)} T is fully achievable.
                  </span>
                ) : (
                  <span>
                    Scenario reduces shortfall from {number.format(simResult.planned_target_tonnes - simResult.baseline_predicted_tonnes)} T to {number.format(simResult.simulated_shortfall_tonnes)} T. Implement prescriptive actions to bridge remaining gap.
                  </span>
                )}
              </div>
            </>
          ) : (
            <LoadingBlock />
          )}
        </div>
      </div>
    </div>
  );
}

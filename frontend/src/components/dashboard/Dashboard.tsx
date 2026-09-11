import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart3, Database, Factory, MapPin, Play, RotateCcw, Search, Sparkles, Square } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { IndiaMap } from '../map/IndiaMap';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';
import { PredictForm } from '../ml/PredictForm';
import { ExplainabilityCard } from '../ml/ExplainabilityCard';
import { INDIA_ADMINISTRATIVE_AREAS } from '../../data/indiaAdministrative';
import { GRADE_BANDS } from '../../data/highGradeDeposits';

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const tonnes = (value: number | null | undefined) => value == null ? 'N/A' : value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e5 ? `${(value / 1e5).toFixed(2)}L` : number.format(value);

export function Dashboard() {
  const filters = useFilterStore();
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [demoRunning, setDemoRunning] = useState(false);
  const summary = useQuery({ queryKey: ['summary'], queryFn: apiClient.summary });
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, refetchInterval: 60_000 });
  const trend = useQuery({ queryKey: ['trend', filters.state, filters.district, filters.selectedDepositId], queryFn: () => apiClient.trend({ state: filters.state || undefined, district: filters.district || undefined, deposit_id: filters.selectedDepositId ?? undefined }) });
  const deposits = useQuery({ queryKey: ['deposits', filters.state, filters.district, filters.search, page, limit], queryFn: () => apiClient.deposits({ state: filters.state || undefined, district: filters.district || undefined, search: filters.search || undefined, page, limit }) });
  const filterOptions = useQuery({ queryKey: ['filter-options'], queryFn: () => apiClient.deposits({ page: 1, limit: 200 }) });
  const mapInventory = useQuery({ queryKey: ['map-deposits'], queryFn: apiClient.mapDeposits });
  const demoPrediction = useMutation({ mutationFn: apiClient.predict });
  const stateOptions = [...INDIA_ADMINISTRATIVE_AREAS].sort();
  const stateValue = filters.state;
  const districts = filterOptions.data?.items.filter((item) => !filters.state || item.State === filters.state).map((item) => item.District).filter((d): d is string => Boolean(d && d !== 'Unknown')) ?? [];
  const districtOptions = [...new Set(districts)];
  const filteredRows = (filterOptions.data?.items ?? []).filter((item) => {
    const stateMatch = !filters.state || item.State === filters.state;
    const districtMatch = !filters.district || item.District === filters.district;
    const search = filters.search.trim().toLowerCase();
    const searchMatch = !search || Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(search));
    return stateMatch && districtMatch && searchMatch;
  });
  const filteredProduction = filteredRows.reduce((total, row) => total + (row.Annual_Production_tonnes ?? 0), 0);
  const filteredStates = new Set(filteredRows.map((row) => row.State).filter(Boolean)).size;
  const filteredDistricts = new Set(filteredRows.map((row) => row.District).filter(Boolean)).size;
  const filteredGradeValues = filteredRows.map((row) => row.Grade_pct).filter((grade): grade is number => typeof grade === 'number');
  const runDemo = () => {
    const point = mapInventory.data?.points[0];
    if (!point || demoRunning) return;
    setDemoRunning(true);
    filters.setFilter('state', point.state ?? '');
    filters.selectDeposit(point.deposit_id);
    setMapCoordinate({ lat: point.latitude, lng: point.longitude });
    demoPrediction.mutate({ Latitude: point.latitude, Longitude: point.longitude, State: point.state ?? undefined }, {
      onSuccess: (prediction) => { filters.setPrediction(prediction); filters.setPredictionOpen(true); },
      onSettled: () => setDemoRunning(false),
    });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Factory size={19} /></div><div><strong>INDIA MINERAL</strong><span>ANALYTICS ENGINE</span></div></div>
        <div className={`health-pill ${health.isError ? 'offline' : ''}`}><span className="health-dot" />{health.isLoading ? 'CONNECTING' : health.isError ? 'API OFFLINE' : `DATASET · ${number.format(health.data?.dataset_rows ?? 0)} ROWS`}</div>
      </header>

      <section className="hero-row">
        <div><p className="eyebrow">NATIONAL RESOURCE INTELLIGENCE / {summary.data?.year_range?.[summary.data.year_range.length - 1] ?? 'AVAILABLE DATA'}</p><h1>Mining operations, <em>mapped.</em></h1><p className="hero-copy">A decision-support surface for India&apos;s mineral production, terrain signals, and feasibility intelligence.</p></div>
        <div className="hero-actions"><button className="demo-button" onClick={runDemo} disabled={demoRunning || mapInventory.isLoading} aria-label="Run a demo using a real inventory record">{demoRunning ? <Square size={14} /> : <Play size={14} />}{demoRunning ? 'RUNNING REAL DEMO' : 'RUN REAL DEMO'}</button></div>
      </section>

      <section className="filterbar panel">
        <div className="filter-label"><Search size={16} /> GLOBAL FILTERS</div>
        <select value={stateValue} onChange={(e) => { filters.setFilter('state', e.target.value); setPage(1); }}><option value="">All states</option>{stateOptions.map((state) => <option key={state}>{state}</option>)}</select>
        <select value={filters.district} onChange={(e) => { filters.setFilter('district', e.target.value); setPage(1); }}><option value="">All districts</option>{districtOptions.map((district) => <option key={district}>{district}</option>)}</select>
        <input placeholder="Search deposits or locations..." value={filters.search} onChange={(e) => { filters.setFilter('search', e.target.value); setPage(1); }} />
        <button className="ghost-button" onClick={() => { filters.reset(); setPage(1); }}><RotateCcw size={14} /> Reset</button>
      </section>

      {summary.isLoading ? <LoadingBlock /> : summary.isError ? <ErrorState message="Summary data could not be loaded." /> : <section className="kpi-grid">
        <Kpi icon={<Database />} label="INVENTORY RECORDS" value={number.format(summary.data?.inventory_records ?? summary.data?.total_records ?? 0)} suffix={`${number.format(filteredRows.length)} in current view`} />
        <Kpi icon={<MapPin />} label="ACTIVE COVERAGE" value={`${filteredStates} states`} suffix={`${filteredDistricts} districts`} />
        <Kpi icon={<Factory />} label="ANNUAL PRODUCTION" value={tonnes(filteredProduction)} suffix="filtered tonnes" accent />
        <Kpi icon={<Sparkles />} label="AVERAGE GRADE" value={filteredGradeValues.length ? `${(filteredGradeValues.reduce((a, b) => a + b, 0) / filteredGradeValues.length).toFixed(2)}%` : 'Not reported'} suffix="source data limitation" />
        <Kpi icon={<BarChart3 />} label="DATA HORIZON" value={summary.data?.year_range?.length ? `FY ${summary.data.year_range[0]} — ${summary.data.year_range[summary.data.year_range.length - 1]}` : 'N/A'} suffix={`${number.format(summary.data?.training_rows ?? 0)} ML rows · ${number.format(summary.data?.synthetic_training_rows ?? 0)} augmented`} />
      </section>}

      <section className="grade-priority panel">
        <div className="panel-heading"><div><p className="eyebrow">INDIAN BUREAU OF MINES REFERENCE</p><h2>Prioritize high-grade manganese</h2></div><span className="live-tag">Mn CONTENT</span></div>
        <div className="grade-priority-copy"><p><strong>&gt;46% Mn</strong> is the high-grade target for ferro-alloys and export; <strong>&gt;48% Mn</strong> is chemical / dioxide grade. Below <strong>10% Mn</strong>, ore is legally classified as waste and is generally left in place.</p><p className="muted">Reference bands are shown separately from the project inventory because source Grade_pct values are not reported for most inventory rows.</p></div>
        <div className="grade-band-grid">{GRADE_BANDS.map((band) => <div className="grade-band" key={band.name} style={{ borderTopColor: band.color }}><strong>{band.name}</strong><b>{band.manganese} Mn</b><span>{band.use}</span></div>)}</div>
      </section>

      <section className="split-layout">
        <div className="panel map-panel"><div className="panel-heading"><div><p className="eyebrow">GEOSPATIAL INTELLIGENCE</p><h2>Deposit distribution</h2></div><span className="live-tag">DATASET MAP</span></div><IndiaMap state={filters.state} district={filters.district} selectedDepositId={filters.selectedDepositId} /></div>
        <div className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">PRODUCTION SIGNAL</p><h2>Annual output trend</h2></div><span className="muted">TONNES / YOY</span></div><TrendChart data={trend.data?.series ?? []} loading={trend.isLoading} error={trend.isError} /></div>
      </section>

      <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">DISTRICT INVENTORY</p><h2>Deposits registry</h2></div><span className="muted">SHOWING {deposits.data?.items.length ?? 0} OF {deposits.data?.total ?? 0} MATCHES</span></div>{deposits.isLoading ? <LoadingBlock /> : deposits.isError ? <ErrorState message="Deposit registry is unavailable." /> : <><div className="table-wrap"><table><thead><tr>{['State', 'District', 'Deposit ID', 'Coordinates', 'Annual production', 'Soil / access'].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{deposits.data?.items.map((row, index) => <tr className={filters.selectedDepositId === row.Deposit_ID ? 'selected-row' : ''} key={`${row.Deposit_ID}-${index}`} onClick={() => { filters.selectDeposit(row.Deposit_ID ?? null); if (row.Latitude != null && row.Longitude != null) setMapCoordinate({ lat: row.Latitude, lng: row.Longitude }); }}><td>{row.State ?? '—'}</td><td>{row.District ?? '—'}</td><td className="mono">{row.Deposit_ID ?? 'Unclassified'}</td><td className="mono">{row.Latitude?.toFixed(3) ?? '—'}, {row.Longitude?.toFixed(3) ?? '—'}</td><td className="production">{tonnes(row.Annual_Production_tonnes)}</td><td><span>{row.Soil_Type ?? 'Unknown soil'}</span><small>{row.Road_Accessibility ?? 'Unknown access'}</small></td></tr>)}</tbody></table></div><div className="pagination"><span>Page {deposits.data?.page ?? page} of {Math.max(1, Math.ceil((deposits.data?.total ?? 0) / limit))}</span><div><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><button disabled={!deposits.data || page >= Math.ceil(deposits.data.total / limit)} onClick={() => setPage((p) => p + 1)}>Next</button><select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option></select></div></div></>}</section>

      <section className="workbench"><div className="workbench-title"><div><p className="eyebrow">MACHINE LEARNING STUDIO</p><h2>Feasibility workbench</h2></div><p>{summary.data?.provenance_note ?? 'Simulate a location. Understand the drivers.'}<br />Inventory {summary.data?.inventory_records ?? 0} · real {summary.data?.real_observations ?? 0} · synthetic {summary.data?.synthetic_observations ?? 0}</p></div><div className="studio-grid"><div className="panel"><PredictForm soilTypes={summary.data?.soil_types ?? []} /></div><div className="panel explanation-panel"><ExplainabilityCard /></div></div></section>
    </main>
  );
}

function Kpi({ icon, label, value, suffix, accent }: { icon: ReactNode; label: string; value: string; suffix?: string; accent?: boolean }) {
  return <article className={`kpi-card ${accent ? 'accent' : ''}`}><div className="kpi-icon">{icon}</div><p>{label}</p><strong>{value}</strong>{suffix && <span>{suffix}</span>}</article>;
}

function TrendChart({ data, loading, error }: { data: { year: string | number; production_tonnes: number }[]; loading: boolean; error: boolean }) {
  if (loading) return <LoadingBlock />; if (error) return <ErrorState message="Trend unavailable." />; if (!data.length) return <div className="empty-state">No trend data for these filters.</div>;
  return <div className="trend-chart"><ResponsiveContainer width="100%" height={330}><AreaChart data={data} margin={{ top: 15, right: 18, left: 0, bottom: 5 }}><defs><linearGradient id="productionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid stroke="#1f2937" vertical={false} /><XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => tonnes(value)} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #334155', color: '#f8fafc' }} formatter={(value: number) => [`${number.format(value)} tonnes`, 'Production']} /><Area type="monotone" dataKey="production_tonnes" stroke="#fbbf24" strokeWidth={2} fill="url(#productionFill)" /></AreaChart></ResponsiveContainer></div>;
}


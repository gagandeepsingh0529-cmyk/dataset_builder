import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bot,
  ClipboardCheck,
  Compass,
  Database,
  Factory,
  FileCheck,
  FileText,
  History,
  Layers,
  MapPin,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Satellite,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  TableProperties,
  Truck,
  Zap,
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
import { useFilterStore, type NavigationTab } from '../../store/useFilterStore';
import { IndiaMap } from '../map/IndiaMap';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';
import { PredictForm } from '../ml/PredictForm';
import { ExplainabilityCard } from '../ml/ExplainabilityCard';
import { SatellitePipeline } from '../space/SatellitePipeline';
import { SpectralAnalysisCard } from '../space/SpectralAnalysisCard';
import { CandidateZonesList } from '../space/CandidateZonesList';
import { ChangeDetectionView } from '../space/ChangeDetectionView';
import { FieldVerificationModal } from '../space/FieldVerificationModal';
import { GeologicalAssistant } from '../space/GeologicalAssistant';
import { ExplorationReportModal } from '../space/ExplorationReportModal';
import { FeatureNavDrawer } from '../navigation/FeatureNavDrawer';
import { ReserveDrillStudio } from '../moil/ReserveDrillStudio';
import { ProductionForecastView } from '../moil/ProductionForecastView';
import { EquipmentIntelligenceCard } from '../moil/EquipmentIntelligenceCard';
import { WhatIfSimulator } from '../moil/WhatIfSimulator';
import { PrescriptiveActionsList } from '../moil/PrescriptiveActionsList';
import { ModelAuditModal } from '../moil/ModelAuditModal';
import { INDIA_ADMINISTRATIVE_AREAS } from '../../data/indiaAdministrative';
import { GRADE_BANDS } from '../../data/highGradeDeposits';

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const tonnes = (value: number | null | undefined) =>
  value == null
    ? 'N/A'
    : value >= 1e6
    ? `${(value / 1e6).toFixed(2)}M`
    : value >= 1e5
    ? `${(value / 1e5).toFixed(2)}L`
    : number.format(value);

export function Dashboard() {
  const filters = useFilterStore();
  const theme = useFilterStore((state) => state.theme);
  const toggleTheme = useFilterStore((state) => state.toggleTheme);
  const activeTab = useFilterStore((state) => state.activeTab);
  const setActiveTab = useFilterStore((state) => state.setActiveTab);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const reportModalOpen = useFilterStore((state) => state.reportModalOpen);
  const reportTargetZoneId = useFilterStore((state) => state.reportTargetZoneId);
  const setReportModalOpen = useFilterStore((state) => state.setReportModalOpen);
  const selectedMoilMineId = useFilterStore((state) => state.selectedMoilMineId);
  const setSelectedMoilMineId = useFilterStore((state) => state.setSelectedMoilMineId);
  const modelAuditModalOpen = useFilterStore((state) => state.modelAuditModalOpen);
  const setModelAuditModalOpen = useFilterStore((state) => state.setModelAuditModalOpen);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [demoRunning, setDemoRunning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const summary = useQuery({ queryKey: ['summary'], queryFn: apiClient.summary });
  const health = useQuery({
    queryKey: ['health'],
    queryFn: apiClient.health,
    refetchInterval: 60_000,
  });
  const moilMinesQuery = useQuery({ queryKey: ['moil-mines'], queryFn: apiClient.moilMines });
  const trend = useQuery({
    queryKey: ['trend', filters.state, filters.district, filters.selectedDepositId],
    queryFn: () =>
      apiClient.trend({
        state: filters.state || undefined,
        district: filters.district || undefined,
        deposit_id: filters.selectedDepositId ?? undefined,
      }),
  });
  const deposits = useQuery({
    queryKey: ['deposits', filters.state, filters.district, filters.search, page, limit],
    queryFn: () =>
      apiClient.deposits({
        state: filters.state || undefined,
        district: filters.district || undefined,
        search: filters.search || undefined,
        page,
        limit,
      }),
  });
  const filterOptions = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => apiClient.deposits({ page: 1, limit: 200 }),
  });
  const demoPrediction = useMutation({ mutationFn: apiClient.predict });

  const moilMines = moilMinesQuery.data?.mines ?? [];
  const activeMoilMine = moilMines.find((m) => m.mine_id === selectedMoilMineId) ?? moilMines[0];

  const stateOptions = [...INDIA_ADMINISTRATIVE_AREAS].sort();
  const stateValue = filters.state;

  const districts =
    filterOptions.data?.items
      .filter((item) => !filters.state || item.State === filters.state)
      .map((item) => item.District)
      .filter((d): d is string => Boolean(d && d !== 'Unknown')) ?? [];
  const districtOptions = [...new Set(districts)];

  const filteredRows = (filterOptions.data?.items ?? []).filter((item) => {
    const stateMatch = !filters.state || item.State === filters.state;
    const districtMatch = !filters.district || item.District === filters.district;
    const search = filters.search.trim().toLowerCase();
    const searchMatch =
      !search ||
      Object.values(item).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search)
      );
    return stateMatch && districtMatch && searchMatch;
  });

  const filteredProduction = filteredRows.reduce(
    (total, row) => total + (row.Annual_Production_tonnes ?? 0),
    0
  );
  const filteredStates = new Set(filteredRows.map((row) => row.State).filter(Boolean)).size;
  const filteredDistricts = new Set(filteredRows.map((row) => row.District).filter(Boolean)).size;

  const runDemo = () => {
    const point = {
      latitude: 21.6840,
      longitude: 85.5420,
      state: 'Odisha',
      deposit_id: 'Odisha_Kendujhar',
    };
    if (demoRunning) return;
    setDemoRunning(true);
    filters.setFilter('state', point.state ?? '');
    setMapCoordinate({ lat: point.latitude, lng: point.longitude });
    demoPrediction.mutate(
      { Latitude: point.latitude, Longitude: point.longitude, State: point.state ?? undefined },
      {
        onSuccess: (pred) => {
          filters.setPrediction(pred);
          filters.setPredictionOpen(true);
          filters.addCandidate({
            id: `cand-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            latitude: point.latitude,
            longitude: point.longitude,
            district: pred.hydrated_from_district ?? undefined,
            predicted_tonnes: pred.predicted_annual_production_tonnes,
            feasibility: pred.feasibility_rating,
            coverage_level: pred.training_data_coverage.level,
            coverage_score: pred.training_data_coverage.score,
            distance_to_mine_km: pred.training_data_coverage.distance_to_nearest_mine_km ?? undefined,
            elevation_m: pred.environmental_context?.elevation_m ?? undefined,
            annual_precip_mm: pred.environmental_context?.annual_precip_mm ?? undefined,
          });
        },
        onSettled: () => setDemoRunning(false),
      }
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="hamburger-menu-btn"
            onClick={() => setDrawerOpen(true)}
            title="Open All Features Menu (Side Drawer)"
            aria-label="Toggle All Features Menu"
          >
            <Menu size={18} />
            <span className="menu-btn-text">ALL FEATURES</span>
          </button>

          <div className="brand">
            <div className="brand-mark">
              <Satellite size={18} />
            </div>
            <div>
              <strong>MOIL MINING INTELLIGENCE</strong>
              <span>PRODUCTION PLANNING &amp; AI EXPLORATION</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="dossier-topbar-btn"
            onClick={() => setModelAuditModalOpen(true)}
            title="MOIL Model Performance & Data Quality Audit"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'var(--accent-emerald)',
              color: 'var(--accent-emerald)',
            }}
          >
            <ShieldCheck size={14} />
            <span>MODEL AUDIT (94.2%)</span>
          </button>

          <button
            className="dossier-topbar-btn"
            onClick={() => setReportModalOpen(true, 'CZ-01')}
            title="Generate Exploration Dossier Report"
          >
            <FileText size={14} />
            <span>EXPLORATION DOSSIER</span>
          </button>

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>

          <div className={`health-pill ${health.isError ? 'offline' : ''}`}>
            <span className="health-dot" />
            {health.isLoading
              ? 'CONNECTING'
              : health.isError
              ? 'API OFFLINE'
              : `MOIL ENGINE · ${number.format(health.data?.dataset_rows ?? 0)} ROWS`}
          </div>
        </div>
      </header>

      {/* MOIL ACTIVE MINE BANNER & CONTEXT SELECTOR */}
      <section
        className="panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-panel) 100%)',
          borderLeft: '4px solid var(--accent-gold)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-gold)',
            }}
          >
            <Factory size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>
                {activeMoilMine?.name ?? 'Balaghat Mine (Bharveli)'}
              </strong>
              <span className="badge-gold" style={{ fontSize: '10px' }}>
                {activeMoilMine?.mine_type ?? 'Underground'}
              </span>
              <span className="badge-emerald" style={{ fontSize: '10px' }}>
                {activeMoilMine?.state ?? 'Madhya Pradesh'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              Avg Mn Grade: <strong style={{ color: 'var(--accent-gold)' }}>{activeMoilMine?.avg_grade_pct ?? 44.5}%</strong> &bull; Total Proved Reserves: <strong>{activeMoilMine?.proven_reserves_mt ?? 24.5} MT</strong> &bull; Annual Target: <strong>{number.format((activeMoilMine?.target_monthly_tonnes ?? 37500) * 12)} T/yr</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
            SELECT MOIL MINE:
          </span>
          <select
            value={selectedMoilMineId}
            onChange={(e) => setSelectedMoilMineId(e.target.value)}
            style={{
              background: 'var(--bg-panel-inner)',
              border: '1px solid var(--border-main)',
              color: 'var(--text-main)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {moilMines.map((m) => (
              <option key={m.mine_id} value={m.mine_id}>
                {m.name} ({m.district}, {m.state})
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="hero-row">
        <div>
          <p className="eyebrow">
            MOIL LIMITED &bull; AI/ML MINING INTELLIGENCE &amp; PRODUCTION PLANNING
          </p>
          <h1>
            Manganese Reserves &amp; Production, <em>Intelligently Optimized.</em>
          </h1>
          <p className="hero-copy">
            Integrating <strong>UNFC reserve estimation</strong>,{' '}
            <strong>downhole borehole stratigraphy</strong>,{' '}
            <strong>production shortfall prediction</strong>, and{' '}
            <strong>prescriptive equipment dispatch simulation</strong> for MOIL flagship operations.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="demo-button"
            onClick={() => setActiveTab('simulator')}
            aria-label="Launch What-If Scenario Simulator"
          >
            <Zap size={14} />
            WHAT-IF SCENARIO SIMULATOR
          </button>
          <button
            className="ghost-button dossier-hero-btn"
            onClick={() => setModelAuditModalOpen(true)}
          >
            <ShieldCheck size={14} /> AI MODEL &amp; DATA AUDIT
          </button>
        </div>
      </section>

      <section className="filterbar panel">
        <div className="filter-label">
          <Search size={16} /> REGIONAL FILTERS
        </div>
        <select
          value={stateValue}
          onChange={(e) => {
            filters.setFilter('state', e.target.value);
            setPage(1);
          }}
        >
          <option value="">All States ({stateOptions.length})</option>
          {stateOptions.map((state) => (
            <option key={state}>{state}</option>
          ))}
        </select>
        <select
          value={filters.district}
          onChange={(e) => {
            filters.setFilter('district', e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Districts ({districtOptions.length})</option>
          {districtOptions.map((district) => (
            <option key={district}>{district}</option>
          ))}
        </select>
        <input
          placeholder="Search mining centers, formations, borehole IDs..."
          value={filters.search}
          onChange={(e) => {
            filters.setFilter('search', e.target.value);
            setPage(1);
          }}
        />
        <button
          className="ghost-button"
          onClick={() => {
            filters.reset();
            setPage(1);
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </section>

      {summary.isLoading ? (
        <LoadingBlock />
      ) : summary.isError ? (
        <ErrorState message="Summary dataset metrics could not be loaded." />
      ) : (
        <section className="kpi-grid">
          <Kpi
            icon={<Database />}
            label="MOIL ACTIVE MINES"
            value={`${moilMines.length || 8} Flagship Mines`}
            suffix="MP &amp; Maharashtra Corridors"
          />
          <Kpi
            icon={<MapPin />}
            label="PROVED RESERVES"
            value="72.3 MT"
            suffix="UNFC G1/G2/G3 Classified"
          />
          <Kpi
            icon={<Factory />}
            label="ANNUAL CAPACITY"
            value="1.54 MT"
            suffix="High-Grade &amp; Dioxide Ore"
            accent
          />
          <Kpi
            icon={<Sparkles />}
            label="AI PROSPECTIVITY"
            value="5 Exploration Zones"
            suffix="Sentinel-2 + SWIR Ratios"
          />
          <Kpi
            icon={<ShieldCheck />}
            label="MODEL ACCURACY"
            value="94.2% Quality Score"
            suffix="JORC/UNFC Certified"
          />
        </section>
      )}

      {/* Indian Bureau of Mines Grade Benchmark Reference */}
      <section className="grade-priority panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INDIAN BUREAU OF MINES REFERENCE STANDARD</p>
            <h2>High-Grade Manganese Classification</h2>
          </div>
          <span className="live-tag">
            <Sparkles size={13} /> IBM STANDARDS
          </span>
        </div>
        <div className="grade-priority-copy">
          <p>
            <strong>&gt;46% Mn</strong> is high-grade metallurgical ore for ferro-alloys and steel;{' '}
            <strong>&gt;48% Mn</strong> represents premium dioxide / battery grade. Below{' '}
            <strong>10% Mn</strong>, material is legally classified as sub-economic waste.
          </p>
          <p className="muted">
            <em>Operational Transparency:</em> MANGAN-AI couples satellite mineral spectral mapping
            with downhole kriging and fleet telemetry for end-to-end mine planning.
          </p>
        </div>
        <div className="grade-band-grid">
          {GRADE_BANDS.map((band) => (
            <div className="grade-band" key={band.name} style={{ borderTopColor: band.color }}>
              <strong>{band.name}</strong>
              <b>{band.manganese} Mn</b>
              <span>{band.use}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation Workflow Tabs */}
      <div className="view-tabs workflow-tabs">
        {/* MOIL PLANNING MODULES */}
        <button
          className={`tab-btn ${activeTab === 'reserves' ? 'active' : ''}`}
          onClick={() => setActiveTab('reserves')}
        >
          <Database size={15} /> 1. Reserve &amp; Drill-Hole Intelligence
        </button>
        <button
          className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          <Activity size={15} /> 2. Production Forecast &amp; Shortfall
        </button>
        <button
          className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          <Truck size={15} /> 3. Equipment Fleet &amp; RUL
        </button>
        <button
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <Compass size={15} /> 4. What-If Scenario Simulator
        </button>
        <button
          className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <Sparkles size={15} /> 5. Prescriptive Interventions
        </button>

        {/* REGIONAL EXPLORATION & SPACE MODULES */}
        <button
          className={`tab-btn ${activeTab === 'workbench' ? 'active' : ''}`}
          onClick={() => setActiveTab('workbench')}
        >
          <Compass size={15} /> 6. Geospatial Exploration Map
        </button>
        <button
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          <Zap size={15} /> 7. Candidate Exploration Zones
        </button>
        <button
          className={`tab-btn ${activeTab === 'space' ? 'active' : ''}`}
          onClick={() => setActiveTab('space')}
        >
          <Satellite size={15} /> 8. Space Data Pipeline
        </button>
        <button
          className={`tab-btn ${activeTab === 'spectral' ? 'active' : ''}`}
          onClick={() => setActiveTab('spectral')}
        >
          <Activity size={15} /> 9. Spectral Mineralogy
        </button>
        <button
          className={`tab-btn ${activeTab === 'change' ? 'active' : ''}`}
          onClick={() => setActiveTab('change')}
        >
          <History size={15} /> 10. Change Detection
        </button>
        <button
          className={`tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          <ClipboardCheck size={15} /> 11. Field Verification Log
        </button>
        <button
          className={`tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          <Bot size={15} /> 12. Geological AI Copilot
        </button>
        <button
          className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          <TableProperties size={15} /> 13. Deposits Registry
        </button>
      </div>

      {/* MODULE A: AI Reserve Estimation & Drill-Hole Intelligence */}
      {activeTab === 'reserves' && <ReserveDrillStudio />}

      {/* MODULE B: Production Forecast & Shortfall Prediction */}
      {activeTab === 'forecast' && <ProductionForecastView />}

      {/* MODULE C: Equipment Fleet Intelligence & Predictive Maintenance */}
      {activeTab === 'equipment' && <EquipmentIntelligenceCard />}

      {/* MODULE D: Prescriptive AI & What-If Scenario Simulator */}
      {activeTab === 'simulator' && <WhatIfSimulator />}

      {/* MODULE E: Prescriptive Corrective Interventions */}
      {activeTab === 'prescriptions' && <PrescriptiveActionsList />}

      {/* TAB 6: Geospatial Prospectivity Map & Studio */}
      {activeTab === 'workbench' && (
        <>
          <section className="split-layout">
            <div className="panel map-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">INTERACTIVE GEOSPATIAL INTELLIGENCE</p>
                  <h2>Geographic Exploration Map</h2>
                </div>
                <span className="live-tag">CLICK ANYWHERE TO ANALYZE</span>
              </div>
              <IndiaMap
                state={filters.state}
                district={filters.district}
                selectedDepositId={filters.selectedDepositId}
                onSelectCandidate={() => setActiveTab('spectral')}
              />
            </div>

            <div className="panel trend-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">HISTORICAL PRODUCTION TREND</p>
                  <h2>Annual Output Trajectory</h2>
                </div>
                <span className="muted">TONNES / YOY</span>
              </div>
              <TrendChart
                data={trend.data?.series ?? []}
                loading={trend.isLoading}
                error={trend.isError}
              />
            </div>
          </section>

          <section className="workbench">
            <div className="workbench-title">
              <div>
                <p className="eyebrow">RANDOM FOREST FEASIBILITY STUDIO</p>
                <h2>Location Intelligence &amp; Attribution</h2>
              </div>
              <p>
                Simulate any location in India. Resolve climate, terrain, and port distance.
                <br />
                Model: <code>RandomForestRegressor</code> (15 features, Transformed Target log1p).
              </p>
            </div>
            <div className="studio-grid">
              <div className="panel">
                <PredictForm soilTypes={summary.data?.soil_types ?? []} />
              </div>
              <div className="panel explanation-panel">
                <ExplainabilityCard />
              </div>
            </div>
          </section>
        </>
      )}

      {/* TAB 7: Candidate Exploration Zones */}
      {activeTab === 'comparison' && <CandidateZonesList />}

      {/* TAB 8: Space Data Pipeline */}
      {activeTab === 'space' && <SatellitePipeline />}

      {/* TAB 9: Spectral Mineralogy */}
      {activeTab === 'spectral' && <SpectralAnalysisCard />}

      {/* TAB 10: Historical Change Detection & Alerts */}
      {activeTab === 'change' && <ChangeDetectionView />}

      {/* TAB 11: Field Verification Log */}
      {activeTab === 'verification' && <FieldVerificationModal />}

      {/* TAB 12: Geological AI Assistant */}
      {activeTab === 'assistant' && <GeologicalAssistant />}

      {/* TAB 13: District Mine Registry */}
      {activeTab === 'registry' && (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MINING ASSET INVENTORY</p>
              <h2>District Deposits &amp; Production Registry</h2>
            </div>
            <span className="muted">
              SHOWING {deposits.data?.items.length ?? 0} OF {deposits.data?.total ?? 0} OBSERVATIONS
            </span>
          </div>
          {deposits.isLoading ? (
            <LoadingBlock />
          ) : deposits.isError ? (
            <ErrorState message="Deposit registry is currently unavailable." />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        'State',
                        'District',
                        'Deposit ID',
                        'Coordinates',
                        'Annual Production',
                        'Elevation / Slope',
                        'Soil & Formation',
                      ].map((head) => (
                        <th key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.data?.items.map((row, index) => (
                      <tr
                        className={filters.selectedDepositId === row.Deposit_ID ? 'selected-row' : ''}
                        key={`${row.Deposit_ID}-${index}`}
                        onClick={() => {
                          filters.selectDeposit(row.Deposit_ID ?? null);
                          if (row.Latitude != null && row.Longitude != null)
                            setMapCoordinate({ lat: row.Latitude, lng: row.Longitude });
                        }}
                      >
                        <td>
                          <strong>{row.State ?? '—'}</strong>
                        </td>
                        <td>{row.District ?? '—'}</td>
                        <td className="mono">{row.Deposit_ID ?? 'District Cluster'}</td>
                        <td className="mono">
                          {row.Latitude?.toFixed(3) ?? '—'}, {row.Longitude?.toFixed(3) ?? '—'}
                        </td>
                        <td className="production">{tonnes(row.Annual_Production_tonnes)}</td>
                        <td>
                          <span>{row.Elevation_m != null ? `${row.Elevation_m} m` : '—'}</span>
                          <small>{row.Topo_Slope_deg != null ? `${row.Topo_Slope_deg}° slope` : ''}</small>
                        </td>
                        <td>
                          <span>{row.Soil_Type ?? 'Unknown soil'}</span>
                          <small>{row.Formation ?? 'Precambrian suite'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <span>
                  Page {deposits.data?.page ?? page} of{' '}
                  {Math.max(1, Math.ceil((deposits.data?.total ?? 0) / limit))}
                </span>
                <div>
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <button
                    disabled={
                      !deposits.data || page >= Math.ceil(deposits.data.total / limit)
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* EXPLORATION REPORT MODAL */}
      {reportModalOpen && (
        <ExplorationReportModal
          initialZoneId={reportTargetZoneId}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {/* MODEL PERFORMANCE & DATA QUALITY AUDIT MODAL */}
      {modelAuditModalOpen && (
        <ModelAuditModal onClose={() => setModelAuditModalOpen(false)} />
      )}

      {/* ALL FEATURES & QUICK ACCESS NAVIGATION DRAWER */}
      <FeatureNavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRunDemo={runDemo}
      />
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <article className={`kpi-card ${accent ? 'accent' : ''}`}>
      <div className="kpi-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      {suffix && <span>{suffix}</span>}
    </article>
  );
}

function TrendChart({
  data,
  loading,
  error,
}: {
  data: { year: string | number; production_tonnes: number }[];
  loading: boolean;
  error: boolean;
}) {
  const theme = useFilterStore((state) => state.theme);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState message="Trend unavailable." />;
  if (!data.length) return <div className="empty-state">No trend data for these filters.</div>;

  const gridColor = theme === 'light' ? '#e2e8f0' : '#1f2c42';
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={330}>
        <AreaChart data={data} margin={{ top: 15, right: 18, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="productionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => tonnes(val)}
          />
          <Tooltip
            contentStyle={{
              background: theme === 'light' ? '#ffffff' : '#111827',
              border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid #334155',
              color: theme === 'light' ? '#0f172a' : '#f8fafc',
              borderRadius: '6px',
            }}
            formatter={(val: number) => [`${number.format(val)} tonnes`, 'Production Output']}
          />
          <Area
            type="monotone"
            dataKey="production_tonnes"
            stroke="#fbbf24"
            strokeWidth={2.5}
            fill="url(#productionFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


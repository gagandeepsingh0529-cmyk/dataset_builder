import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Database,
  FileText,
  History,
  Layers,
  Moon,
  Play,
  RotateCcw,
  Satellite,
  Search,
  Sparkles,
  Sun,
  TableProperties,
  X,
  Zap,
} from 'lucide-react';
import { useFilterStore, type NavigationTab } from '../../store/useFilterStore';

interface FeatureNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDemo: () => void;
}

interface FeatureItem {
  id: NavigationTab;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: 'gold' | 'emerald' | 'blue' | 'purple';
  icon: React.ReactNode;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'reserves',
    title: '1. Reserve & Drill-Hole Intelligence',
    subtitle: 'Borehole geochemical assays, downhole stratigraphy curves & UNFC G1/G2/G3 estimates',
    badge: 'Reserve AI',
    badgeColor: 'gold',
    icon: <Database size={18} />,
  },
  {
    id: 'forecast',
    title: '2. Production Forecast & Shortfall',
    subtitle: 'Monthly production trajectory, shortfall risk (🟢/🟡/🟠/🔴) & cause breakdown',
    badge: 'Production AI',
    badgeColor: 'emerald',
    icon: <Activity size={18} />,
  },
  {
    id: 'equipment',
    title: '3. Equipment Fleet Intelligence',
    subtitle: 'Excavator & Dumper availability, utilization, downtime & Remaining Useful Life (RUL)',
    badge: 'Fleet IoT',
    badgeColor: 'blue',
    icon: <Zap size={18} />,
  },
  {
    id: 'simulator',
    title: '4. What-If Scenario Simulator',
    subtitle: 'Simulate excavator/dumper counts, operating hours & weather to evaluate production recovery',
    badge: 'Simulator',
    badgeColor: 'purple',
    icon: <Compass size={18} />,
  },
  {
    id: 'prescriptions',
    title: '5. Prescriptive Decision Support',
    subtitle: 'Ranked corrective interventions with estimated monthly tonnage recovery (+T/month)',
    badge: 'Prescriptive',
    badgeColor: 'gold',
    icon: <Sparkles size={18} />,
  },
  {
    id: 'workbench',
    title: '6. Geospatial Exploration Map',
    subtitle: 'Interactive India GIS map, Random Forest feasibility predictor & location hydration',
    badge: 'GIS + ML',
    badgeColor: 'emerald',
    icon: <Compass size={18} />,
  },
  {
    id: 'comparison',
    title: '7. Candidate Exploration Zones',
    subtitle: 'Prioritized exploration targets (#01–#05) across Odisha, MP, Karnataka, MH & AP',
    badge: 'High Priority',
    badgeColor: 'gold',
    icon: <Zap size={18} />,
  },
  {
    id: 'space',
    title: '8. Space Data & Preprocessing',
    subtitle: 'Sentinel-2 MSI, Landsat 8/9, ISRO Bhuvan & 7-stage optical calibration workflow',
    badge: 'Space Tech',
    badgeColor: 'blue',
    icon: <Satellite size={18} />,
  },
  {
    id: 'spectral',
    title: '9. Spectral Mineralogy & Ratios',
    subtitle: 'Pyrolusite SWIR ratio, ferrous ratio, clay index & 450–2350 nm reflectance curves',
    badge: 'SWIR Spectrometry',
    badgeColor: 'purple',
    icon: <Activity size={18} />,
  },
  {
    id: 'change',
    title: '10. Change Detection & Alerts',
    subtitle: '2018–2026 pit expansion time-series & unregistered surface excavation alerts',
    badge: 'Monitoring',
    badgeColor: 'gold',
    icon: <History size={18} />,
  },
  {
    id: 'verification',
    title: '11. Field Verification Log',
    subtitle: 'Ground-truthing borehole assays, diamond drilling logs & GSI exploration stages',
    badge: 'Ground-Truth',
    badgeColor: 'emerald',
    icon: <ClipboardCheck size={18} />,
  },
  {
    id: 'assistant',
    title: '12. Geological AI Copilot',
    subtitle: 'Domain-trained exploration assistant for mineralogy, formation & IBM guidelines',
    badge: 'AI Assistant',
    badgeColor: 'blue',
    icon: <Bot size={18} />,
  },
  {
    id: 'registry',
    title: '13. District Deposits Registry',
    subtitle: 'Filterable mineral asset inventory, annual production history & soil geology records',
    badge: 'Database',
    badgeColor: 'purple',
    icon: <TableProperties size={18} />,
  },
];

export function FeatureNavDrawer({ isOpen, onClose, onRunDemo }: FeatureNavDrawerProps) {
  const activeTab = useFilterStore((state) => state.activeTab);
  const setActiveTab = useFilterStore((state) => state.setActiveTab);
  const theme = useFilterStore((state) => state.theme);
  const toggleTheme = useFilterStore((state) => state.toggleTheme);
  const setReportModalOpen = useFilterStore((state) => state.setReportModalOpen);
  const setModelAuditModalOpen = useFilterStore((state) => state.setModelAuditModalOpen);
  const resetFilters = useFilterStore((state) => state.reset);

  const [searchQuery, setSearchQuery] = useState('');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFeatures = FEATURES.filter(
    (f) =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.badge.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTab = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <div className="feature-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="feature-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* DRAWER HEADER */}
        <div className="feature-drawer-header">
          <div className="drawer-brand">
            <div className="drawer-brand-icon">
              <Satellite size={22} />
            </div>
            <div>
              <div className="drawer-title-row">
                <strong>MOIL MINING INTELLIGENCE</strong>
                <span className="drawer-version-tag">AI/ML PLATFORM</span>
              </div>
              <p className="drawer-subtitle">MINE PLANNING, RESERVES & FLEET TELEMETRY</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close Menu (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR IN DRAWER */}
        <div className="drawer-search-wrap">
          <Search size={16} className="drawer-search-icon" />
          <input
            type="text"
            placeholder="Search drillholes, reserves, forecasts, fleet, simulator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="drawer-clear-search" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* DRAWER BODY / FEATURE LIST */}
        <div className="feature-drawer-content">
          <div className="drawer-section-heading">
            <span>CORE INTELLIGENCE & PLANNING MODULES</span>
            <span className="count-pill">{filteredFeatures.length} FEATURES</span>
          </div>

          <div className="drawer-feature-list">
            {filteredFeatures.map((feature) => {
              const isActive = activeTab === feature.id;
              return (
                <button
                  key={feature.id}
                  className={`drawer-feature-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(feature.id)}
                >
                  <div className={`drawer-icon-box ${feature.badgeColor}`}>
                    {feature.icon}
                  </div>
                  <div className="drawer-feature-info">
                    <div className="drawer-feature-top">
                      <strong>{feature.title}</strong>
                      <span className={`drawer-badge ${feature.badgeColor}`}>
                        {feature.badge}
                      </span>
                    </div>
                    <p>{feature.subtitle}</p>
                  </div>
                  <div className="drawer-action-arrow">
                    {isActive ? <CheckCircle2 size={16} className="active-check" /> : <ChevronRight size={16} />}
                  </div>
                </button>
              );
            })}
            {filteredFeatures.length === 0 && (
              <div className="drawer-empty-search">
                <p>No feature found matching &quot;{searchQuery}&quot;</p>
                <button className="ghost-button" onClick={() => setSearchQuery('')}>
                  View All Features
                </button>
              </div>
            )}
          </div>

          {/* QUICK TOOLS & ACTIONS SECTION */}
          <div className="drawer-section-heading" style={{ marginTop: '20px' }}>
            <span>QUICK TOOLS & ACTIONS</span>
          </div>

          <div className="drawer-actions-grid">
            <button
              className="drawer-action-btn primary"
              onClick={() => {
                onClose();
                handleSelectTab('simulator');
              }}
            >
              <Zap size={16} />
              <div>
                <strong>Launch What-If Scenario Simulator</strong>
                <small>Simulate Equipment Redeployment & Shortfall Recovery</small>
              </div>
            </button>

            <button
              className="drawer-action-btn gold"
              onClick={() => {
                onClose();
                setModelAuditModalOpen(true);
              }}
            >
              <FileText size={16} />
              <div>
                <strong>Model Performance & Data Quality Audit</strong>
                <small>Validation Metrics (94.2% Quality Score)</small>
              </div>
            </button>

            <button
              className="drawer-action-btn secondary"
              onClick={() => {
                onClose();
                setReportModalOpen(true, 'CZ-01');
              }}
            >
              <FileText size={16} />
              <div>
                <strong>Generate Exploration Dossier</strong>
                <small>Printable IBM/GSI Format PDF Report</small>
              </div>
            </button>

            <button
              className="drawer-action-btn secondary"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <div>
                <strong>{theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</strong>
                <small>Current: {theme.toUpperCase()} MODE</small>
              </div>
            </button>
          </div>
        </div>

        {/* DRAWER FOOTER */}
        <div className="feature-drawer-footer">
          <div className="footer-status-row">
            <span className="status-live-dot" />
            <span>MANGAN-AI SPACE PIPELINE: <strong>ONLINE</strong></span>
          </div>
          <span className="footer-subtext">Sentinel-2B &bull; Landsat-9 &bull; ISRO Cartosat DEM</span>
        </div>
      </div>
    </div>
  );
}

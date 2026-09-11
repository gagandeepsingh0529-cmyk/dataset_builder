import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  History,
  Info,
  MapPin,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { LoadingBlock } from '../ui/AsyncState';

export function ChangeDetectionView() {
  const theme = useFilterStore((state) => state.theme);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);

  const changeData = useQuery({
    queryKey: ['change-detection'],
    queryFn: apiClient.changeDetection,
  });

  const alertsData = useQuery({
    queryKey: ['unregistered-alerts'],
    queryFn: apiClient.unregisteredAlerts,
  });

  if (changeData.isLoading) return <LoadingBlock />;

  const gridColor = theme === 'light' ? '#e2e8f0' : '#1f2c42';
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="change-detection-view panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MULTI-TEMPORAL EARTH OBSERVATION</p>
          <h2>Historical Land-Cover & Mining Expansion (2018 — 2026)</h2>
        </div>
        <span className="live-tag">
          <History size={13} /> SATELLITE TIME-SERIES
        </span>
      </div>

      <div className="change-summary-grid">
        <div className="summary-stat-box">
          <span>Observed Mineral Corridor</span>
          <strong>{changeData.data?.region ?? 'Keonjhar-Barbil Hub'}</strong>
        </div>
        <div className="summary-stat-box">
          <span>Total Expansion Footprint</span>
          <strong className="expansion-accent">
            <TrendingUp size={16} /> {changeData.data?.total_expansion_pct}
          </strong>
        </div>
        <div className="summary-stat-box">
          <span>Current Active Pit Area</span>
          <strong>16.5 km²</strong>
        </div>
      </div>

      <div className="change-chart-section">
        <div className="chart-header">
          <strong>Excavation & Surface Disturbance Growth (2018 — 2026)</strong>
          <small>Derived from multi-year optical surface reflectance & SAR backscatter</small>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={changeData.data?.timeline ?? []} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: theme === 'light' ? '#ffffff' : '#0f172a',
                border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid #334155',
                color: theme === 'light' ? '#0f172a' : '#f8fafc',
                fontSize: '11px',
                borderRadius: '6px',
              }}
              formatter={(val: number, name: string) => [
                name === 'active_pit_area_sq_km' ? `${val} km²` : `${val}%`,
                name === 'active_pit_area_sq_km' ? 'Active Pit Footprint' : 'Excavation Index',
              ]}
            />
            <Bar dataKey="active_pit_area_sq_km" name="active_pit_area_sq_km" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="timeline-cards-grid">
        {changeData.data?.timeline.map((step) => (
          <div className="timeline-card" key={step.year}>
            <div className="time-card-top">
              <span className="year-pill">FY {step.year}</span>
              <small>{step.active_pit_area_sq_km} km² footprint</small>
            </div>
            <p className="time-notes">{step.notes}</p>
            <div className="time-metrics">
              <span>Veg Loss: <b>{step.vegetation_loss_pct}%</b></span>
              <span>Excavation: <b>{step.excavation_index}/100</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* UNREGISTERED MINING ALERTS SECTION */}
      <div className="unregistered-alerts-section">
        <div className="alerts-heading">
          <div>
            <p className="eyebrow">CONCESSION MONITORING & SURVEILLANCE</p>
            <h3>Potential Unregistered Mining Activity Alerts ({alertsData.data?.alerts.length ?? 0})</h3>
          </div>
          <span className="alert-badge-warn">
            <ShieldAlert size={14} /> REQUIRES STATUTORY INSPECTION
          </span>
        </div>

        <div className="alerts-list">
          {alertsData.data?.alerts.map((alert) => (
            <div className="alert-card" key={alert.id}>
              <div className="alert-card-header">
                <div className="alert-title-row">
                  <AlertTriangle size={18} className="alert-icon-high" />
                  <div>
                    <strong>{alert.title}</strong>
                    <span className="alert-loc">
                      {alert.district}, {alert.state} · Lat: {alert.latitude.toFixed(4)}°, Lon:{' '}
                      {alert.longitude.toFixed(4)}°
                    </span>
                  </div>
                </div>
                <span className={`severity-tag ${alert.severity.toLowerCase()}`}>
                  {alert.severity} SEVERITY
                </span>
              </div>

              <p className="alert-desc">{alert.details}</p>

              <div className="alert-footer">
                <div className="alert-meta-items">
                  <span>
                    Detected Area: <b>{alert.detected_change_area_ha} hectares</b>
                  </span>
                  <span>
                    Offset from Authorized Boundary:{' '}
                    <b>{alert.distance_to_authorized_boundary_m} m outside {alert.nearest_authorized_lease}</b>
                  </span>
                  <span>
                    Date: <b>{alert.detection_date}</b>
                  </span>
                </div>
                <button
                  className="ghost-button locate-alert-btn"
                  onClick={() => setMapCoordinate({ lat: alert.latitude, lng: alert.longitude })}
                >
                  <MapPin size={13} /> Focus Map on Coordinate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="change-disclaimer">
        <Info size={14} />
        <span>
          <strong>Environmental Compliance Note:</strong> Satellite multi-temporal difference analysis
          quantifies surface disturbance and vegetation loss. Alerts are advisory flags for field
          inspection by state mining departments.
        </span>
      </div>
    </div>
  );
}

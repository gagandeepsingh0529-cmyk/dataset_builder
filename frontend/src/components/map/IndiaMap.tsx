import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  LocateFixed,
  MapPin,
  Satellite,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import type { CandidateZone, HeatmapZone, MapPoint, UnregisteredMiningAlert } from '../../types/api';
import { HIGH_GRADE_REFERENCE_DEPOSITS, gradeBandFor } from '../../data/highGradeDeposits';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

function ClickCapture({ enabled }: { enabled: boolean }) {
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const setPredictionOpen = useFilterStore((state) => state.setPredictionOpen);
  const setPrediction = useFilterStore((state) => state.setPrediction);
  const addCandidate = useFilterStore((state) => state.addCandidate);

  const prediction = useMutation({
    mutationFn: apiClient.predict,
    onSuccess: (result, variables) => {
      setPrediction(result);
      setPredictionOpen(true);
      addCandidate({
        id: `cand-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        latitude: variables.Latitude,
        longitude: variables.Longitude,
        district: result.hydrated_from_district ?? undefined,
        predicted_tonnes: result.predicted_annual_production_tonnes,
        feasibility: result.feasibility_rating,
        coverage_level: result.training_data_coverage.level,
        coverage_score: result.training_data_coverage.score,
        distance_to_mine_km: result.training_data_coverage.distance_to_nearest_mine_km ?? undefined,
        elevation_m: result.environmental_context?.elevation_m ?? undefined,
        annual_precip_mm: result.environmental_context?.annual_precip_mm ?? undefined,
      });
    },
  });

  useMapEvents({
    click: (event) => {
      if (enabled) {
        const coordinate = { lat: event.latlng.lat, lng: event.latlng.lng };
        setMapCoordinate(coordinate);
        setPredictionOpen(true);
        prediction.mutate({ Latitude: coordinate.lat, Longitude: coordinate.lng });
      }
    },
  });
  return null;
}

export function IndiaMap({
  state,
  district,
  selectedDepositId,
  onSelectCandidate,
}: {
  state: string;
  district: string;
  selectedDepositId: string | null;
  onSelectCandidate?: (candidate: CandidateZone) => void;
}) {
  const [predictMode, setPredictMode] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [showSatelliteTile, setShowSatelliteTile] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showKnownMines, setShowKnownMines] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);

  const theme = useFilterStore((state) => state.theme);
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const selectDeposit = useFilterStore((state) => state.selectDeposit);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['map-deposits'],
    queryFn: apiClient.mapDeposits,
  });

  const heatmapQuery = useQuery({
    queryKey: ['prospectivity-heatmap'],
    queryFn: apiClient.prospectivityHeatmap,
  });

  const candidateQuery = useQuery({
    queryKey: ['candidate-zones'],
    queryFn: apiClient.candidateZones,
  });

  const alertsQuery = useQuery({
    queryKey: ['unregistered-alerts'],
    queryFn: apiClient.unregisteredAlerts,
  });

  const points =
    data?.points.filter(
      (point) =>
        (!state || point.state === state) && (!district || point.district === district)
    ) ?? [];

  const groups = useMemo(() => {
    const grouped = new Map<string, MapPoint[]>();
    points.forEach((point) => {
      const key = `${point.latitude.toFixed(4)}:${point.longitude.toFixed(4)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), point]);
    });
    return [...grouped.values()];
  }, [points]);

  const maxProduction = useMemo(
    () => Math.max(...points.map((point) => point.production_tonnes ?? 0), 1),
    [points]
  );

  const tileUrl = showSatelliteTile
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  if (isLoading)
    return (
      <div className="map-stage">
        <LoadingBlock />
      </div>
    );
  if (isError)
    return (
      <div className="map-stage">
        <ErrorState message="Geospatial deposit data unavailable." />
      </div>
    );

  return (
    <div className={`map-stage ${predictMode ? 'predict-mode' : ''}`}>
      <MapContainer
        center={[21.5, 80.5]}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        maxBounds={[
          [6.0, 68.0],
          [37.5, 97.5],
        ]}
        scrollWheelZoom
      >
        {!tileError && (
          <TileLayer
            key={`${theme}-${showSatelliteTile}`}
            attribution="&copy; CARTO &copy; ESRI World Imagery"
            url={tileUrl}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}
        <ClickCapture enabled={predictMode} />
        <MapSelection points={points} selectedDepositId={selectedDepositId} />

        {/* 1. PROSPECTIVITY HEATMAP OVERLAY */}
        {showHeatmap &&
          heatmapQuery.data?.zones.map((zone) => (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius * 111000}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: zone.score > 80 ? 0.35 : 0.22,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <div className="popup-badge" style={{ background: zone.color + '22', color: zone.color }}>
                    <Sparkles size={11} /> PROSPECTIVITY: {zone.score}%
                  </div>
                  <strong>{zone.name}</strong>
                  <span>Tier: <b>{zone.tier}</b></span>
                  <small>AI-derived potential mineralization anomaly based on multispectral SWIR + Sausar/IOG geology.</small>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* 2. CANDIDATE EXPLORATION ZONES (#01 - #05) */}
        {showCandidates &&
          candidateQuery.data?.candidates.map((cand) => (
            <CircleMarker
              key={cand.id}
              center={[cand.latitude, cand.longitude]}
              radius={10}
              pathOptions={{
                color: '#ec4899',
                weight: 3,
                fillColor: '#f43f5e',
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="map-popup cand-popup">
                  <div className="popup-badge" style={{ background: '#fdf2f8', color: '#be185d' }}>
                    <Zap size={11} /> CANDIDATE EXPLORATION ZONE {cand.id}
                  </div>
                  <strong>{cand.name}</strong>
                  <span>Region: {cand.region}</span>
                  <span>Prospectivity: <b>{cand.prospectivity_score}% ({cand.priority} Priority)</b></span>
                  <p>{cand.formation}</p>
                  <div className="cand-popup-actions">
                    <button
                      className="inspect-btn"
                      onClick={() => {
                        setMapCoordinate({ lat: cand.latitude, lng: cand.longitude });
                        if (onSelectCandidate) onSelectCandidate(cand);
                      }}
                    >
                      Inspect Spectral Analysis
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 3. UNREGISTERED MINING ACTIVITY ALERTS */}
        {showAlerts &&
          alertsQuery.data?.alerts.map((alert) => (
            <CircleMarker
              key={alert.id}
              center={[alert.latitude, alert.longitude]}
              radius={8}
              pathOptions={{
                color: '#ef4444',
                weight: 2,
                fillColor: '#dc2626',
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="map-popup alert-popup">
                  <div className="popup-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                    <AlertTriangle size={11} /> UNREGISTERED MINING ALERT
                  </div>
                  <strong>{alert.title}</strong>
                  <span>{alert.district}, {alert.state}</span>
                  <p>{alert.details}</p>
                  <small>Offset: {alert.distance_to_authorized_boundary_m}m outside {alert.nearest_authorized_lease}</small>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 4. HIGH-GRADE GEOLOGICAL REFERENCE BENCHMARKS */}
        {HIGH_GRADE_REFERENCE_DEPOSITS.map((deposit) => {
          const band = gradeBandFor(deposit.numericGrade);
          return (
            <CircleMarker
              key={deposit.name}
              center={[deposit.latitude, deposit.longitude]}
              radius={8}
              pathOptions={{
                color: band.color,
                weight: 1.5,
                fillColor: band.color,
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="map-popup high-grade-popup">
                  <div className="popup-badge">
                    <Sparkles size={11} /> IBM REFERENCE BENCHMARK
                  </div>
                  <strong>{deposit.name} · {deposit.region}</strong>
                  <span>Typical Grade: <b>{deposit.manganese}</b> ({band.name})</span>
                  <small>{deposit.notes}</small>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 5. OBSERVED MINING DISTRICT CLUSTERS */}
        {showKnownMines &&
          groups.map((group) => (
            <DepositGroup
              key={`${group[0].latitude}-${group[0].longitude}`}
              points={group}
              maxProduction={maxProduction}
              selectedDepositId={selectedDepositId}
              onInspect={(point) => {
                selectDeposit(point.deposit_id);
                setMapCoordinate({ lat: point.latitude, lng: point.longitude });
              }}
            />
          ))}

        {/* 6. USER-CLICKED TARGET COORDINATE PIN */}
        {coordinate && (
          <CircleMarker
            center={[coordinate.lat, coordinate.lng]}
            radius={11}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#60a5fa',
              fillOpacity: 0.95,
              weight: 3,
              className: 'target-pin',
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>ANALYZED TARGET COORDINATE</strong>
                <span>Lat: {coordinate.lat.toFixed(4)}°, Lon: {coordinate.lng.toFixed(4)}°</span>
                <small>Feasibility & spectral indices evaluated via MANGAN-AI engine.</small>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* FLOATING CONTROLS & LAYER SWITCHER */}
      <div className="map-floating-controls">
        <button
          className={`map-mode-toggle ${predictMode ? 'active' : ''}`}
          onClick={() => setPredictMode((v) => !v)}
          title={predictMode ? 'Click anywhere on India map to analyze' : 'Click mode disabled'}
        >
          {predictMode ? <Crosshair size={15} /> : <LocateFixed size={15} />}
          <span>{predictMode ? 'Click-to-Analyze Active' : 'Enable Map Analysis'}</span>
        </button>

        <div className="layers-dropdown-container">
          <button
            className={`map-mode-toggle layers-btn ${showLayersDropdown ? 'active' : ''}`}
            onClick={() => setShowLayersDropdown((v) => !v)}
          >
            <Layers size={15} />
            <span>GIS Layer Controls</span>
          </button>

          {showLayersDropdown && (
            <div className="layers-panel-popup">
              <span className="layers-title">Interactive GIS Overlays:</span>
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showSatelliteTile}
                  onChange={(e) => setShowSatelliteTile(e.target.checked)}
                />
                <Satellite size={13} /> Satellite Basemap (ESRI)
              </label>
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                />
                <span className="dot purple" /> Prospectivity Heatmap (0-100%)
              </label>
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showCandidates}
                  onChange={(e) => setShowCandidates(e.target.checked)}
                />
                <span className="dot pink" /> Candidate Zones (#01-#05)
              </label>
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showKnownMines}
                  onChange={(e) => setShowKnownMines(e.target.checked)}
                />
                <span className="dot green" /> Known Operating Mines
              </label>
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showAlerts}
                  onChange={(e) => setShowAlerts(e.target.checked)}
                />
                <span className="dot red" /> Unregistered Mining Alerts
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="map-legend">
        <span className="legend-item"><i className="legend-dot candidate" /> Candidate Zone</span>
        <span className="legend-item"><i className="legend-dot observed" /> Known Mine</span>
        <span className="legend-item"><i className="legend-dot alert-red" /> Unregistered Alert</span>
        <span className="legend-item"><i className="legend-dot high-grade" /> IBM Benchmark</span>
      </div>

      {tileError && (
        <div className="map-fallback">
          <strong>Basemap layer fallback</strong>
          <span>Vector markers and analysis coordinates remain fully functional.</span>
        </div>
      )}

      <div className="map-note">
        <MapPin size={12} /> Click anywhere across India to resolve geological context & predict feasibility.
      </div>
    </div>
  );
}

function MapSelection({
  points,
  selectedDepositId,
}: {
  points: MapPoint[];
  selectedDepositId: string | null;
}) {
  const map = useMap();
  const selected = points.find((point) => point.deposit_id === selectedDepositId);
  useEffect(() => {
    if (selected) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 6), {
        animate: true,
      });
    }
  }, [map, selected]);
  return null;
}

function DepositGroup({
  points,
  maxProduction,
  selectedDepositId,
  onInspect,
}: {
  points: MapPoint[];
  maxProduction: number;
  selectedDepositId: string | null;
  onInspect: (point: MapPoint) => void;
}) {
  const totalProduction = points.reduce((sum, point) => sum + (point.production_tonnes ?? 0), 0);
  const selected = points.some((point) => point.deposit_id === selectedDepositId);
  const radius =
    points.length > 1
      ? 8 + Math.min(8, points.length * 2)
      : 5 + Math.min(10, (totalProduction / maxProduction) * 10);

  return (
    <CircleMarker
      center={[points[0].latitude, points[0].longitude]}
      radius={selected ? radius + 4 : radius}
      pathOptions={{
        color: selected ? '#10b981' : '#f59e0b',
        weight: selected ? 3 : 1.5,
        fillColor: selected ? '#10b981' : '#f59e0b',
        fillOpacity: 0.8,
      }}
    >
      <Popup>
        <div className="map-popup">
          <div className="popup-header">
            <strong>{points[0].district ?? 'Mining District'}</strong>
            <span>{points[0].state}</span>
          </div>
          {points.length > 1 && (
            <div className="popup-subhead">
              {points.length} historical yearly observations at this center
            </div>
          )}
          <div className="popup-records">
            {points.map((point) => (
              <div key={`${point.deposit_id}-${point.production_tonnes}`} className="cluster-record">
                <div>
                  <span className="record-id">{point.deposit_id ?? 'District Mine Record'}</span>
                  <b className="record-qty">
                    {point.production_tonnes != null
                      ? `${point.production_tonnes.toLocaleString('en-IN')} tonnes/yr`
                      : 'N/A'}
                  </b>
                </div>
                {point.formation && <small className="record-formation">{point.formation}</small>}
                <button className="inspect-btn" onClick={() => onInspect(point)}>
                  Inspect Historical Record
                </button>
              </div>
            ))}
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

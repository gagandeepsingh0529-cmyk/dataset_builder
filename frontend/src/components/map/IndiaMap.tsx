import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Crosshair, LocateFixed } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import type { MapPoint } from '../../types/api';
import { HIGH_GRADE_REFERENCE_DEPOSITS, gradeBandFor } from '../../data/highGradeDeposits';
import { ErrorState, LoadingBlock } from '../ui/AsyncState';

function ClickCapture({ enabled }: { enabled: boolean }) {
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const setPredictionOpen = useFilterStore((state) => state.setPredictionOpen);
  const setPrediction = useFilterStore((state) => state.setPrediction);
  const prediction = useMutation({ mutationFn: apiClient.predict, onSuccess: (result) => { setPrediction(result); setPredictionOpen(true); } });
  useMapEvents({ click: (event) => { if (enabled) { const coordinate = { lat: event.latlng.lat, lng: event.latlng.lng }; setMapCoordinate(coordinate); setPredictionOpen(true); prediction.mutate({ Latitude: coordinate.lat, Longitude: coordinate.lng }); } } });
  return null;
}

export function IndiaMap({ state, district, selectedDepositId }: { state: string; district: string; selectedDepositId: string | null }) {
  const [predictMode, setPredictMode] = useState(false);
  const [tileError, setTileError] = useState(false);
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const selectDeposit = useFilterStore((state) => state.selectDeposit);
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);
  const { data, isLoading, isError } = useQuery({ queryKey: ['map-deposits'], queryFn: apiClient.mapDeposits });
  const points = data?.points.filter((point) => (!state || point.state === state) && (!district || point.district === district)) ?? [];
  const groups = useMemo(() => {
    const grouped = new Map<string, MapPoint[]>();
    points.forEach((point) => {
      const key = `${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), point]);
    });
    return [...grouped.values()];
  }, [points]);
  const maxProduction = useMemo(() => Math.max(...points.map((point) => point.production_tonnes ?? 0), 1), [points]);

  if (isLoading) return <div className="map-stage"><LoadingBlock /></div>;
  if (isError) return <div className="map-stage"><ErrorState message="Map points unavailable." /></div>;
  return <div className={`map-stage ${predictMode ? 'predict-mode' : ''}`}>
    <MapContainer center={[20.5937, 78.9629]} zoom={5} minZoom={4} maxZoom={8} maxBounds={[[4, 60], [40, 105]]} scrollWheelZoom>
      {!tileError && <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" eventHandlers={{ tileerror: () => setTileError(true) }} />}
      <ClickCapture enabled={predictMode} />
      <MapSelection points={points} selectedDepositId={selectedDepositId} />
      {HIGH_GRADE_REFERENCE_DEPOSITS.map((deposit) => {
        const band = gradeBandFor(deposit.numericGrade);
        return <CircleMarker key={deposit.name} center={[deposit.latitude, deposit.longitude]} radius={10} pathOptions={{ color: band.color, weight: 3, fillColor: band.color, fillOpacity: 0.9 }}><Popup><div className="map-popup high-grade-popup"><strong>HIGH-GRADE REFERENCE</strong><b>{deposit.name} · {deposit.region}</b><span>Mn: {deposit.manganese} · {band.name}</span><small>{deposit.notes}</small><small>Approximate regional reference; not an inventory record.</small></div></Popup></CircleMarker>;
      })}
      {groups.map((group) => <DepositGroup key={`${group[0].latitude}-${group[0].longitude}`} points={group} maxProduction={maxProduction} selectedDepositId={selectedDepositId} onInspect={(point) => { selectDeposit(point.deposit_id); setMapCoordinate({ lat: point.latitude, lng: point.longitude }); }} />)}
      {coordinate && <CircleMarker center={[coordinate.lat, coordinate.lng]} radius={10} pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.9, className: 'target-pin' }} />}
    </MapContainer>
    <button className={`map-mode ${predictMode ? 'active' : ''}`} onClick={() => setPredictMode((value) => !value)}>{predictMode ? <Crosshair size={15} /> : <LocateFixed size={15} />}{predictMode ? 'Click map to test' : 'Test feasibility on map'}</button>
    <div className="map-legend"><span><i className="legend-dot high-grade" /> High-grade reference</span><span><i className="legend-dot small" /> Lower output</span><span><i className="legend-dot large" /> Higher output</span></div>
    {tileError && <div className="map-fallback"><strong>Basemap unavailable</strong><span>Deposit coordinates remain available for analysis.</span></div>}
    <div className="map-note">Coordinates represent district-level centroids where exact deposit coordinates are unavailable.</div>
  </div>;
}

function MapSelection({ points, selectedDepositId }: { points: MapPoint[]; selectedDepositId: string | null }) {
  const map = useMap();
  const selected = points.find((point) => point.deposit_id === selectedDepositId);
  useEffect(() => {
    if (selected) map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 6), { animate: true });
  }, [map, selected]);
  return null;
}

function DepositGroup({ points, maxProduction, selectedDepositId, onInspect }: { points: MapPoint[]; maxProduction: number; selectedDepositId: string | null; onInspect: (point: MapPoint) => void }) {
  const totalProduction = points.reduce((sum, point) => sum + (point.production_tonnes ?? 0), 0);
  const selected = points.some((point) => point.deposit_id === selectedDepositId);
  const radius = points.length > 1 ? 9 + Math.min(9, points.length) : 5 + Math.min(11, (totalProduction / maxProduction) * 11);
  return <CircleMarker center={[points[0].latitude, points[0].longitude]} radius={selected ? radius + 3 : radius} pathOptions={{ color: selected ? '#34d399' : '#f59e0b', weight: selected ? 3 : 1, fillColor: selected ? '#34d399' : '#f59e0b', fillOpacity: 0.72 }}><Popup><div className="map-popup">{points.length > 1 && <strong>{points.length} inventory records at this centroid</strong>}{points.map((point) => <div key={point.deposit_id} className="cluster-record"><span>{point.deposit_id ?? 'Unclassified deposit'} · {point.district ?? 'Unknown district'}</span><b>{point.production_tonnes?.toLocaleString('en-IN') ?? 'N/A'} tonnes</b><button onClick={() => onInspect(point)}>Inspect details</button></div>)}</div></Popup></CircleMarker>;
}

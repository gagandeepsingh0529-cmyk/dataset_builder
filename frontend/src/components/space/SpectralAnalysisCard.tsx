import { useQuery } from '@tanstack/react-query';
import { Activity, Compass, Info, Sparkles } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { LoadingBlock } from '../ui/AsyncState';

export function SpectralAnalysisCard() {
  const coordinate = useFilterStore((state) => state.mapCoordinate);
  const theme = useFilterStore((state) => state.theme);

  const lat = coordinate?.lat ?? 21.63;
  const lng = coordinate?.lng ?? 85.58;

  const spectral = useQuery({
    queryKey: ['spectral-analysis', lat, lng],
    queryFn: () => apiClient.spectralAnalysis({ latitude: lat, longitude: lng }),
  });

  if (spectral.isLoading) return <LoadingBlock />;

  const gridColor = theme === 'light' ? '#e2e8f0' : '#1f2c42';
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  // Format signature chart data
  const chartData = [
    { wavelength: 450, mn_ore: 0.06, host_rock: 0.12, laterite: 0.10, vegetation: 0.04 },
    { wavelength: 550, mn_ore: 0.08, host_rock: 0.18, laterite: 0.15, vegetation: 0.12 },
    { wavelength: 650, mn_ore: 0.09, host_rock: 0.26, laterite: 0.22, vegetation: 0.05 },
    { wavelength: 850, mn_ore: 0.12, host_rock: 0.32, laterite: 0.30, vegetation: 0.52 },
    { wavelength: 1050, mn_ore: 0.14, host_rock: 0.28, laterite: 0.25, vegetation: 0.48 },
    { wavelength: 1250, mn_ore: 0.17, host_rock: 0.34, laterite: 0.31, vegetation: 0.40 },
    { wavelength: 1600, mn_ore: 0.24, host_rock: 0.42, laterite: 0.38, vegetation: 0.22 },
    { wavelength: 2000, mn_ore: 0.19, host_rock: 0.38, laterite: 0.33, vegetation: 0.10 },
    { wavelength: 2200, mn_ore: 0.13, host_rock: 0.32, laterite: 0.24, vegetation: 0.15 },
    { wavelength: 2350, mn_ore: 0.11, host_rock: 0.30, laterite: 0.22, vegetation: 0.08 },
  ];

  return (
    <div className="spectral-analysis-card panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SPECTRAL MINERALOGY & BAND RATIO INTELLIGENCE</p>
          <h2>Diagnostic Mineral Reflectance Signatures</h2>
        </div>
        <span className="live-tag">
          <Activity size={13} /> SWIR / VNIR SPECTROMETRY
        </span>
      </div>

      <div className="spectral-chart-wrap">
        <div className="chart-header">
          <strong>Spectral Reflectance Response Curves (400 nm — 2400 nm)</strong>
          <small>
            Diagnostic Pyrolusite/Psilomelane broad absorption feature at 2.20 µm (SWIR-2)
          </small>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="wavelength"
              tick={{ fill: textColor, fontSize: 11 }}
              unit=" nm"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                background: theme === 'light' ? '#ffffff' : '#0f172a',
                border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid #334155',
                color: theme === 'light' ? '#0f172a' : '#f8fafc',
                fontSize: '11px',
                borderRadius: '6px',
              }}
              formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="mn_ore"
              name="Manganese Ore (Pyrolusite)"
              stroke="#9333ea"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="host_rock"
              name="Host Rock (BIF / Quartzite)"
              stroke="#ea580c"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="laterite"
              name="Lateritic Soil Mantle"
              stroke="#b45309"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="vegetation"
              name="Vegetation Canopy (NDVI)"
              stroke="#16a34a"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {spectral.data?.indices && (
        <div className="spectral-indices-grid">
          <div className="index-card">
            <div className="idx-top">
              <span>Manganese Oxide Ratio</span>
              <strong className="idx-val">
                {spectral.data.indices.manganese_oxide_index.value}
              </strong>
            </div>
            <code className="idx-formula">
              {spectral.data.indices.manganese_oxide_index.formula}
            </code>
            <p className="idx-desc">
              {spectral.data.indices.manganese_oxide_index.interpretation}
            </p>
          </div>

          <div className="index-card">
            <div className="idx-top">
              <span>Ferrous Mineral Index</span>
              <strong className="idx-val">
                {spectral.data.indices.ferrous_mineral_ratio.value}
              </strong>
            </div>
            <code className="idx-formula">
              {spectral.data.indices.ferrous_mineral_ratio.formula}
            </code>
            <p className="idx-desc">
              {spectral.data.indices.ferrous_mineral_ratio.interpretation}
            </p>
          </div>

          <div className="index-card">
            <div className="idx-top">
              <span>Clay Alteration Index</span>
              <strong className="idx-val">
                {spectral.data.indices.clay_alteration_index.value}
              </strong>
            </div>
            <code className="idx-formula">
              {spectral.data.indices.clay_alteration_index.formula}
            </code>
            <p className="idx-desc">
              {spectral.data.indices.clay_alteration_index.interpretation}
            </p>
          </div>

          <div className="index-card">
            <div className="idx-top">
              <span>Vegetation Index (NDVI)</span>
              <strong className="idx-val">{spectral.data.indices.ndvi.value}</strong>
            </div>
            <code className="idx-formula">{spectral.data.indices.ndvi.formula}</code>
            <p className="idx-desc">{spectral.data.indices.ndvi.interpretation}</p>
          </div>
        </div>
      )}

      <div className="spectral-disclaimer">
        <Info size={14} />
        <span>
          <strong>Scientific Principle:</strong> Multispectral band ratios detect surface chemical
          absorption anomalies. Satellite indices assist exploration target prioritization and must
          be coupled with ground geological mapping and drilling.
        </span>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
  LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { RotateCcw, BarChart3, TrendingUp, Clock, Grid3X3, Radar as RadarIcon } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import {
  solarData, filterData, CIUDADES, ESTACIONES, TARIFAS, ESTACION_COLORS,
  getGenerationByCity, getScatterData, getHourlyProfile,
  computeCorrelation, CORRELATION_VARS, CORRELATION_LABELS,
  getRadarByTariff, TARIFA_COLORS,
} from '../data/solarData';

interface AnalysisProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

// --- Tooltip personalizado para recharts ---
const tooltipStyle = {
  backgroundColor: '#162e1d',
  borderColor: 'rgba(19,236,91,0.2)',
  borderRadius: '8px',
  fontSize: '12px',
};

// --- Color por nubosidad para scatter ---
function cloudColor(nubosidad: number): string {
  if (nubosidad < 30) return '#13ec5b';
  if (nubosidad < 60) return '#eab308';
  return '#ef4444';
}

// --- Componente Heatmap ---
const Heatmap: React.FC<{ matrix: number[][]; labels: string[] }> = ({ matrix, labels }) => {
  const cellSize = Math.min(40, Math.floor(600 / labels.length));

  function getColor(val: number): string {
    if (val >= 0) {
      const t = Math.min(val, 1);
      const r = Math.round(55 + (19 - 55) * t);
      const g = Math.round(65 + (236 - 65) * t);
      const b = Math.round(81 + (91 - 81) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = Math.min(Math.abs(val), 1);
      const r = Math.round(55 + (239 - 55) * t);
      const g = Math.round(65 + (68 - 65) * t);
      const b = Math.round(81 + (68 - 81) * t);
      return `rgb(${r},${g},${b})`;
    }
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <div className="inline-block">
        {/* Header labels */}
        <div className="flex" style={{ marginLeft: cellSize + 4 }}>
          {labels.map((label, i) => (
            <div
              key={i}
              className="text-[9px] text-gray-400 text-center overflow-hidden"
              style={{ width: cellSize, minWidth: cellSize }}
              title={CORRELATION_VARS[i]}
            >
              {label}
            </div>
          ))}
        </div>
        {/* Matrix rows */}
        {matrix.map((row, i) => (
          <div key={i} className="flex items-center">
            <div
              className="text-[9px] text-gray-400 text-right pr-1 shrink-0"
              style={{ width: cellSize + 4 }}
              title={CORRELATION_VARS[i]}
            >
              {labels[i]}
            </div>
            {row.map((val, j) => (
              <div
                key={j}
                className="flex items-center justify-center border border-black/20 cursor-default transition-transform hover:scale-110 hover:z-10"
                style={{
                  width: cellSize,
                  height: cellSize,
                  minWidth: cellSize,
                  backgroundColor: getColor(val),
                }}
                title={`${CORRELATION_VARS[i]} vs ${CORRELATION_VARS[j]}: ${val}`}
              >
                <span className="text-[8px] font-mono text-white/80 select-none">
                  {val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Tooltip scatter personalizado ---
const ScatterTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#162e1d] border border-primary/20 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-white font-bold mb-1">{d.ciudad}</p>
      <p className="text-gray-300">Hora: {d.hora}:00 | {d.estacion}</p>
      <p className="text-gray-300">Irradiancia: <span className="text-primary">{d.irradiancia} W/m²</span></p>
      <p className="text-gray-300">Generación: <span className="text-primary">{d.generacion} kWh</span></p>
      <p className="text-gray-300">Nubosidad: <span style={{ color: cloudColor(d.nubosidad) }}>{d.nubosidad}%</span></p>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export const Analysis: React.FC<AnalysisProps> = ({ onNavigate, showNotification }) => {
  const [ciudad, setCiudad] = useState('Todas');
  const [estacion, setEstacion] = useState('Todas');
  const [tarifa, setTarifa] = useState('Todas');

  const filteredData = useMemo(
    () => filterData(solarData, ciudad, estacion, tarifa),
    [ciudad, estacion, tarifa]
  );

  // Datos para cada gráfica
  const barData = useMemo(() => getGenerationByCity(filteredData), [filteredData]);
  const scatterPoints = useMemo(() => getScatterData(filteredData), [filteredData]);
  const hourlyData = useMemo(
    () => getHourlyProfile(filterData(solarData, ciudad, 'Todas', tarifa)),
    [ciudad, tarifa]
  );
  const corrMatrix = useMemo(() => computeCorrelation(filteredData), [filteredData]);
  const corrLabels = CORRELATION_VARS.map(v => CORRELATION_LABELS[v] || v);
  const radarData = useMemo(
    () => getRadarByTariff(filterData(solarData, ciudad, estacion, 'Todas')),
    [ciudad, estacion]
  );

  const handleReset = () => {
    setCiudad('Todas');
    setEstacion('Todas');
    setTarifa('Todas');
    showNotification('Filtros restablecidos', 'info');
  };

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-primary/50 transition-colors";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-4 sticky top-0 z-10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Análisis Avanzado</h1>
            <p className="text-sm text-gray-400">{filteredData.length.toLocaleString()} registros · {new Set(filteredData.map(d => d.Ciudad)).size} ciudades</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={ciudad} onChange={e => setCiudad(e.target.value)} className={selectClass}>
              <option value="Todas">Todas las ciudades</option>
              {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={estacion} onChange={e => setEstacion(e.target.value)} className={selectClass}>
              <option value="Todas">Todas las estaciones</option>
              {ESTACIONES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={tarifa} onChange={e => setTarifa(e.target.value)} className={selectClass}>
              <option value="Todas">Todas las tarifas</option>
              {TARIFAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-primary bg-black/20 border border-gray-700 rounded-lg hover:border-primary/30 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Row 1: Bar + Scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfica 1: Barras generación por ciudad */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Generación Solar por Ciudad</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">Promedio de generación (kWh) por ciudad</p>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#13ec5b" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#13ec5b" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="ciudad" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`${value.toFixed(3)} kWh`, 'Generación promedio']}
                    />
                    <Bar dataKey="generacion" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Gráfica 2: Scatter irradiancia vs generación */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Irradiancia vs Generación</h2>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-sm text-gray-400">Color por nubosidad:</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#13ec5b]"></span> Baja</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#eab308]"></span> Media</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Alta</span>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="irradiancia"
                      type="number"
                      name="Irradiancia"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'W/m²', position: 'insideBottomRight', offset: -5, fill: '#6b7280', fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="generacion"
                      type="number"
                      name="Generación"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
                    />
                    <ZAxis dataKey="nubosidad" range={[20, 80]} />
                    <Tooltip content={<ScatterTooltip />} />
                    <Scatter
                      data={scatterPoints}
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill={cloudColor(payload.nubosidad)}
                            fillOpacity={0.6}
                            stroke={cloudColor(payload.nubosidad)}
                            strokeWidth={0.5}
                          />
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Row 2: Perfil horario (full width) */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Perfil Horario por Estación</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Generación solar promedio por hora del día
              {ciudad !== 'Todas' && ` en ${ciudad}`}
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="hora"
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}h`}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v} kWh`}
                  />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value: string) => <span className="text-gray-300">{value}</span>}
                  />
                  {ESTACIONES.map(est => (
                    <Line
                      key={est}
                      type="monotone"
                      dataKey={est}
                      stroke={ESTACION_COLORS[est]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Row 3: Heatmap + Boxplot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfica 4: Heatmap de correlación */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Correlación entre Variables</h2>
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></span> -1</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#374151' }}></span> 0</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#13ec5b' }}></span> +1</span>
              </div>
              <Heatmap matrix={corrMatrix} labels={corrLabels} />
            </GlassCard>

            {/* Gráfica 5: Radar por tarifa */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <RadarIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Perfil por Tarifa CFE</h2>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Comparativa normalizada de métricas clave por tipo de tarifa
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                {TARIFAS.map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TARIFA_COLORS[t] }} />
                    Tarifa {t}
                  </span>
                ))}
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: '#4b5563', fontSize: 9 }}
                      axisLine={false}
                    />
                    {TARIFAS.map(t => (
                      <Radar
                        key={t}
                        name={`Tarifa ${t}`}
                        dataKey={t}
                        stroke={TARIFA_COLORS[t]}
                        fill={TARIFA_COLORS[t]}
                        fillOpacity={0.08}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#162e1d',
                        borderColor: 'rgba(19,236,91,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [`${value}%`, name]}
                      labelFormatter={(_: any, payload: any[]) => {
                        if (payload && payload.length > 0 && payload[0].payload) {
                          return payload[0].payload.fullName;
                        }
                        return '';
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

        </div>
      </div>
    </div>
  );
};

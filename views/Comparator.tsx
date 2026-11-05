import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitCompareArrows, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { solarData, CIUDADES, ESTACIONES, filterData, getHourlyProfile } from '../data/solarData';

interface ComparatorProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

interface CityStats {
  generacion: number;
  irradiancia: number;
  temperatura: number;
  nubosidad: number;
  costo: number;
  consumoNeto: number;
  registros: number;
}

function getCityStats(ciudad: string): CityStats {
  const data = filterData(solarData, ciudad);
  const n = data.length || 1;
  return {
    generacion: data.reduce((a, d) => a + d.Generacion_Solar_kWh, 0) / n,
    irradiancia: data.reduce((a, d) => a + d.Irradiancia_Wm2, 0) / n,
    temperatura: data.reduce((a, d) => a + d.Temperatura_C, 0) / n,
    nubosidad: data.reduce((a, d) => a + d.Nubosidad, 0) / n,
    costo: data.reduce((a, d) => a + d.Costo_Estimado_MXN, 0) / n,
    consumoNeto: data.reduce((a, d) => a + d.Consumo_Neto_kWh, 0) / n,
    registros: data.length,
  };
}

function CompareRow({ label, val1, val2, unit, higherBetter = true }: {
  label: string; val1: number; val2: number; unit: string; higherBetter?: boolean;
}) {
  const diff = val1 - val2;
  const pct = val2 !== 0 ? Math.abs((diff / val2) * 100) : 0;
  const better1 = higherBetter ? diff > 0 : diff < 0;
  const equal = Math.abs(pct) < 1;

  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-white/5">
      <div className={`text-sm font-mono text-right pr-4 ${better1 && !equal ? 'text-primary' : 'text-white'}`}>
        {val1.toFixed(2)} {unit}
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        {equal ? (
          <Minus className="w-3 h-3 text-gray-500 mx-auto" />
        ) : better1 ? (
          <span className="text-[10px] text-primary font-bold">+{pct.toFixed(0)}%</span>
        ) : (
          <span className="text-[10px] text-red-400 font-bold">-{pct.toFixed(0)}%</span>
        )}
      </div>
      <div className={`text-sm font-mono pl-4 ${!better1 && !equal ? 'text-primary' : 'text-white'}`}>
        {val2.toFixed(2)} {unit}
      </div>
    </div>
  );
}

export const Comparator: React.FC<ComparatorProps> = () => {
  const [ciudad1, setCiudad1] = useState('Hermosillo');
  const [ciudad2, setCiudad2] = useState('CDMX');

  const stats1 = useMemo(() => getCityStats(ciudad1), [ciudad1]);
  const stats2 = useMemo(() => getCityStats(ciudad2), [ciudad2]);

  // Perfil horario superpuesto
  const hourlyData = useMemo(() => {
    const data1 = filterData(solarData, ciudad1);
    const data2 = filterData(solarData, ciudad2);
    const grouped1: Record<number, number[]> = {};
    const grouped2: Record<number, number[]> = {};
    for (let h = 0; h < 24; h++) { grouped1[h] = []; grouped2[h] = []; }
    data1.forEach(d => grouped1[d.Hora]?.push(d.Generacion_Solar_kWh));
    data2.forEach(d => grouped2[d.Hora]?.push(d.Generacion_Solar_kWh));

    return Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      [ciudad1]: grouped1[h].length ? +(grouped1[h].reduce((a, b) => a + b, 0) / grouped1[h].length).toFixed(3) : 0,
      [ciudad2]: grouped2[h].length ? +(grouped2[h].reduce((a, b) => a + b, 0) / grouped2[h].length).toFixed(3) : 0,
    }));
  }, [ciudad1, ciudad2]);

  const diffPct = stats2.generacion !== 0
    ? (((stats1.generacion - stats2.generacion) / stats2.generacion) * 100)
    : 0;

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary/50 w-full";
  const tooltipStyle = { backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GitCompareArrows className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Comparador de Ciudades</h1>
            <p className="text-sm text-gray-400">Compara el potencial solar entre dos ciudades</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Selectores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Ciudad 1</label>
              <select value={ciudad1} onChange={e => setCiudad1(e.target.value)} className={selectClass}>
                {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <GitCompareArrows className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Ciudad 2</label>
              <select value={ciudad2} onChange={e => setCiudad2(e.target.value)} className={selectClass}>
                {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Indicador principal */}
          <GlassCard className="text-center py-6">
            <p className="text-sm text-gray-400 mb-2">Diferencia en Generación Solar</p>
            <div className="flex items-center justify-center gap-3">
              {diffPct > 0 ? (
                <ArrowUp className="w-6 h-6 text-primary" />
              ) : diffPct < 0 ? (
                <ArrowDown className="w-6 h-6 text-red-400" />
              ) : (
                <Minus className="w-6 h-6 text-gray-400" />
              )}
              <span className={`text-3xl font-bold ${diffPct > 0 ? 'text-primary' : diffPct < 0 ? 'text-red-400' : 'text-white'}`}>
                {Math.abs(diffPct).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {diffPct > 0
                ? `${ciudad1} genera ${Math.abs(diffPct).toFixed(0)}% más que ${ciudad2}`
                : diffPct < 0
                ? `${ciudad2} genera ${Math.abs(diffPct).toFixed(0)}% más que ${ciudad1}`
                : 'Ambas ciudades generan cantidad similar'}
            </p>
          </GlassCard>

          {/* Tabla comparativa */}
          <GlassCard>
            <div className="grid grid-cols-3 items-center pb-3 border-b border-white/10 mb-2">
              <div className="text-right pr-4 text-sm font-bold text-primary">{ciudad1}</div>
              <div className="text-center text-xs text-gray-500 uppercase">Métrica</div>
              <div className="pl-4 text-sm font-bold text-blue-400">{ciudad2}</div>
            </div>
            <CompareRow label="Generación (kWh)" val1={stats1.generacion} val2={stats2.generacion} unit="kWh" />
            <CompareRow label="Irradiancia (W/m²)" val1={stats1.irradiancia} val2={stats2.irradiancia} unit="W/m²" />
            <CompareRow label="Temperatura (°C)" val1={stats1.temperatura} val2={stats2.temperatura} unit="°C" higherBetter={false} />
            <CompareRow label="Nubosidad (%)" val1={stats1.nubosidad} val2={stats2.nubosidad} unit="%" higherBetter={false} />
            <CompareRow label="Costo Est. ($MXN)" val1={stats1.costo} val2={stats2.costo} unit="$" higherBetter={false} />
          </GlassCard>

          {/* Perfil horario superpuesto */}
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-1">Perfil Horario Superpuesto</h3>
            <p className="text-sm text-gray-400 mb-4">Generación solar promedio por hora del día</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hora" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v} kWh`} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey={ciudad1} stroke="#13ec5b" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={ciudad2} stroke="#3b82f6" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
};

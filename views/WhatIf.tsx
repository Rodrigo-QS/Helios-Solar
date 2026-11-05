import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  SlidersHorizontal, Zap, DollarSign, AlertTriangle, Sun, Cloud,
  Thermometer, Loader2, MapPin, Calendar, Clock, Shield, TrendingUp, BatteryCharging,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { predictGeneration, predictCost, assessRisk, GenerationResponse, CostResponse, RiskResponse, Fuente } from '../services/api';
import { estimateGenerationKwh } from '../services/localModel';
import { CIUDADES, ESTACIONES, TARIFAS, CFE_TARIFA_MXN_KWH } from '../data/solarData';

interface WhatIfProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

interface Params {
  ciudad: string;
  estacion: string;
  hora: number;
  nubosidad: number;
  num_paneles: number;
  tarifa: string;
  temperatura: number;
  irradiancia: number;
}

const DEFAULT_PARAMS: Params = {
  ciudad: 'Hermosillo',
  estacion: 'Verano',
  hora: 12,
  nubosidad: 20,
  num_paneles: 10,
  tarifa: '1',
  temperatura: 35,
  irradiancia: 800,
};

const ESTACION_ICONS: Record<string, string> = {
  'Invierno': '❄',
  'Primavera': '🌸',
  'Verano': '☀',
  'Otoño': '🍂',
};

/** Mes representativo de cada estación (la API usa junio si no se envía). */
const MES_POR_ESTACION: Record<string, number> = {
  'Invierno': 1, 'Primavera': 4, 'Verano': 7, 'Otoño': 10,
};

function estimateIrradiance(hora: number, nubosidad: number): number {
  if (hora < 6 || hora > 19) return 0;
  const peak = 12;
  const spread = 4;
  const solar = Math.exp(-0.5 * Math.pow((hora - peak) / spread, 2)) * 1000;
  const cloudFactor = 1 - (nubosidad / 100) * 0.8;
  return Math.round(solar * cloudFactor);
}

export const WhatIf: React.FC<WhatIfProps> = ({ showNotification }) => {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [genResult, setGenResult] = useState<GenerationResponse | null>(null);
  const [costResult, setCostResult] = useState<CostResponse | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fuente, setFuente] = useState<Fuente | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const capacidad = +(params.num_paneles * 0.45).toFixed(2);

  const runPrediction = useCallback(async (p: Params) => {
    setLoading(true);
    const cap = +(p.num_paneles * 0.45).toFixed(2);
    const irr = estimateIrradiance(p.hora, p.nubosidad);

    try {
      const [gen, risk] = await Promise.all([
        predictGeneration({
          ciudad: p.ciudad,
          hora: p.hora,
          estacion: p.estacion,
          mes: MES_POR_ESTACION[p.estacion],
          temperatura: p.temperatura,
          irradiancia: irr,
          nubosidad: p.nubosidad,
          num_paneles: p.num_paneles,
          capacidad_kw: cap,
          tarifa_cfe: p.tarifa,
        }),
        assessRisk({
          ciudad: p.ciudad,
          estacion: p.estacion,
          mes: MES_POR_ESTACION[p.estacion],
          nubosidad: p.nubosidad,
          irradiancia: irr,
          temperatura: p.temperatura,
          hora: p.hora,
          num_paneles: p.num_paneles,
          capacidad_kw: cap,
        }),
      ]);

      setGenResult(gen);
      setRiskResult(risk);
      setFuente(gen.fuente);

      try {
        const cost = await predictCost({
          ciudad: p.ciudad,
          tarifa_cfe: p.tarifa,
          consumo_kwh: 10,
          generacion_kwh: gen.generacion_predicha_kwh,
        });
        setCostResult(cost);
      } catch {
        setCostResult(null);
      }
    } catch {
      setFuente(null);
      setGenResult(null);
      setCostResult(null);
      setRiskResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPrediction(params), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [params, runPrediction]);

  const update = (key: keyof Params, value: string | number) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'hora' || key === 'nubosidad') {
        next.irradiancia = estimateIrradiance(
          key === 'hora' ? value as number : prev.hora,
          key === 'nubosidad' ? value as number : prev.nubosidad,
        );
      }
      return next;
    });
  };

  // kWh generados por cada W/m² de irradiancia. Se toma de la predicción de la
  // hora seleccionada; de noche (irradiancia 0) se usa la estimación física
  // para que el perfil diario no se vuelva cero.
  const kwhPerIrradiance = useMemo(() => {
    const currentIrr = estimateIrradiance(params.hora, params.nubosidad);
    if (genResult && currentIrr > 0) return genResult.generacion_predicha_kwh / currentIrr;
    return estimateGenerationKwh(capacidad, 1000, params.temperatura) / 1000;
  }, [genResult, params.hora, params.nubosidad, params.temperatura, capacidad]);

  // Hourly profile data
  const hourlyChart = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const irr = estimateIrradiance(h, params.nubosidad);
      return { hora: h, generacion: +(irr * kwhPerIrradiance).toFixed(3), irradiancia: irr };
    });
  }, [params.nubosidad, kwhPerIrradiance]);

  // Daily totals
  const dailyGeneration = useMemo(
    () => hourlyChart.reduce((sum, h) => sum + h.generacion, 0),
    [hourlyChart]
  );

  const rate = CFE_TARIFA_MXN_KWH[params.tarifa] ?? 1.65;
  const dailySavings = dailyGeneration * rate;

  // Risk helpers
  const riskColor = riskResult
    ? riskResult.riesgo === 'alto' ? 'text-red-400' : riskResult.riesgo === 'medio' ? 'text-yellow-400' : 'text-primary'
    : 'text-gray-500';
  const riskBorderColor = riskResult
    ? riskResult.riesgo === 'alto' ? 'border-red-500/30' : riskResult.riesgo === 'medio' ? 'border-yellow-500/30' : 'border-primary/30'
    : 'border-white/10';
  const riskBarColor = riskResult
    ? riskResult.riesgo === 'alto' ? '#ef4444' : riskResult.riesgo === 'medio' ? '#eab308' : '#13ec5b'
    : '#6b7280';
  const riskPercent = riskResult ? Math.round(riskResult.probabilidad * 100) : 0;

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary/50 w-full";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">¿Qué Pasaría Si...?</h1>
            <p className="text-sm text-gray-400">Ajusta los parámetros y observa las predicciones en tiempo real</p>
          </div>
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-primary text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Calculando...</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ──── Panel de controles ──── */}
            <div className="lg:col-span-4 space-y-4">

              {/* Ubicación y clima */}
              <GlassCard>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Ubicación y Clima
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ciudad</label>
                    <select value={params.ciudad} onChange={e => update('ciudad', e.target.value)} className={selectClass}>
                      {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Estación</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ESTACIONES.map(e => (
                        <button
                          key={e}
                          onClick={() => update('estacion', e)}
                          className={`py-2 px-1 rounded-lg text-center transition-all ${
                            params.estacion === e
                              ? 'bg-primary text-background'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-base leading-none mb-0.5">{ESTACION_ICONS[e]}</div>
                          <div className="text-[10px] font-medium">{e}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 flex justify-between mb-1">
                      <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> Nubosidad</span>
                      <span className="text-primary font-bold">{params.nubosidad}%</span>
                    </label>
                    <input type="range" min={0} max={100} step={5} value={params.nubosidad}
                      onChange={e => update('nubosidad', +e.target.value)} className="w-full accent-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 flex justify-between mb-1">
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperatura</span>
                      <span className="text-primary font-bold">{params.temperatura}°C</span>
                    </label>
                    <input type="range" min={5} max={50} step={1} value={params.temperatura}
                      onChange={e => update('temperatura', +e.target.value)} className="w-full accent-primary" />
                  </div>
                </div>
              </GlassCard>

              {/* Sistema solar */}
              <GlassCard>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" /> Sistema Solar
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 flex justify-between mb-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Hora del día</span>
                      <span className="text-primary font-bold">{params.hora}:00</span>
                    </label>
                    <input type="range" min={0} max={23} step={1} value={params.hora}
                      onChange={e => update('hora', +e.target.value)} className="w-full accent-primary" />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                      <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 flex justify-between mb-1">
                      <span>Paneles solares</span>
                      <span className="text-primary font-bold">{params.num_paneles} paneles</span>
                    </label>
                    <input type="range" min={4} max={24} step={1} value={params.num_paneles}
                      onChange={e => update('num_paneles', +e.target.value)} className="w-full accent-primary" />
                    <div className="text-[10px] text-gray-500 mt-1">Capacidad: {capacidad} kW</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tarifa CFE</label>
                    <select value={params.tarifa} onChange={e => update('tarifa', e.target.value)} className={selectClass}>
                      {TARIFAS.map(t => <option key={t} value={t}>Tarifa {t} — ${CFE_TARIFA_MXN_KWH[t]?.toFixed(2)}/kWh</option>)}
                    </select>
                  </div>
                </div>

                {/* Irradiancia */}
                <div className="mt-4 p-3 bg-black/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Sun className="w-3.5 h-3.5 text-yellow-400" />
                    Irradiancia estimada
                  </div>
                  <span className="text-sm text-yellow-400 font-bold">{estimateIrradiance(params.hora, params.nubosidad)} W/m²</span>
                </div>
              </GlassCard>
            </div>

            {/* ──── Panel de resultados ──── */}
            <div className="lg:col-span-8 space-y-4">

              {fuente === 'local' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-200 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">Modo demo: estimación local</p>
                    <p className="text-xs text-yellow-300/80 mt-0.5">
                      El backend ML no está disponible, así que los valores se calculan con un modelo físico simplificado.
                      Levanta la API (ver README) para usar los modelos entrenados.
                    </p>
                  </div>
                </div>
              )}

              {/* Métricas principales — 2x2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Generación hora actual */}
                <GlassCard className="relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs text-gray-400">Generación</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {genResult ? genResult.generacion_predicha_kwh.toFixed(2) : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">kWh esta hora</div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-primary/5" />
                </GlassCard>

                {/* Generación diaria */}
                <GlassCard className="relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                        <BatteryCharging className="w-4 h-4 text-yellow-400" />
                      </div>
                      <span className="text-xs text-gray-400">Gen. diaria</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {dailyGeneration > 0 ? dailyGeneration.toFixed(1) : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">kWh estimados/día</div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-yellow-500/5" />
                </GlassCard>

                {/* Ahorro diario */}
                <GlassCard className="relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-green-500/10 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-xs text-gray-400">Ahorro diario</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {dailySavings > 0 ? `$${dailySavings.toFixed(0)}` : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">MXN/día estimado</div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-green-500/5" />
                </GlassCard>

                {/* Costo sin solar */}
                <GlassCard className="relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-red-500/10 rounded-lg">
                        <DollarSign className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-xs text-gray-400">Sin solar</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {costResult ? `$${(costResult.costo_estimado_mxn + costResult.ahorro_vs_sin_solar).toFixed(2)}` : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">pagarías esta hora</div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-red-500/5" />
                </GlassCard>
              </div>

              {/* Risk gauge + Monthly projection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk gauge */}
                <GlassCard className={`border ${riskBorderColor}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className={`w-5 h-5 ${riskColor}`} />
                    <h4 className="text-sm font-bold text-white">Análisis de Riesgo</h4>
                  </div>

                  {riskResult ? (
                    <div className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className={`text-3xl font-bold capitalize ${riskColor}`}>{riskResult.riesgo}</div>
                          <div className="text-xs text-gray-500">Probabilidad: {riskPercent}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-1">Índice de riesgo</div>
                          <div className={`text-lg font-bold ${riskColor}`}>{riskPercent}%</div>
                        </div>
                      </div>

                      {/* Risk bar */}
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(riskPercent, 3)}%`, backgroundColor: riskBarColor }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600">
                        <span>Bajo</span><span>Medio</span><span>Alto</span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">{riskResult.recomendacion}</p>
                      {riskResult.factores_principales.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {riskResult.factores_principales.map((f, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-6">Esperando datos...</div>
                  )}
                </GlassCard>

                {/* Monthly projection */}
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h4 className="text-sm font-bold text-white">Proyección Mensual</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                      <span className="text-xs text-gray-400">Generación mensual</span>
                      <span className="text-lg font-bold text-primary">{(dailyGeneration * 30).toFixed(0)} kWh</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/5 rounded-lg">
                      <span className="text-xs text-gray-400">Ahorro mensual</span>
                      <span className="text-lg font-bold text-green-400">${(dailySavings * 30).toFixed(0)} MXN</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-500/5 rounded-lg">
                      <span className="text-xs text-gray-400">Ahorro anual</span>
                      <span className="text-lg font-bold text-yellow-400">${(dailySavings * 365).toFixed(0)} MXN</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-lg">
                      <span className="text-xs text-gray-400">Costo estimado hora</span>
                      <span className="text-sm font-bold text-white">{costResult ? `$${costResult.costo_estimado_mxn.toFixed(2)}` : '—'} MXN</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Hourly generation area chart */}
              <GlassCard>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-white">Perfil de Generación Diario</h3>
                  {genResult && (
                    <span className="text-xs text-gray-500">
                      Modelo: <span className="text-gray-300">{genResult.modelo_usado}</span>
                      {fuente === 'ml' && (
                        <> — R² del modelo: <span className="text-primary">{genResult.confianza.toFixed(3)}</span></>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Generación estimada con nubosidad {params.nubosidad}% y {params.num_paneles} paneles en {params.ciudad}
                </p>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="irrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="hora" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
                      <YAxis yAxisId="gen" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v} kWh`} />
                      <YAxis yAxisId="irr" orientation="right" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'generacion') return [`${value.toFixed(3)} kWh`, 'Generación'];
                          return [`${value} W/m²`, 'Irradiancia'];
                        }}
                        labelFormatter={v => `${v}:00`}
                      />
                      <ReferenceLine yAxisId="gen" x={params.hora} stroke="#13ec5b" strokeDasharray="3 3" strokeOpacity={0.6} />
                      <Area yAxisId="irr" type="monotone" dataKey="irradiancia" stroke="#eab30844" strokeWidth={1} fill="url(#irrGrad)" />
                      <Area yAxisId="gen" type="monotone" dataKey="generacion" stroke="#13ec5b" strokeWidth={2.5} fill="url(#genGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-primary rounded" />
                    <span>Generación (kWh)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-yellow-500/40 rounded" />
                    <span>Irradiancia (W/m²)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-px border-t border-dashed border-primary/50" />
                    <span>Hora seleccionada</span>
                  </div>
                </div>
              </GlassCard>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

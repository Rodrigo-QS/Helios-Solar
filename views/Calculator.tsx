import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HelpCircle, Sun, DollarSign, Clock, Zap, Loader2, TrendingDown, TrendingUp, ArrowRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { recommendPanels, PanelRecommendResponse } from '../services/api';
import { CIUDADES, TARIFAS, CFE_TARIFA_MXN_KWH, costoMensualSinSolar, costoMensualConSolar } from '../data/solarData';

interface CalculatorProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

const TARIFA_DESCRIPTIONS: Record<string, string> = {
  '1':  'Doméstica básica — $1.20/kWh',
  '1A': 'Zona cálida baja — $1.40/kWh',
  '1B': 'Zona cálida media — $1.65/kWh',
  '1C': 'Zona cálida alta — $2.10/kWh',
  'DAC': 'Alto consumo — $5.80/kWh',
};

export const CalculatorView: React.FC<CalculatorProps> = ({ showNotification }) => {
  const [ciudad, setCiudad] = useState('CDMX');
  const [tarifa, setTarifa] = useState('1');
  const [consumo, setConsumo] = useState(300);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PanelRecommendResponse | null>(null);
  const [costResult, setCostResult] = useState<{ sinSolar: number; conSolar: number } | null>(null);

  // Cálculo en vivo de factura estimada
  const facturaEstimada = costoMensualSinSolar(consumo, tarifa);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const panelRes = await recommendPanels({
        ciudad,
        num_habitantes: 4,
        tarifa_cfe: tarifa,
        consumo_mensual_kwh: consumo,
      });
      setResult(panelRes);

      const genMensual = panelRes.generacion_diaria_estimada_kwh * 30;
      const sinSolar = costoMensualSinSolar(consumo, tarifa);
      const conSolar = costoMensualConSolar(consumo, genMensual, tarifa);
      setCostResult({ sinSolar, conSolar });

      showNotification(
        panelRes.fuente === 'ml'
          ? 'Análisis completado con el backend ML'
          : 'Análisis completado (estimación local: API ML no disponible)',
        panelRes.fuente === 'ml' ? 'success' : 'info',
      );
    } catch {
      showNotification('Error al calcular la recomendación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const conviene = result && result.roi_anios <= 15;
  const ahorroMensual = costResult ? costResult.sinSolar - costResult.conSolar : 0;
  const ahorroAnual = ahorroMensual * 12;
  const ahorroPorcentaje = costResult && costResult.sinSolar > 0
    ? Math.round((ahorroMensual / costResult.sinSolar) * 100)
    : 0;

  const comparisonData = costResult
    ? [
        { name: 'Sin Solar', costo: costResult.sinSolar, fill: '#ef4444' },
        { name: 'Con Solar', costo: costResult.conSolar, fill: '#13ec5b' },
      ]
    : [];

  // Desglose mensual para la tabla
  const desglose = result && costResult ? [
    { label: 'Factura actual CFE', value: costResult.sinSolar, color: 'text-red-400' },
    { label: 'Generación solar (descuento)', value: -ahorroMensual, color: 'text-primary' },
    { label: 'Nueva factura mensual', value: costResult.conSolar, color: 'text-white' },
  ] : [];

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary/50 w-full";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">¿Me Conviene Instalar Paneles Solares?</h1>
            <p className="text-sm text-gray-400">Análisis financiero basado en tarifas CFE reales y Machine Learning</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Columna izquierda: Formulario */}
            <div className="lg:col-span-2 space-y-4">
              <GlassCard>
                <h2 className="text-lg font-bold text-white mb-5">Tu Situación Actual</h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Ciudad</label>
                    <select value={ciudad} onChange={e => setCiudad(e.target.value)} className={selectClass}>
                      {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Tarifa CFE actual</label>
                    <select value={tarifa} onChange={e => setTarifa(e.target.value)} className={selectClass}>
                      {TARIFAS.map(t => <option key={t} value={t}>Tarifa {t}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">{TARIFA_DESCRIPTIONS[tarifa]}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">
                      Consumo mensual: <span className="text-primary font-bold">{consumo} kWh</span>
                    </label>
                    <input
                      type="range" min={50} max={1500} step={10}
                      value={consumo}
                      onChange={e => setConsumo(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50 kWh</span><span>750 kWh</span><span>1,500 kWh</span>
                    </div>
                  </div>

                  {/* Factura estimada en vivo */}
                  <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Factura mensual estimada</span>
                      <span className="text-2xl font-bold text-red-400">${facturaEstimada.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">Factura bimestral</span>
                      <span className="text-sm font-medium text-red-400/70">${(facturaEstimada * 2).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full py-3.5 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analizando...</> : <>Analizar <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </GlassCard>

              {/* Info */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200/70">Los cálculos usan tarifas CFE 2024 y datos de irradiancia solar por ciudad. El modelo ML predice la generación según las condiciones climáticas locales.</p>
              </div>
            </div>

            {/* Columna derecha: Resultados */}
            <div className="lg:col-span-3 space-y-4">
              {result && costResult ? (
                <>
                  {/* Veredicto */}
                  <GlassCard className={`border-2 ${conviene ? 'border-primary/30 bg-primary/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                    <div className="flex items-center gap-4 py-2">
                      <div className={`p-3 rounded-full ${conviene ? 'bg-primary/20' : 'bg-yellow-500/20'}`}>
                        {conviene
                          ? <CheckCircle2 className="w-8 h-8 text-primary" />
                          : <AlertTriangle className="w-8 h-8 text-yellow-400" />
                        }
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${conviene ? 'text-primary' : 'text-yellow-400'}`}>
                          {conviene ? 'SÍ TE CONVIENE' : 'ANALIZA CON CUIDADO'}
                        </div>
                        <p className="text-sm text-gray-400">
                          {conviene
                            ? `Recuperas tu inversión en ${result.roi_anios} años y ahorras ${ahorroPorcentaje}% mensual`
                            : `Con tarifa ${tarifa} el ahorro mensual ($${ahorroMensual.toLocaleString()}) es bajo vs la inversión ($${result.costo_sistema_estimado_mxn.toLocaleString()})`}
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Gráfica comparativa */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Tu Factura Mensual</h3>
                        <p className="text-xs text-gray-400">Comparación en pesos mexicanos</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Ahorras</div>
                        <div className="text-lg font-bold text-primary">${ahorroMensual.toLocaleString()}/mes</div>
                      </div>
                    </div>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                          <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={13} tickLine={false} axisLine={false} width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                            formatter={(value: number) => [`$${value.toLocaleString()} MXN`, 'Costo mensual']}
                          />
                          <Bar dataKey="costo" radius={[0, 8, 8, 0]} maxBarSize={45}>
                            {comparisonData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} fillOpacity={i === 0 ? 0.6 : 1} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Desglose */}
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2.5">
                      {desglose.map((item, i) => (
                        <div key={i} className={`flex justify-between text-sm ${i === desglose.length - 1 ? 'font-bold pt-2 border-t border-white/10' : ''}`}>
                          <span className="text-gray-400">{item.label}</span>
                          <span className={item.color}>
                            {item.value < 0 ? '-' : ''}${Math.abs(item.value).toLocaleString()} MXN
                          </span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Métricas del sistema */}
                  <div className="grid grid-cols-3 gap-3">
                    <GlassCard className="text-center py-4">
                      <Sun className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-white">{result.paneles_recomendados}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Paneles</div>
                    </GlassCard>
                    <GlassCard className="text-center py-4">
                      <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-white">{result.capacidad_kw} kW</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Capacidad</div>
                    </GlassCard>
                    <GlassCard className="text-center py-4">
                      <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-white">{result.roi_anios} años</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">ROI</div>
                    </GlassCard>
                  </div>

                  {/* Resumen financiero */}
                  <GlassCard>
                    <h3 className="text-base font-bold text-white mb-4">Resumen Financiero</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-gray-300">Inversión del sistema</span>
                        </div>
                        <span className="text-base font-bold text-white">${result.costo_sistema_estimado_mxn.toLocaleString()} MXN</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-primary" />
                          <span className="text-sm text-gray-300">Ahorro mensual</span>
                        </div>
                        <span className="text-base font-bold text-primary">${ahorroMensual.toLocaleString()} MXN</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300">Ahorro anual</span>
                        </div>
                        <span className="text-base font-bold text-blue-400">${ahorroAnual.toLocaleString()} MXN</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span className="text-sm text-gray-300">Ahorro a 25 años</span>
                        </div>
                        <span className="text-base font-bold text-primary">${(ahorroAnual * 25).toLocaleString()} MXN</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <Sun className="w-3 h-3" />
                      <span>Generación estimada: {result.generacion_diaria_estimada_kwh} kWh/día ({(result.generacion_diaria_estimada_kwh * 30).toFixed(0)} kWh/mes)</span>
                    </div>
                  </GlassCard>
                </>
              ) : (
                <GlassCard className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-gray-500 max-w-xs">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <HelpCircle className="w-10 h-10 opacity-30" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">Configura tu análisis</h3>
                    <p className="text-sm">Selecciona tu ciudad, tarifa y consumo mensual, luego presiona <span className="text-primary font-bold">Analizar</span> para ver si te conviene instalar paneles solares.</p>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

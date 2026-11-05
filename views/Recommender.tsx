import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Compass, MapPin, Users, Zap, Sun, DollarSign, Clock, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { recommendPanels, PanelRecommendResponse } from '../services/api';
import { CIUDADES, TARIFAS } from '../data/solarData';

interface RecommenderProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

const CONSUMO_POR_PERSONA = 80; // kWh/mes estimado

export const Recommender: React.FC<RecommenderProps> = ({ showNotification }) => {
  const [step, setStep] = useState(1);
  const [ciudad, setCiudad] = useState('');
  const [personas, setPersonas] = useState(4);
  const [tarifa, setTarifa] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PanelRecommendResponse | null>(null);

  const consumoEstimado = personas * CONSUMO_POR_PERSONA;

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await recommendPanels({
        ciudad,
        num_habitantes: personas,
        tarifa_cfe: tarifa,
        consumo_mensual_kwh: consumoEstimado,
      });
      setResult(res);
      setStep(3);
      showNotification(
        res.fuente === 'ml'
          ? 'Recomendación generada con el backend ML'
          : 'Recomendación generada (estimación local: API ML no disponible)',
        res.fuente === 'ml' ? 'success' : 'info',
      );
    } catch {
      showNotification('Error al generar la recomendación', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Proyección de ahorro a 10 años
  const projectionData = result
    ? Array.from({ length: 11 }, (_, i) => ({
        año: i,
        ahorro: Math.round(result.ahorro_mensual_estimado * 12 * i),
        inversion: Math.round(result.costo_sistema_estimado_mxn),
      }))
    : [];

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary/50 w-full";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Compass className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Recomendador de Sistema Solar</h1>
            <p className="text-sm text-gray-400">3 pasos para encontrar tu sistema ideal</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto">

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step >= s ? 'bg-primary text-background' : 'bg-white/10 text-gray-500'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-white/10'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Paso 1: ¿Dónde vives? */}
          {step === 1 && (
            <GlassCard className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-white">¿Dónde vives?</h2>
              </div>
              <p className="text-sm text-gray-400 mb-6">Selecciona tu ciudad para analizar las condiciones solares de tu zona.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {CIUDADES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCiudad(c)}
                    className={`p-4 rounded-xl text-center transition-all border ${
                      ciudad === c
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <MapPin className={`w-5 h-5 mx-auto mb-1 ${ciudad === c ? 'text-primary' : 'text-gray-500'}`} />
                    <span className="text-sm font-medium">{c}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => ciudad && setStep(2)}
                disabled={!ciudad}
                className="w-full py-3 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </GlassCard>
          )}

          {/* Paso 2: Detalles del hogar */}
          {step === 2 && (
            <GlassCard className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-white">¿Cuántos son en casa?</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-400 block mb-3">
                    Personas en el hogar: <span className="text-primary font-bold text-lg">{personas}</span>
                  </label>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => setPersonas(n)}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          personas === n
                            ? 'bg-primary text-background'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {n}{n === 6 ? '+' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Consumo estimado: ~{consumoEstimado} kWh/mes</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">Tarifa CFE</label>
                  <select value={tarifa} onChange={e => setTarifa(e.target.value)} className={selectClass}>
                    {TARIFAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white/5 text-gray-300 font-medium rounded-lg hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</> : <>Obtener Recomendación <Zap className="w-4 h-4" /></>}
                </button>
              </div>
            </GlassCard>
          )}

          {/* Paso 3: Resultados */}
          {step === 3 && result && (
            <div className="space-y-6 animate-fade-in-up">
              <GlassCard className="text-center border-2 border-primary/30">
                <h2 className="text-sm text-gray-400 mb-1">Tu sistema ideal en {ciudad}</h2>
                <div className="text-5xl font-bold text-primary mb-2">{result.paneles_recomendados}</div>
                <p className="text-lg text-white">paneles solares</p>
              </GlassCard>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <GlassCard className="text-center">
                  <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{result.capacidad_kw} kW</div>
                  <div className="text-xs text-gray-400">Capacidad</div>
                </GlassCard>
                <GlassCard className="text-center">
                  <DollarSign className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">${result.ahorro_mensual_estimado.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Ahorro/mes</div>
                </GlassCard>
                <GlassCard className="text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{result.roi_anios} años</div>
                  <div className="text-xs text-gray-400">ROI</div>
                </GlassCard>
                <GlassCard className="text-center">
                  <Sun className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{result.generacion_diaria_estimada_kwh} kWh</div>
                  <div className="text-xs text-gray-400">Gen. diaria</div>
                </GlassCard>
                <GlassCard className="text-center col-span-2 md:col-span-2">
                  <DollarSign className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">${result.costo_sistema_estimado_mxn.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Inversión estimada</div>
                </GlassCard>
              </div>

              {/* Proyección a 10 años */}
              <GlassCard>
                <h3 className="text-lg font-bold text-white mb-1">Proyección de Ahorro a 10 Años</h3>
                <p className="text-sm text-gray-400 mb-4">Ahorro acumulado vs inversión inicial</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ahorroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="año" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `Año ${v}`} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'ahorro' ? 'Ahorro acumulado' : 'Inversión']}
                      />
                      <Area type="monotone" dataKey="ahorro" stroke="#13ec5b" strokeWidth={2.5} fill="url(#ahorroGrad)" />
                      <Area type="monotone" dataKey="inversion" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <button
                onClick={() => { setStep(1); setResult(null); setCiudad(''); }}
                className="w-full py-3 bg-white/5 text-gray-300 font-medium rounded-lg hover:bg-white/10 transition-all"
              >
                Calcular otra vez
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

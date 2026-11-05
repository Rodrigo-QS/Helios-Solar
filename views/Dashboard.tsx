import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { RefreshCw, Sun, Wind, Cloud, Info, ArrowUpRight, CheckCircle, AlertTriangle, CloudOff } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { Appliance, ChartDataPoint, ViewState } from '../types';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

// Mock Data Generators
const generateData = (multiplier: number) => [
  { time: '06:00', generation: 0.5 * multiplier, consumption: 1.2 },
  { time: '08:00', generation: 2.1 * multiplier, consumption: 1.5 },
  { time: '10:00', generation: 4.8 * multiplier, consumption: 1.8 },
  { time: '12:00', generation: 6.2 * multiplier, consumption: 2.1 },
  { time: '14:00', generation: 5.9 * multiplier, consumption: 2.3 },
  { time: '16:00', generation: 4.5 * multiplier, consumption: 3.5 },
  { time: '18:00', generation: 1.2 * multiplier, consumption: 4.2 },
  { time: '20:00', generation: 0.0 * multiplier, consumption: 3.8 },
];

const applianceData: Appliance[] = [
  { id: '1', name: 'Aire Acondicionado', consumption: 1.2, status: 'Enfriando', color: '#3b82f6', percentage: 40, icon: 'ac' },
  { id: '2', name: 'Cargador VE', consumption: 0.7, status: 'Tesla Model 3', color: '#eab308', percentage: 25, icon: 'ev' },
  { id: '3', name: 'Refrigerador', consumption: 0.4, status: 'Siempre Activo', color: '#13ec5b', percentage: 15, icon: 'fridge' },
  { id: '4', name: 'Otros', consumption: 0.5, status: 'Luces, Wifi...', color: '#6b7280', percentage: 20, icon: 'device' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, showNotification }) => {
  const [data, setData] = useState<ChartDataPoint[]>(generateData(1));
  const [lastSync, setLastSync] = useState<string>("10:42:15 AM");
  const [viewMode, setViewMode] = useState<'live' | 'daily'>('live');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update time on mount
  useEffect(() => {
    const now = new Date();
    setLastSync(now.toLocaleTimeString());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate network request
    setTimeout(() => {
      const now = new Date();
      setLastSync(now.toLocaleTimeString());
      setData(generateData(0.8 + Math.random() * 0.4)); // Randomize data slightly
      setIsRefreshing(false);
      showNotification("Datos sincronizados con éxito", "success");
    }, 1000);
  };

  const handleViewModeChange = (mode: 'live' | 'daily') => {
    if (mode === viewMode) return;
    setViewMode(mode);
    // Simulate data change
    if (mode === 'live') {
        setData(generateData(1));
        showNotification("Mostrando datos en tiempo real", "info");
    } else {
        setData(generateData(1.5)); // Fake "Daily" view having higher numbers for demo
        showNotification("Mostrando resumen diario", "info");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-background/50 backdrop-blur-md border-b border-primary/10 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-white tracking-tight">Resumen del Panel</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <div className="relative">
               <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></div>
               <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-primary animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Sistema en Línea</span>
          </div>
          
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 font-medium">Última Sinc.</p>
            <p className="text-sm font-mono text-white w-24 text-right inline-block">{lastSync}</p>
          </div>
          
          <button 
            onClick={handleRefresh}
            className={`p-2 text-gray-400 hover:text-primary transition-all bg-white/5 rounded-full hover:bg-white/10 active:scale-95 ${isRefreshing ? 'animate-spin' : ''}`}
            title="Actualizar datos"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Row: Energy Pulse & Environment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Energy Chart */}
            <GlassCard className="lg:col-span-2 flex flex-col h-[420px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Pulso Energético
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400">Generación vs Consumo ({viewMode === 'live' ? 'Tiempo Real' : 'Diario'})</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#13ec5b]"></span>
                    <span className="text-gray-300">Generación</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-300">Consumo</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#13ec5b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="time" 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickFormatter={(value) => `${value}kW`}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="generation" 
                        stroke="#13ec5b" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorGen)" 
                        animationDuration={1500}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="consumption" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fillOpacity={1} 
                        fill="url(#colorCons)" 
                        animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 rounded-lg p-3 border-l-4 border-primary">
                    <div className="text-xs text-gray-400 mb-1">Salida Actual</div>
                    <div className="text-2xl font-bold text-white">4.8 <span className="text-sm font-normal text-gray-400">kW</span></div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border-l-4 border-blue-500">
                    <div className="text-xs text-gray-400 mb-1">Exportación a Red</div>
                    <div className="text-2xl font-bold text-white">+2.7 <span className="text-sm font-normal text-gray-400">kW</span></div>
                </div>
              </div>
            </GlassCard>

            {/* Right Column: Efficiency & Weather */}
            <div className="space-y-6">
              {/* Efficiency */}
              <GlassCard className="relative flex flex-col items-center justify-center p-8 group">
                <div className="absolute top-4 left-6 flex items-center justify-between w-[85%]">
                  <h3 className="font-semibold text-white">Eficiencia del Sistema</h3>
                  <button onClick={() => showNotification("Rendimiento 2% superior a lo esperado", "info")}>
                     <Info className="text-primary w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                  </button>
                </div>
                
                <div className="relative w-48 h-48 mt-4 transition-transform duration-500 group-hover:scale-105">
                   {/* Custom SVG Radial Progress */}
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-800" />
                      <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (502 * 0.92)} strokeLinecap="round" className="text-primary drop-shadow-[0_0_10px_rgba(19,236,91,0.5)] transition-all duration-1000 ease-out" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">92%</span>
                      <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-1 rounded mt-1">Excelente</span>
                   </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-4 px-4">
                  Operando cerca del máximo teórico basado en la irradiancia actual.
                </p>
              </GlassCard>

              {/* Weather */}
              <GlassCard className="cursor-default hover:border-primary/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">Entorno Local</h3>
                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">Hermosillo, Son.</span>
                </div>
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-full animate-pulse-slow">
                        <Sun className="text-yellow-400 w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">24°C</div>
                      <div className="text-xs text-gray-400">Soleado</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Índice UV</div>
                    <div className="font-bold text-primary bg-primary/10 px-3 py-1 rounded text-sm">Alto (8)</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs divide-x divide-gray-700">
                  <div className="px-2">
                    <div className="text-gray-400 mb-1 flex items-center justify-center gap-1"><Cloud className="w-3 h-3"/> Humedad</div>
                    <div className="font-mono text-white text-lg">45%</div>
                  </div>
                  <div className="px-2">
                    <div className="text-gray-400 mb-1 flex items-center justify-center gap-1"><CloudOff className="w-3 h-3"/> Cobertura</div>
                    <div className="font-mono text-white text-lg">10%</div>
                  </div>
                  <div className="px-2">
                    <div className="text-gray-400 mb-1 flex items-center justify-center gap-1"><Wind className="w-3 h-3"/> Viento</div>
                    <div className="font-mono text-white text-lg">12<span className="text-[10px]">km/h</span></div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Appliances */}
             <GlassCard className="lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-white text-lg">Desglose de Dispositivos</h3>
                    <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                        <button 
                            onClick={() => handleViewModeChange('live')}
                            className={`px-4 py-1.5 text-xs rounded-md transition-all font-bold ${viewMode === 'live' ? 'bg-primary text-background shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            En Vivo
                        </button>
                        <button 
                            onClick={() => handleViewModeChange('daily')}
                            className={`px-4 py-1.5 text-xs rounded-md transition-all font-bold ${viewMode === 'daily' ? 'bg-primary text-background shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Diario
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative w-56 h-56 shrink-0 group">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={applianceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="consumption"
                                    stroke="none"
                                >
                                    {applianceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none group-hover:scale-110 transition-transform duration-300">
                            <span className="text-xs text-gray-400">Carga Total</span>
                            <span className="text-2xl font-bold text-white">2.8 kW</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {applianceData.map((app) => (
                            <button 
                                key={app.id} 
                                onClick={() => showNotification(`Analizando consumo: ${app.name}`, "info")}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer text-left w-full group active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-black/20 transition-transform group-hover:scale-110" style={{ color: app.color }}>
                                       <div className="w-5 h-5 rounded-full" style={{ backgroundColor: app.color }}></div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{app.name}</div>
                                        <div className="text-xs text-gray-400">{app.status}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-white">{app.consumption} kW</div>
                                    <div className="text-xs font-mono" style={{ color: app.color }}>{app.percentage}%</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
             </GlassCard>

             {/* Recent Alerts */}
             <GlassCard className="flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-white">Alertas Recientes</h3>
                    <button onClick={() => onNavigate('alerts')} className="text-xs text-primary hover:underline flex items-center group">
                        Ver Todo <ArrowUpRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
                    </button>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex gap-3 items-start p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer" onClick={() => showNotification("Redireccionando a detalles de la falla", "error")}>
                        <AlertTriangle className="text-red-400 w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-200">Inestabilidad de Red</h4>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Fluctuaciones de voltaje detectadas en la red principal. Respaldo de batería activado.</p>
                            <span className="text-[10px] text-gray-500 mt-2 block font-mono">Hace 2 min</span>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/15 transition-colors cursor-pointer" onClick={() => showNotification("Reporte de eficiencia generado", "info")}>
                        <CloudOff className="text-yellow-400 w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-yellow-200">Caída de Eficiencia</h4>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">La nubosidad repentina redujo la salida un 40%.</p>
                            <span className="text-[10px] text-gray-500 mt-2 block font-mono">Hace 1 hora</span>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                        <CheckCircle className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-gray-200">Autodiagnóstico Aprobado</h4>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Diagnóstico semanal del inversor completado con éxito.</p>
                            <span className="text-[10px] text-gray-500 mt-2 block font-mono">Ayer</span>
                        </div>
                    </div>
                </div>
             </GlassCard>
          </div>

        </div>
      </div>
    </div>
  );
};
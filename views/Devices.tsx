import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Smartphone, Zap, DollarSign, Power, Thermometer, Tv, Monitor,
  Lightbulb, Droplets, Wind, WashingMachine, Microwave, Coffee,
  Plug, Wifi, BatteryCharging, TrendingUp,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { CFE_TARIFA_MXN_KWH, TARIFAS } from '../data/solarData';

interface DevicesProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

interface Device {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
  kwhMonth: number;
  category: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Climatización': '#ef4444',
  'Cocina': '#f97316',
  'Lavandería': '#a855f7',
  'Entretenimiento': '#3b82f6',
  'Trabajo': '#06b6d4',
  'Iluminación': '#eab308',
  'Hogar': '#13ec5b',
};

const iconClass = 'w-5 h-5';

const DEFAULT_DEVICES: Omit<Device, 'enabled'>[] = [
  { id: 'ac', name: 'Aire Acondicionado', watts: 1500, hoursPerDay: 6, kwhMonth: 270, category: 'Climatización', icon: <Thermometer className={iconClass} /> },
  { id: 'calentador', name: 'Calentador Eléctrico', watts: 1500, hoursPerDay: 1, kwhMonth: 45, category: 'Hogar', icon: <Droplets className={iconClass} /> },
  { id: 'fridge', name: 'Refrigerador', watts: 150, hoursPerDay: 24, kwhMonth: 40, category: 'Cocina', icon: <Coffee className={iconClass} /> },
  { id: 'secadora', name: 'Secadora de Ropa', watts: 2400, hoursPerDay: 0.5, kwhMonth: 36, category: 'Lavandería', icon: <Wind className={iconClass} /> },
  { id: 'pc', name: 'Computadora / Laptop', watts: 150, hoursPerDay: 6, kwhMonth: 27, category: 'Trabajo', icon: <Monitor className={iconClass} /> },
  { id: 'bomba', name: 'Bomba de Agua', watts: 750, hoursPerDay: 1, kwhMonth: 22.5, category: 'Hogar', icon: <Droplets className={iconClass} /> },
  { id: 'tv', name: 'Televisión', watts: 120, hoursPerDay: 6, kwhMonth: 21.6, category: 'Entretenimiento', icon: <Tv className={iconClass} /> },
  { id: 'ventilador', name: 'Ventilador', watts: 75, hoursPerDay: 8, kwhMonth: 18, category: 'Climatización', icon: <Wind className={iconClass} /> },
  { id: 'micro', name: 'Microondas', watts: 1200, hoursPerDay: 0.5, kwhMonth: 18, category: 'Cocina', icon: <Microwave className={iconClass} /> },
  { id: 'focos', name: 'Focos LED (x10)', watts: 100, hoursPerDay: 6, kwhMonth: 18, category: 'Iluminación', icon: <Lightbulb className={iconClass} /> },
  { id: 'plancha', name: 'Plancha', watts: 1100, hoursPerDay: 0.5, kwhMonth: 16.5, category: 'Lavandería', icon: <Power className={iconClass} /> },
  { id: 'lavadora', name: 'Lavadora', watts: 500, hoursPerDay: 1, kwhMonth: 15, category: 'Lavandería', icon: <WashingMachine className={iconClass} /> },
  { id: 'router', name: 'Router WiFi', watts: 12, hoursPerDay: 24, kwhMonth: 8.6, category: 'Trabajo', icon: <Wifi className={iconClass} /> },
  { id: 'celular', name: 'Cargadores Celular (x3)', watts: 15, hoursPerDay: 8, kwhMonth: 3.6, category: 'Entretenimiento', icon: <BatteryCharging className={iconClass} /> },
  { id: 'licuadora', name: 'Licuadora', watts: 400, hoursPerDay: 0.25, kwhMonth: 3, category: 'Cocina', icon: <Plug className={iconClass} /> },
];

const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary/50";

export const Devices: React.FC<DevicesProps> = ({ showNotification }) => {
  const [tarifa, setTarifa] = useState('1');
  const [devices, setDevices] = useState<Device[]>(
    DEFAULT_DEVICES.map(d => ({ ...d, enabled: true }))
  );

  const rate = CFE_TARIFA_MXN_KWH[tarifa] ?? 1.65;

  const toggle = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d));
  };

  const activeDevices = useMemo(() => devices.filter(d => d.enabled), [devices]);

  const totalKwh = useMemo(
    () => activeDevices.reduce((sum, d) => sum + d.kwhMonth, 0),
    [activeDevices]
  );

  const totalCost = useMemo(() => Math.round(totalKwh * rate), [totalKwh, rate]);

  const topConsumer = useMemo(
    () => activeDevices.length > 0
      ? activeDevices.reduce((max, d) => d.kwhMonth > max.kwhMonth ? d : max, activeDevices[0])
      : null,
    [activeDevices]
  );

  // Bar chart data — top 10 active devices
  const barData = useMemo(
    () => activeDevices
      .sort((a, b) => b.kwhMonth - a.kwhMonth)
      .slice(0, 10)
      .map(d => ({
        name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
        kwh: d.kwhMonth,
        costo: Math.round(d.kwhMonth * rate),
        color: CATEGORY_COLORS[d.category] || '#13ec5b',
      })),
    [activeDevices, rate]
  );

  // Pie chart data — by category
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const d of activeDevices) {
      grouped[d.category] = (grouped[d.category] || 0) + d.kwhMonth;
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10, color: CATEGORY_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value);
  }, [activeDevices]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestión de Dispositivos</h1>
              <p className="text-sm text-gray-400">Consumo eléctrico de aparatos comunes en hogares de México</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Tarifa CFE:</label>
            <select value={tarifa} onChange={e => setTarifa(e.target.value)} className={selectClass}>
              {TARIFAS.map(t => (
                <option key={t} value={t}>Tarifa {t} — ${CFE_TARIFA_MXN_KWH[t]?.toFixed(2)}/kWh</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="text-center">
              <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{totalKwh.toFixed(1)}</div>
              <div className="text-sm text-gray-400">kWh / mes total</div>
              <div className="text-xs text-gray-500 mt-1">{activeDevices.length} de {devices.length} dispositivos activos</div>
            </GlassCard>
            <GlassCard className="text-center">
              <DollarSign className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">${totalCost.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Costo mensual estimado</div>
              <div className="text-xs text-gray-500 mt-1">Tarifa {tarifa} — ${rate.toFixed(2)}/kWh</div>
            </GlassCard>
            <GlassCard className="text-center">
              <TrendingUp className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{topConsumer ? topConsumer.name : '—'}</div>
              <div className="text-sm text-gray-400">Mayor consumidor</div>
              <div className="text-xs text-gray-500 mt-1">
                {topConsumer ? `${topConsumer.kwhMonth} kWh/mes — $${Math.round(topConsumer.kwhMonth * rate).toLocaleString()} MXN` : ''}
              </div>
            </GlassCard>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart — top 10 */}
            <GlassCard className="lg:col-span-2">
              <h3 className="text-lg font-bold text-white mb-1">Top Consumidores</h3>
              <p className="text-sm text-gray-400 mb-4">Dispositivos activos con mayor consumo mensual</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v} kWh`} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={130} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'kwh') return [`${value} kWh/mes`, 'Consumo'];
                        return [`$${value} MXN`, 'Costo'];
                      }}
                    />
                    <Bar dataKey="kwh" radius={[0, 6, 6, 0]} barSize={18}>
                      {barData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Pie chart — by category */}
            <GlassCard>
              <h3 className="text-lg font-bold text-white mb-1">Por Categoría</h3>
              <p className="text-sm text-gray-400 mb-4">Distribución del consumo</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value} kWh/mes`, 'Consumo']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {pieData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-300">{c.name}</span>
                    </div>
                    <span className="text-gray-400">{c.value} kWh</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Device grid */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Dispositivos del Hogar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map(d => {
                const cost = Math.round(d.kwhMonth * rate);
                return (
                  <div
                    key={d.id}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                      d.enabled
                        ? 'bg-[rgba(21,46,29,0.6)] border-primary/20 hover:border-primary/40'
                        : 'bg-white/[0.02] border-white/5 opacity-50'
                    }`}
                    onClick={() => toggle(d.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${d.enabled ? 'bg-primary/10 text-primary' : 'bg-white/5 text-gray-500'}`}>
                          {d.icon}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{d.name}</div>
                          <div className="text-xs text-gray-500">{d.watts}W — {d.hoursPerDay}h/día</div>
                        </div>
                      </div>
                      {/* Toggle indicator */}
                      <div className={`w-10 h-5 rounded-full flex items-center transition-all px-0.5 ${
                        d.enabled ? 'bg-primary/30 justify-end' : 'bg-white/10 justify-start'
                      }`}>
                        <div className={`w-4 h-4 rounded-full transition-all ${d.enabled ? 'bg-primary' : 'bg-gray-500'}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <div>
                        <span className="text-lg font-bold text-white">{d.kwhMonth}</span>
                        <span className="text-xs text-gray-400 ml-1">kWh/mes</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-yellow-400">${cost}</span>
                        <span className="text-xs text-gray-400 ml-1">MXN/mes</span>
                      </div>
                    </div>
                    {/* Category badge */}
                    <div
                      className="absolute top-2 right-14 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${CATEGORY_COLORS[d.category] || '#6b7280'}20`, color: CATEGORY_COLORS[d.category] || '#6b7280' }}
                    >
                      {d.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info note */}
          <div className="text-xs text-gray-500 text-center pb-4">
            * Consumos estimados basados en promedios de uso residencial en México. Los valores reales pueden variar según el modelo y hábitos de uso.
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Shield, Loader2, RefreshCw } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ViewState } from '../types';
import { assessRisk, recommendOptimalTariff, isAPIAvailable } from '../services/api';
import { solarData, CIUDADES, ESTACIONES, filterData } from '../data/solarData';

interface AlertsProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

interface AlertItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  ciudad: string;
  timestamp: string;
}

const alertStyles = {
  error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-200', icon: AlertTriangle, iconColor: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-400' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-200', icon: Info, iconColor: 'text-blue-400' },
  success: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-green-200', icon: CheckCircle, iconColor: 'text-primary' },
};

// Generar alertas basadas en datos del dataset
function generateDataAlerts(): AlertItem[] {
  const alerts: AlertItem[] = [];
  let id = 0;

  for (const ciudad of CIUDADES) {
    // Alertas de rendimiento por estación
    for (const estacion of ESTACIONES) {
      const data = filterData(solarData, ciudad, estacion);
      if (data.length === 0) continue;

      const avgGen = data.reduce((a, d) => a + d.Generacion_Solar_kWh, 0) / data.length;
      const avgNub = data.reduce((a, d) => a + d.Nubosidad, 0) / data.length;
      const avgIrr = data.reduce((a, d) => a + d.Irradiancia_Wm2, 0) / data.length;

      // Alta generación
      if (avgGen > 3.5) {
        alerts.push({
          id: `${++id}`,
          type: 'success',
          title: `Alta generación en ${ciudad}`,
          message: `En ${estacion.toLowerCase()}, la generación solar promedio sube a ${avgGen.toFixed(1)} kWh. Buen momento para maximizar autoconsumo.`,
          ciudad,
          timestamp: estacion,
        });
      }

      // Alta nubosidad = riesgo
      if (avgNub > 55 && avgGen < 2.5) {
        alerts.push({
          id: `${++id}`,
          type: 'warning',
          title: `Riesgo en ${ciudad} durante ${estacion.toLowerCase()}`,
          message: `Nubosidad promedio de ${avgNub.toFixed(0)}% reduce la generación a ${avgGen.toFixed(1)} kWh. Considere batería de respaldo.`,
          ciudad,
          timestamp: estacion,
        });
      }

      // Baja irradiancia
      if (avgIrr < 350) {
        alerts.push({
          id: `${++id}`,
          type: 'error',
          title: `Baja irradiancia en ${ciudad}`,
          message: `Durante ${estacion.toLowerCase()}, irradiancia promedio de ${avgIrr.toFixed(0)} W/m². El sistema operará por debajo de capacidad óptima.`,
          ciudad,
          timestamp: estacion,
        });
      }
    }

    // Alerta de tarifa
    const cityData = filterData(solarData, ciudad);
    const dacData = cityData.filter(d => d.Tarifa_CFE === 'DAC');
    if (dacData.length > 0) {
      const avgCostDAC = dacData.reduce((a, d) => a + d.Costo_Estimado_MXN, 0) / dacData.length;
      const data1 = cityData.filter(d => d.Tarifa_CFE === '1');
      if (data1.length > 0) {
        const avgCost1 = data1.reduce((a, d) => a + d.Costo_Estimado_MXN, 0) / data1.length;
        const ahorro = avgCostDAC - avgCost1;
        if (ahorro > 1) {
          alerts.push({
            id: `${++id}`,
            type: 'info',
            title: `Oportunidad de ahorro en ${ciudad}`,
            message: `Usuarios con tarifa DAC podrían ahorrar ~$${(ahorro * 30).toFixed(0)}/mes cambiando a tarifa 1 con paneles solares.`,
            ciudad,
            timestamp: 'General',
          });
        }
      }
    }
  }

  return alerts;
}

export const Alerts: React.FC<AlertsProps> = ({ showNotification }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'warning' | 'info' | 'error'>('all');
  const [cityFilter, setCityFilter] = useState('Todas');
  const [apiAlerts, setApiAlerts] = useState<AlertItem[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  const dataAlerts = useMemo(() => generateDataAlerts(), []);

  const allAlerts = useMemo(() => [...apiAlerts, ...dataAlerts], [apiAlerts, dataAlerts]);

  const filteredAlerts = useMemo(() => {
    let result = allAlerts;
    if (filter !== 'all') result = result.filter(a => a.type === filter);
    if (cityFilter !== 'Todas') result = result.filter(a => a.ciudad === cityFilter);
    return result;
  }, [allAlerts, filter, cityFilter]);

  const loadApiAlerts = async () => {
    setLoadingApi(true);
    try {
      const available = await isAPIAvailable();
      if (!available) {
        showNotification('API ML no disponible. Mostrando alertas basadas en datos locales.', 'info');
        setLoadingApi(false);
        return;
      }

      const newAlerts: AlertItem[] = [];
      let id = 1000;

      // Evaluar riesgo para combinaciones clave
      const combos = [
        { ciudad: 'Chihuahua', estacion: 'Invierno', nubosidad: 75, irradiancia: 250 },
        { ciudad: 'Monterrey', estacion: 'Verano', nubosidad: 20, irradiancia: 900 },
        { ciudad: 'CDMX', estacion: 'Verano', nubosidad: 60, irradiancia: 400 },
      ];

      for (const combo of combos) {
        try {
          const risk = await assessRisk(combo);
          if (risk.fuente !== 'ml') continue;
          if (risk.riesgo === 'alto' || risk.riesgo === 'medio') {
            newAlerts.push({
              id: `api-${++id}`,
              type: risk.riesgo === 'alto' ? 'error' : 'warning',
              title: `Predicción ML: Riesgo ${risk.riesgo} en ${combo.ciudad}`,
              message: risk.recomendacion,
              ciudad: combo.ciudad,
              timestamp: 'ML',
            });
          }
        } catch { /* skip */ }
      }

      // Recomendación de tarifa
      try {
        const tariff = await recommendOptimalTariff({ ciudad: 'CDMX', consumo_mensual_kwh: 350, num_paneles: 8 });
        newAlerts.push({
          id: `api-${++id}`,
          type: 'info',
          title: 'Recomendación ML: Tarifa óptima para CDMX',
          message: tariff.razon,
          ciudad: 'CDMX',
          timestamp: 'ML',
        });
      } catch { /* skip */ }

      setApiAlerts(newAlerts);
      showNotification(`${newAlerts.length} alertas generadas por ML`, 'success');
    } catch {
      showNotification('Error al consultar la API ML', 'error');
    } finally {
      setLoadingApi(false);
    }
  };

  const selectClass = "bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-primary/50";
  const counts = {
    all: allAlerts.length,
    success: allAlerts.filter(a => a.type === 'success').length,
    warning: allAlerts.filter(a => a.type === 'warning').length,
    info: allAlerts.filter(a => a.type === 'info').length,
    error: allAlerts.filter(a => a.type === 'error').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 px-8 py-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Centro de Alertas Inteligentes</h1>
              <p className="text-sm text-gray-400">{allAlerts.length} alertas generadas · {apiAlerts.length} del modelo ML</p>
            </div>
          </div>
          <button
            onClick={loadApiAlerts}
            disabled={loadingApi}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {loadingApi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loadingApi ? 'Consultando ML...' : 'Generar Alertas ML'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
              {(['all', 'error', 'warning', 'info', 'success'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
                    filter === f ? 'bg-primary text-background' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'error' ? 'Críticas' : f === 'warning' ? 'Advertencias' : f === 'info' ? 'Info' : 'Positivas'}
                  <span className="ml-1 opacity-60">({counts[f]})</span>
                </button>
              ))}
            </div>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={selectClass}>
              <option value="Todas">Todas las ciudades</option>
              {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Lista de alertas */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <GlassCard className="text-center py-12">
                <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No hay alertas con estos filtros</p>
              </GlassCard>
            ) : (
              filteredAlerts.map(alert => {
                const style = alertStyles[alert.type];
                const Icon = style.icon;
                return (
                  <div
                    key={alert.id}
                    className={`flex gap-3 items-start p-4 rounded-xl ${style.bg} border ${style.border} transition-colors cursor-default`}
                  >
                    <Icon className={`${style.iconColor} w-5 h-5 shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold ${style.text}`}>{alert.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-500 font-mono">{alert.ciudad}</span>
                        <span className="text-[10px] text-gray-600">·</span>
                        <span className="text-[10px] text-gray-500 font-mono">{alert.timestamp}</span>
                        {alert.id.startsWith('api-') && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">ML</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

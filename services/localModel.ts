/**
 * Estimaciones locales (sin backend).
 *
 * Se usan cuando la API ML no está disponible, por ejemplo en la demo
 * publicada como sitio estático. No son los modelos entrenados: son
 * aproximaciones físicas/estadísticas sencillas para que la interfaz siga
 * siendo funcional. La UI indica cuándo se está usando este modo.
 */
import { solarData, CFE_TARIFA_MXN_KWH } from '../data/solarData';
import type {
  GenerationRequest, GenerationResponse,
  CostRequest, CostResponse,
  RiskRequest, RiskResponse,
  PanelRecommendRequest, PanelRecommendResponse,
} from './api';

/** Mismo valor que COSTO_POR_PANEL_MXN en ml/utils.py */
const COSTO_POR_PANEL_MXN = 11500;

/** Horas solares pico por ciudad (mismas que ml/api.py) */
const HORAS_SOL: Record<string, number> = {
  CDMX: 5.5, Cancun: 5.3, Chihuahua: 6.5, Guadalajara: 5.8,
  Hermosillo: 7.0, Merida: 5.5, Monterrey: 5.5, Puebla: 5.5,
};

/** Factor de rendimiento típico de un sistema FV (pérdidas de cableado, suciedad, inversor). */
const PERFORMANCE_RATIO = 0.8;
/** Pérdida de eficiencia por °C sobre 25 °C (coeficiente típico de silicio cristalino). */
const TEMP_COEF = 0.004;

const rate = (tarifa?: string) => CFE_TARIFA_MXN_KWH[tarifa ?? '1'] ?? 1.65;

function normalizeCity(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Generación en kWh para una hora: P = kW · (G / 1000) · PR · derating térmico */
export function estimateGenerationKwh(capacidadKw: number, irradiancia: number, temperatura: number): number {
  const thermal = 1 - TEMP_COEF * Math.max(0, temperatura - 25);
  return Math.max(0, capacidadKw * (irradiancia / 1000) * PERFORMANCE_RATIO * thermal);
}

export function localPredictGeneration(req: GenerationRequest): GenerationResponse {
  return {
    generacion_predicha_kwh: +estimateGenerationKwh(req.capacidad_kw, req.irradiancia, req.temperatura).toFixed(3),
    modelo_usado: 'estimación física (sin API)',
    confianza: 0,
  };
}

export function localPredictCost(req: CostRequest): CostResponse {
  const r = rate(req.tarifa_cfe);
  const sinSolar = req.consumo_kwh * r;
  const conSolar = Math.max(0, req.consumo_kwh - req.generacion_kwh) * r;
  return {
    costo_estimado_mxn: +conSolar.toFixed(2),
    ahorro_vs_sin_solar: +(sinSolar - conSolar).toFixed(2),
  };
}

export function localAssessRisk(req: RiskRequest): RiskResponse {
  // Heurística: combina nubosidad e irradiancia baja en una probabilidad 0–1.
  const cloud = req.nubosidad / 100;
  const lowIrr = 1 - Math.min(req.irradiancia, 1000) / 1000;
  const probabilidad = Math.min(1, Math.max(0, 0.55 * cloud + 0.45 * lowIrr));

  const riesgo: RiskResponse['riesgo'] = probabilidad > 0.7 ? 'alto' : probabilidad > 0.4 ? 'medio' : 'bajo';
  const recomendacion = {
    alto: 'Considere usar batería de respaldo. La combinación de alta nubosidad y baja irradiancia reduce significativamente la generación.',
    medio: 'Monitoree el rendimiento de sus paneles. Considere ajustar el consumo de electrodomésticos a horas de mayor generación.',
    bajo: 'Las condiciones son favorables para la generación solar. Su sistema debería operar con buen rendimiento.',
  }[riesgo];

  const factores: string[] = [];
  if (req.nubosidad > 60) factores.push('alta nubosidad');
  if (req.irradiancia < 300) factores.push('baja irradiancia');
  if ((req.temperatura ?? 25) > 40) factores.push('temperatura extrema');
  if ((req.humedad ?? 50) > 80) factores.push('alta humedad');
  if (!factores.length) factores.push('condiciones normales');

  return { riesgo, probabilidad: +probabilidad.toFixed(3), recomendacion, factores_principales: factores };
}

/**
 * Replica la lógica de /api/recommend/panels (ml/api.py) usando el mismo
 * dataset que consume el frontend, por lo que da resultados equivalentes.
 */
export function localRecommendPanels(req: PanelRecommendRequest): PanelRecommendResponse {
  const ciudad = normalizeCity(req.ciudad);
  const rows = solarData.filter(r => r.Ciudad === ciudad);
  const mean = (f: (r: typeof rows[number]) => number) =>
    rows.length ? rows.reduce((s, r) => s + f(r), 0) / rows.length : 0;

  const genHoraPromedio = mean(r => r.Generacion_Solar_kWh);
  const panelesDataset = Math.max(mean(r => r.Num_Paneles), 1);
  const potencia = mean(r => r.Potencia_Panel_W) || 450;
  const horasSol = HORAS_SOL[ciudad] ?? 5.5;

  const genDiariaPorPanel = (genHoraPromedio / panelesDataset) * horasSol;
  const genMensualPorPanel = genDiariaPorPanel * 30;

  let paneles = genMensualPorPanel > 0 ? Math.ceil(req.consumo_mensual_kwh / genMensualPorPanel) : 12;
  paneles = Math.max(4, Math.min(24, paneles));

  const costoSistema = paneles * COSTO_POR_PANEL_MXN;
  const genMensual = genMensualPorPanel * paneles;
  const ahorroMensual = Math.min(genMensual, req.consumo_mensual_kwh) * rate(req.tarifa_cfe);
  const roi = ahorroMensual > 0 ? costoSistema / (ahorroMensual * 12) : 99;

  return {
    paneles_recomendados: paneles,
    capacidad_kw: +((paneles * potencia) / 1000).toFixed(2),
    ahorro_mensual_estimado: +ahorroMensual.toFixed(2),
    roi_anios: +Math.min(roi, 30).toFixed(1),
    generacion_diaria_estimada_kwh: +(genDiariaPorPanel * paneles).toFixed(2),
    costo_sistema_estimado_mxn: Math.round(costoSistema),
  };
}

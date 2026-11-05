/**
 * Respuestas de la "API" en el modo demo.
 *
 * - Generación y costo: predicciones del modelo real (Gradient Boosting),
 *   precalculadas con ml/export_demo_predictions.py sobre una cuadrícula
 *   ciudad × estación × hora × nubosidad e interpoladas aquí.
 * - Recomendación de paneles: misma lógica que /api/recommend/panels.
 * - Riesgo y tarifa óptima: datos simulados que muestran el comportamiento
 *   esperado de la plataforma (ver nota en ml/export_demo_predictions.py).
 *
 * Nunca hace peticiones de red.
 */
import predictions from './predictions.json';
import { CFE_TARIFA_MXN_KWH, TARIFAS } from '../../data/solarData';
import { estimateGenerationKwh, localAssessRisk, localRecommendPanels } from '../localModel';
import type {
  HealthResponse,
  GenerationRequest, GenerationResponse,
  CostRequest, CostResponse,
  RiskRequest, RiskResponse,
  PanelRecommendRequest, PanelRecommendResponse,
  OptimalTariffRequest, OptimalTariffResponse,
} from '../api';

interface Predictions {
  meta: {
    modelo: string;
    r2: number;
    capacidad_ref_kw: number;
    nubosidad: number[];
    generacion_costo: number[];
  };
  temp_base: Record<string, Record<string, number>>;
  gen: Record<string, Record<string, number[][]>>;
  cost: Record<string, Record<string, [number, number][]>>;
}

const P = predictions as unknown as Predictions;

/** Latencia simulada para que se vean los estados de carga como en la app real. */
const delay = (ms = 250 + Math.random() * 250) => new Promise(r => setTimeout(r, ms));

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const findKey = <T,>(obj: Record<string, T>, key: string) =>
  Object.keys(obj).find(k => normalize(k).toLowerCase() === normalize(key).toLowerCase());

/** Interpolación lineal de `values` (muestreados en `xs`) en el punto x. */
function interp(xs: number[], values: number[], x: number): number {
  if (x <= xs[0]) return values[0];
  const last = xs.length - 1;
  if (x >= xs[last]) return values[last];
  const i = xs.findIndex(v => v > x) - 1;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return values[i] + t * (values[i + 1] - values[i]);
}

export async function demoHealth(): Promise<HealthResponse> {
  await delay(100);
  return {
    status: 'ok',
    best_model: P.meta.modelo,
    r2_score: P.meta.r2,
    models_loaded: ['linear_regression', 'random_forest', 'gradient_boosting', 'neural_network'],
  };
}

export async function demoPredictGeneration(req: GenerationRequest): Promise<GenerationResponse> {
  await delay();
  const ciudad = findKey(P.gen, req.ciudad);
  const estacion = ciudad && findKey(P.gen[ciudad], req.estacion);
  if (!ciudad || !estacion || req.irradiancia <= 0) {
    return { generacion_predicha_kwh: 0, modelo_usado: P.meta.modelo, confianza: P.meta.r2 };
  }

  const hora = Math.min(23, Math.max(0, Math.round(req.hora)));
  const base = interp(P.meta.nubosidad, P.gen[ciudad][estacion][hora], req.nubosidad);
  // La generación del modelo escala casi linealmente con la capacidad instalada.
  const porCapacidad = req.capacidad_kw / P.meta.capacidad_ref_kw;
  // Ajuste térmico respecto a la temperatura media con que se precalculó la tabla.
  const tBase = P.temp_base[ciudad][estacion];
  const termico = estimateGenerationKwh(1, 1000, req.temperatura) / estimateGenerationKwh(1, 1000, tBase);

  return {
    generacion_predicha_kwh: +(base * porCapacidad * termico).toFixed(3),
    modelo_usado: P.meta.modelo,
    confianza: P.meta.r2,
  };
}

export async function demoPredictCost(req: CostRequest): Promise<CostResponse> {
  await delay();
  const ciudad = findKey(P.cost, req.ciudad) ?? 'CDMX';
  const tabla = P.cost[ciudad][req.tarifa_cfe] ?? P.cost[ciudad]['1'];
  const xs = P.meta.generacion_costo;
  const costo = interp(xs, tabla.map(r => r[0]), req.generacion_kwh);
  const ahorro = interp(xs, tabla.map(r => r[1]), req.generacion_kwh);
  return { costo_estimado_mxn: +costo.toFixed(2), ahorro_vs_sin_solar: +ahorro.toFixed(2) };
}

export async function demoAssessRisk(req: RiskRequest): Promise<RiskResponse> {
  await delay();
  return localAssessRisk(req);
}

export async function demoRecommendPanels(req: PanelRecommendRequest): Promise<PanelRecommendResponse> {
  await delay(600);
  return localRecommendPanels(req);
}

export async function demoRecommendOptimalTariff(req: OptimalTariffRequest): Promise<OptimalTariffResponse> {
  await delay();
  // Generación mensual por panel en la ciudad (misma base que el recomendador).
  const ref = localRecommendPanels({ ciudad: req.ciudad, num_habitantes: 4, tarifa_cfe: '1', consumo_mensual_kwh: 300 });
  const genMensual = (ref.generacion_diaria_estimada_kwh / ref.paneles_recomendados) * 30 * req.num_paneles;
  const neto = Math.max(0, req.consumo_mensual_kwh - genMensual);

  const comparativa: Record<string, number> = {};
  for (const t of TARIFAS) comparativa[t] = +(neto * (CFE_TARIFA_MXN_KWH[t] ?? 1.65)).toFixed(2);
  const mejor = TARIFAS.reduce((a, b) => (comparativa[b] < comparativa[a] ? b : a));
  const ahorroDac = comparativa['DAC'] - comparativa[mejor];

  return {
    tarifa_actual_sugerida: mejor,
    ahorro_vs_DAC: +ahorroDac.toFixed(2),
    razon:
      `Con ${req.num_paneles} paneles en ${req.ciudad} tu consumo neto baja a ${Math.round(neto)} kWh/mes. ` +
      `Mantenerte en tarifa ${mejor} te cuesta ~$${Math.round(comparativa[mejor])}/mes; ` +
      `si pasaras a DAC pagarías $${Math.round(ahorroDac)} más al mes.`,
    comparativa_tarifas: comparativa,
  };
}

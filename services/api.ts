/**
 * HeliosDash ML API Service
 * Wrapper para todas las llamadas al backend Python (FastAPI).
 *
 * URL del backend: variable VITE_API_URL. Si no está definida, en desarrollo
 * se usa http://localhost:8000 y en producción no se intenta llamar a la API.
 *
 * Las funciones marcadas "con fallback" usan estimaciones locales
 * (services/localModel.ts) si la API no responde, e indican la fuente
 * del resultado en el campo `fuente`.
 */
import {
  localPredictGeneration, localPredictCost, localAssessRisk, localRecommendPanels,
} from './localModel';

const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const TIMEOUT_MS = 5000;

/** Origen de un resultado: modelo ML del backend o estimación local. */
export type Fuente = 'ml' | 'local';
export type WithFuente<T> = T & { fuente: Fuente };

export const API_CONFIGURED = API_BASE !== '';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_CONFIGURED) throw new Error('API ML no configurada (VITE_API_URL)');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}

// --- Health ---
export interface HealthResponse {
  status: string;
  best_model: string;
  r2_score: number;
  models_loaded: string[];
}

export async function checkHealth(): Promise<HealthResponse> {
  return fetchAPI('/api/health');
}

export async function isAPIAvailable(): Promise<boolean> {
  try {
    await checkHealth();
    return true;
  } catch {
    return false;
  }
}

// --- Predict Generation ---
export interface GenerationRequest {
  ciudad: string;
  hora: number;
  mes?: number;
  estacion: string;
  temperatura: number;
  irradiancia: number;
  nubosidad: number;
  humedad?: number;
  velocidad_viento?: number;
  num_paneles: number;
  capacidad_kw: number;
  tarifa_cfe?: string;
  edad_sistema?: number;
  num_habitantes?: number;
}

export interface GenerationResponse {
  generacion_predicha_kwh: number;
  modelo_usado: string;
  confianza: number;
}

/** Con fallback: si la API no responde usa la estimación local. */
export async function predictGeneration(data: GenerationRequest): Promise<WithFuente<GenerationResponse>> {
  try {
    const res = await fetchAPI<GenerationResponse>('/api/predict/generation', {
    method: 'POST',
    body: JSON.stringify(data),
  });
    return { ...res, fuente: 'ml' };
  } catch {
    return { ...localPredictGeneration(data), fuente: 'local' };
  }
}

// --- Predict Cost ---
export interface CostRequest {
  ciudad: string;
  tarifa_cfe: string;
  consumo_kwh: number;
  generacion_kwh: number;
}

export interface CostResponse {
  costo_estimado_mxn: number;
  ahorro_vs_sin_solar: number;
}

/** Con fallback: si la API no responde usa la estimación local. */
export async function predictCost(data: CostRequest): Promise<WithFuente<CostResponse>> {
  try {
    const res = await fetchAPI<CostResponse>('/api/predict/cost', {
    method: 'POST',
    body: JSON.stringify(data),
  });
    return { ...res, fuente: 'ml' };
  } catch {
    return { ...localPredictCost(data), fuente: 'local' };
  }
}

// --- Predict Net Consumption ---
export interface NetConsumptionRequest {
  ciudad: string;
  hora: number;
  estacion: string;
  num_paneles: number;
  consumo_electrico: number;
  temperatura?: number;
  irradiancia?: number;
  nubosidad?: number;
  capacidad_kw?: number;
  tarifa_cfe?: string;
}

export interface NetConsumptionResponse {
  consumo_neto_kwh: number;
  es_excedente: boolean;
  generacion_estimada_kwh: number;
}

export async function predictNetConsumption(data: NetConsumptionRequest): Promise<NetConsumptionResponse> {
  return fetchAPI('/api/predict/net-consumption', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Recommend Panels ---
export interface PanelRecommendRequest {
  ciudad: string;
  num_habitantes: number;
  tarifa_cfe: string;
  consumo_mensual_kwh: number;
}

export interface PanelRecommendResponse {
  paneles_recomendados: number;
  capacidad_kw: number;
  ahorro_mensual_estimado: number;
  roi_anios: number;
  generacion_diaria_estimada_kwh: number;
  costo_sistema_estimado_mxn: number;
}

/** Con fallback: si la API no responde usa la estimación local. */
export async function recommendPanels(data: PanelRecommendRequest): Promise<WithFuente<PanelRecommendResponse>> {
  try {
    const res = await fetchAPI<PanelRecommendResponse>('/api/recommend/panels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
    return { ...res, fuente: 'ml' };
  } catch {
    return { ...localRecommendPanels(data), fuente: 'local' };
  }
}

// --- Best Hours ---
export interface BestHoursRequest {
  ciudad: string;
  estacion: string;
}

export interface BestHoursResponse {
  horas_pico_generacion: number[];
  mejor_hora_consumo: number;
  peor_hora_consumo: number;
  perfil_horario: Record<string, number>;
}

export async function recommendBestHours(data: BestHoursRequest): Promise<BestHoursResponse> {
  return fetchAPI('/api/recommend/best-hours', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Optimal Tariff ---
export interface OptimalTariffRequest {
  ciudad: string;
  consumo_mensual_kwh: number;
  num_paneles: number;
}

export interface OptimalTariffResponse {
  tarifa_actual_sugerida: string;
  ahorro_vs_DAC: number;
  razon: string;
  comparativa_tarifas: Record<string, number>;
}

export async function recommendOptimalTariff(data: OptimalTariffRequest): Promise<OptimalTariffResponse> {
  return fetchAPI('/api/recommend/optimal-tariff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Risk ---
export interface RiskRequest {
  ciudad: string;
  estacion: string;
  mes?: number;
  nubosidad: number;
  irradiancia: number;
  temperatura?: number;
  humedad?: number;
  hora?: number;
  num_paneles?: number;
  capacidad_kw?: number;
}

export interface RiskResponse {
  riesgo: 'alto' | 'medio' | 'bajo';
  probabilidad: number;
  recomendacion: string;
  factores_principales: string[];
}

/** Con fallback: si la API no responde usa la estimación local. */
export async function assessRisk(data: RiskRequest): Promise<WithFuente<RiskResponse>> {
  try {
    const res = await fetchAPI<RiskResponse>('/api/risk/low-performance', {
    method: 'POST',
    body: JSON.stringify(data),
  });
    return { ...res, fuente: 'ml' };
  } catch {
    return { ...localAssessRisk(data), fuente: 'local' };
  }
}

// --- Models Comparison ---
export interface ModelsComparison {
  best_model: string;
  models: Record<string, { r2: number; mae: number; rmse: number }>;
  secondary: Record<string, any>;
}

export async function getModelsComparison(): Promise<ModelsComparison> {
  return fetchAPI('/api/models/comparison');
}

// --- Data Aggregations ---
export async function getAggregations(): Promise<any> {
  return fetchAPI('/api/data/aggregations');
}

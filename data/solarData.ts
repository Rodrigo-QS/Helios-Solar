import rawData from './solar_dataset.json';

// --- Tipos ---
export interface SolarRecord {
  Fecha: string;
  Hora: number;
  Mes: number;
  Estacion: string;
  Dia_Semana: string;
  Es_FinDeSemana: number;
  Ciudad: string;
  Latitud: number;
  Temperatura_C: number;
  Humedad_Relativa: number;
  Irradiancia_Wm2: number;
  Nubosidad: number;
  Velocidad_Viento_kmh: number;
  Precipitacion_mm: number;
  Num_Paneles: number;
  Potencia_Panel_W: number;
  Capacidad_Sistema_kW: number;
  Inclinacion_Paneles: number;
  Orientacion_Azimut: number;
  Num_Inversores: number;
  Eficiencia_Inversor: number;
  Edad_Sistema_anios: number;
  Num_Habitantes: number;
  Tarifa_CFE: string;
  Generacion_Solar_kWh: number;
  Consumo_Electrico_kWh: number;
  Consumo_Neto_kWh: number;
  Costo_Estimado_MXN: number;
}

export const solarData: SolarRecord[] = rawData as SolarRecord[];

export const CIUDADES = ['CDMX', 'Cancun', 'Chihuahua', 'Guadalajara', 'Hermosillo', 'Merida', 'Monterrey', 'Puebla'];
export const ESTACIONES = ['Invierno', 'Primavera', 'Verano', 'Otoño'];
export const TARIFAS = ['1', '1A', '1B', '1C', 'DAC'];

export const ESTACION_COLORS: Record<string, string> = {
  'Primavera': '#13ec5b',
  'Verano': '#eab308',
  'Otoño': '#f97316',
  'Invierno': '#3b82f6',
};

/**
 * Tarifas CFE promedio reales (MXN por kWh) — México 2024/2025.
 * Basado en: básico + intermedio + excedente ponderado.
 */
export const CFE_TARIFA_MXN_KWH: Record<string, number> = {
  '1':   1.20,   // Tarifa doméstica básica
  '1A':  1.40,   // Zona cálida baja
  '1B':  1.65,   // Zona cálida media
  '1C':  2.10,   // Zona cálida alta
  'DAC': 5.80,   // Doméstica de alto consumo
};

/** Costo mensual estimado de luz sin paneles solares */
export function costoMensualSinSolar(consumoKwh: number, tarifa: string): number {
  const rate = CFE_TARIFA_MXN_KWH[tarifa] ?? 1.65;
  return Math.round(consumoKwh * rate);
}

/** Costo mensual con paneles solares (reduce generación del consumo) */
export function costoMensualConSolar(consumoKwh: number, generacionMensualKwh: number, tarifa: string): number {
  const rate = CFE_TARIFA_MXN_KWH[tarifa] ?? 1.65;
  const netoKwh = Math.max(0, consumoKwh - generacionMensualKwh);
  return Math.round(netoKwh * rate);
}

// --- Funciones de filtrado ---
export function filterData(
  data: SolarRecord[],
  ciudad?: string,
  estacion?: string,
  tarifa?: string
): SolarRecord[] {
  let filtered = data;
  if (ciudad && ciudad !== 'Todas') {
    filtered = filtered.filter(d => d.Ciudad === ciudad);
  }
  if (estacion && estacion !== 'Todas') {
    filtered = filtered.filter(d => d.Estacion === estacion);
  }
  if (tarifa && tarifa !== 'Todas') {
    filtered = filtered.filter(d => d.Tarifa_CFE === tarifa);
  }
  return filtered;
}

// --- Gráfica 1: Generación promedio por ciudad ---
export interface CityGeneration {
  ciudad: string;
  generacion: number;
}

export function getGenerationByCity(data: SolarRecord[]): CityGeneration[] {
  const grouped: Record<string, number[]> = {};
  for (const d of data) {
    if (!grouped[d.Ciudad]) grouped[d.Ciudad] = [];
    grouped[d.Ciudad].push(d.Generacion_Solar_kWh);
  }
  return Object.entries(grouped)
    .map(([ciudad, vals]) => ({
      ciudad,
      generacion: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000,
    }))
    .sort((a, b) => b.generacion - a.generacion);
}

// --- Gráfica 2: Scatter irradiancia vs generación ---
export interface ScatterPoint {
  irradiancia: number;
  generacion: number;
  nubosidad: number;
  ciudad: string;
  hora: number;
  estacion: string;
}

export function getScatterData(data: SolarRecord[]): ScatterPoint[] {
  return data.map(d => ({
    irradiancia: d.Irradiancia_Wm2,
    generacion: d.Generacion_Solar_kWh,
    nubosidad: d.Nubosidad,
    ciudad: d.Ciudad,
    hora: d.Hora,
    estacion: d.Estacion,
  }));
}

// --- Gráfica 3: Perfil horario por estación ---
export interface HourlyProfile {
  hora: number;
  [estacion: string]: number;
}

export function getHourlyProfile(data: SolarRecord[]): HourlyProfile[] {
  const grouped: Record<number, Record<string, number[]>> = {};
  for (let h = 0; h < 24; h++) {
    grouped[h] = {};
    for (const est of ESTACIONES) {
      grouped[h][est] = [];
    }
  }
  for (const d of data) {
    if (grouped[d.Hora] && grouped[d.Hora][d.Estacion]) {
      grouped[d.Hora][d.Estacion].push(d.Generacion_Solar_kWh);
    }
  }
  const result: HourlyProfile[] = [];
  for (let h = 0; h < 24; h++) {
    const row: HourlyProfile = { hora: h };
    for (const est of ESTACIONES) {
      const vals = grouped[h][est];
      row[est] = vals.length > 0
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000
        : 0;
    }
    result.push(row);
  }
  return result;
}

// --- Gráfica 4: Correlación ---
export const CORRELATION_VARS = [
  'Temperatura_C', 'Humedad_Relativa', 'Irradiancia_Wm2',
  'Nubosidad', 'Velocidad_Viento_kmh', 'Num_Paneles',
  'Capacidad_Sistema_kW', 'Edad_Sistema_anios',
  'Generacion_Solar_kWh', 'Consumo_Electrico_kWh', 'Consumo_Neto_kWh', 'Costo_Estimado_MXN',
];

export const CORRELATION_LABELS: Record<string, string> = {
  'Temperatura_C': 'Temp',
  'Humedad_Relativa': 'Humedad',
  'Irradiancia_Wm2': 'Irrad.',
  'Nubosidad': 'Nubos.',
  'Velocidad_Viento_kmh': 'Viento',
  'Num_Paneles': 'Paneles',
  'Capacidad_Sistema_kW': 'Cap.kW',
  'Edad_Sistema_anios': 'Edad',
  'Generacion_Solar_kWh': 'Gen.',
  'Consumo_Electrico_kWh': 'Consumo',
  'Consumo_Neto_kWh': 'C.Neto',
  'Costo_Estimado_MXN': 'Costo',
};

export function computeCorrelation(data: SolarRecord[]): number[][] {
  const n = data.length;
  const vars = CORRELATION_VARS;
  const values: number[][] = vars.map(v =>
    data.map(d => (d as any)[v] as number)
  );

  // Calcular medias
  const means = values.map(col => col.reduce((a, b) => a + b, 0) / n);

  // Calcular correlación de Pearson
  const matrix: number[][] = [];
  for (let i = 0; i < vars.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < vars.length; j++) {
      if (i === j) {
        row.push(1);
        continue;
      }
      let sumXY = 0, sumX2 = 0, sumY2 = 0;
      for (let k = 0; k < n; k++) {
        const dx = values[i][k] - means[i];
        const dy = values[j][k] - means[j];
        sumXY += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
      }
      const denom = Math.sqrt(sumX2 * sumY2);
      row.push(denom === 0 ? 0 : Math.round((sumXY / denom) * 1000) / 1000);
    }
    matrix.push(row);
  }
  return matrix;
}

// --- Gráfica 5: Radar por tarifa ---
export interface TarifaRadarPoint {
  metric: string;
  fullName: string;
  [tarifa: string]: string | number;
}

export const TARIFA_COLORS: Record<string, string> = {
  '1': '#13ec5b',
  '1A': '#3b82f6',
  '1B': '#eab308',
  '1C': '#f97316',
  'DAC': '#a855f7',
};

export function getRadarByTariff(data: SolarRecord[]): TarifaRadarPoint[] {
  const metrics: { key: keyof SolarRecord; label: string; fullName: string }[] = [
    { key: 'Generacion_Solar_kWh', label: 'Generación', fullName: 'Generación Solar (kWh)' },
    { key: 'Consumo_Electrico_kWh', label: 'Consumo', fullName: 'Consumo Eléctrico (kWh)' },
    { key: 'Irradiancia_Wm2', label: 'Irradiancia', fullName: 'Irradiancia (W/m²)' },
    { key: 'Temperatura_C', label: 'Temperatura', fullName: 'Temperatura (°C)' },
    { key: 'Num_Paneles', label: 'Paneles', fullName: 'Número de Paneles' },
    { key: 'Costo_Estimado_MXN', label: 'Costo', fullName: 'Costo Estimado (MXN)' },
  ];

  // Calcular promedios por tarifa
  const grouped: Record<string, SolarRecord[]> = {};
  for (const d of data) {
    if (!grouped[d.Tarifa_CFE]) grouped[d.Tarifa_CFE] = [];
    grouped[d.Tarifa_CFE].push(d);
  }

  // Encontrar máximos globales para normalizar (0-100)
  const avgs: Record<string, Record<string, number>> = {};
  for (const tarifa of TARIFAS) {
    avgs[tarifa] = {};
    const records = grouped[tarifa] || [];
    for (const m of metrics) {
      const vals = records.map(r => Math.abs(r[m.key] as number));
      avgs[tarifa][m.key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
  }

  const maxPerMetric: Record<string, number> = {};
  for (const m of metrics) {
    maxPerMetric[m.key] = Math.max(...TARIFAS.map(t => avgs[t][m.key]), 0.001);
  }

  // Construir datos normalizados
  return metrics.map(m => {
    const point: TarifaRadarPoint = { metric: m.label, fullName: m.fullName };
    for (const tarifa of TARIFAS) {
      point[tarifa] = Math.round((avgs[tarifa][m.key] / maxPerMetric[m.key]) * 100);
    }
    return point;
  });
}

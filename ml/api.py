"""
HeliosDash ML - API REST
Sirve predicciones y agregaciones de datos para el frontend React.
Uso: uvicorn api:app --reload --port 8000
"""

import os
import json
import math
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from utils import (
    load_model_artifacts, predict_single, normalize_city_name, normalize_estacion,
    CITY_LATITUDES, CIUDADES, ESTACIONES, TARIFAS, COSTO_POR_PANEL_MXN,
    MODELS_DIR, METRICS_PATH, DAY_NAMES, TARGET_GENERATION as TARGET_GENERATION_KEY,
    TARGET_CONSUMPTION as TARGET_CONSUMPTION_KEY
)

# --- App ---
app = FastAPI(
    title="HeliosDash ML API",
    description="API de prediccion de generacion solar con Machine Learning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado global - se carga al inicio
artifacts: Dict[str, Any] = {}


@app.on_event("startup")
def load_models():
    global artifacts
    try:
        artifacts = load_model_artifacts()
        best = artifacts.get("best_model_name", "desconocido")
        r2 = artifacts.get("best_r2", 0)
        print(f"Modelos cargados. Mejor: {best} (R²: {r2:.4f})")
    except Exception as e:
        print(f"ADVERTENCIA: No se pudieron cargar modelos: {e}")
        print("Ejecute train_models.py primero.")
        artifacts = {}


def check_models():
    if not artifacts or "best_model" not in artifacts:
        raise HTTPException(status_code=503, detail="Modelos no cargados. Ejecute train_models.py primero.")


def get_latitud(ciudad: str) -> float:
    ciudad_norm = normalize_city_name(ciudad)
    return CITY_LATITUDES.get(ciudad_norm, 19.43)


# ============================================================
# REQUEST MODELS
# ============================================================

class GenerationRequest(BaseModel):
    ciudad: str
    hora: int = Field(..., ge=0, le=23)
    mes: int = Field(6, ge=1, le=12)
    estacion: str
    temperatura: float = Field(..., ge=-10, le=55)
    irradiancia: float = Field(..., ge=0, le=1500)
    nubosidad: float = Field(..., ge=0, le=100)
    humedad: float = Field(50.0, ge=0, le=100)
    velocidad_viento: float = Field(10.0, ge=0, le=150)
    precipitacion: float = Field(0.0, ge=0, le=200)
    num_paneles: int = Field(..., ge=1, le=50)
    capacidad_kw: float = Field(..., ge=0.1, le=50)
    potencia_panel_w: float = Field(450.0, ge=100, le=800)
    inclinacion: float = Field(20.0, ge=0, le=90)
    orientacion_azimut: float = Field(180.0, ge=0, le=360)
    num_inversores: int = Field(1, ge=1, le=10)
    eficiencia_inversor: float = Field(96.0, ge=80, le=100)
    edad_sistema: float = Field(1.0, ge=0, le=30)
    num_habitantes: int = Field(4, ge=1, le=20)
    tarifa_cfe: str = Field("1")
    es_fin_de_semana: int = Field(0, ge=0, le=1)
    dia_semana: int = Field(2, ge=0, le=6)
    latitud: Optional[float] = None


class CostRequest(BaseModel):
    ciudad: str
    tarifa_cfe: str
    consumo_kwh: float = Field(..., ge=0)
    generacion_kwh: float = Field(..., ge=0)


class NetConsumptionRequest(BaseModel):
    ciudad: str
    hora: int = Field(..., ge=0, le=23)
    mes: int = Field(6, ge=1, le=12)
    estacion: str
    num_paneles: int = Field(..., ge=1, le=50)
    consumo_electrico: float = Field(..., ge=0)
    temperatura: float = Field(25.0, ge=-10, le=55)
    irradiancia: float = Field(500.0, ge=0, le=1500)
    nubosidad: float = Field(30.0, ge=0, le=100)
    humedad: float = Field(50.0, ge=0, le=100)
    velocidad_viento: float = Field(10.0, ge=0, le=150)
    precipitacion: float = Field(0.0, ge=0, le=200)
    capacidad_kw: float = Field(5.0, ge=0.1, le=50)
    potencia_panel_w: float = Field(450.0, ge=100, le=800)
    inclinacion: float = Field(20.0, ge=0, le=90)
    orientacion_azimut: float = Field(180.0, ge=0, le=360)
    num_inversores: int = Field(1, ge=1, le=10)
    eficiencia_inversor: float = Field(96.0, ge=80, le=100)
    edad_sistema: float = Field(1.0, ge=0, le=30)
    num_habitantes: int = Field(4, ge=1, le=20)
    tarifa_cfe: str = Field("1")
    es_fin_de_semana: int = Field(0, ge=0, le=1)
    dia_semana: int = Field(2, ge=0, le=6)
    latitud: Optional[float] = None


class PanelRecommendRequest(BaseModel):
    ciudad: str
    num_habitantes: int = Field(..., ge=1, le=20)
    tarifa_cfe: str
    consumo_mensual_kwh: float = Field(..., ge=0)


class BestHoursRequest(BaseModel):
    ciudad: str
    estacion: str


class OptimalTariffRequest(BaseModel):
    ciudad: str
    consumo_mensual_kwh: float = Field(..., ge=0)
    num_paneles: int = Field(..., ge=1, le=50)


class RiskRequest(BaseModel):
    ciudad: str
    estacion: str
    nubosidad: float = Field(..., ge=0, le=100)
    irradiancia: float = Field(..., ge=0, le=1500)
    temperatura: float = Field(25.0, ge=-10, le=55)
    humedad: float = Field(50.0, ge=0, le=100)
    hora: int = Field(12, ge=0, le=23)
    mes: int = Field(6, ge=1, le=12)
    velocidad_viento: float = Field(10.0, ge=0, le=150)
    precipitacion: float = Field(0.0, ge=0, le=200)
    num_paneles: int = Field(8, ge=1, le=50)
    capacidad_kw: float = Field(3.6, ge=0.1, le=50)
    potencia_panel_w: float = Field(450.0, ge=100, le=800)
    inclinacion: float = Field(20.0, ge=0, le=90)
    orientacion_azimut: float = Field(180.0, ge=0, le=360)
    num_inversores: int = Field(1, ge=1, le=10)
    eficiencia_inversor: float = Field(96.0, ge=80, le=100)
    edad_sistema: float = Field(1.0, ge=0, le=30)
    num_habitantes: int = Field(4, ge=1, le=20)
    tarifa_cfe: str = Field("1")
    es_fin_de_semana: int = Field(0, ge=0, le=1)
    dia_semana: int = Field(2, ge=0, le=6)
    latitud: Optional[float] = None


# ============================================================
# HELPER: construir dict de features desde request
# ============================================================

def build_generation_input(req) -> Dict[str, Any]:
    """Construye dict de features para el modelo de generación."""
    ciudad = normalize_city_name(req.ciudad)
    estacion = normalize_estacion(req.estacion)
    lat = req.latitud if req.latitud else get_latitud(ciudad)
    dia_idx = getattr(req, "dia_semana", 2)
    dia_nombre = DAY_NAMES[dia_idx % 7]

    return {
        "Ciudad": ciudad,
        "Estacion": estacion,
        "Tarifa_CFE": req.tarifa_cfe,
        "Hora": req.hora,
        "Mes": req.mes,
        "Dia_Semana": dia_nombre,
        "Es_FinDeSemana": getattr(req, "es_fin_de_semana", 0),
        "Latitud": lat,
        "Temperatura_C": req.temperatura,
        "Humedad_Relativa_%": getattr(req, "humedad", 50.0),
        "Irradiancia_Wm2": req.irradiancia,
        "Nubosidad_%": req.nubosidad,
        "Velocidad_Viento_kmh": getattr(req, "velocidad_viento", 10.0),
        "Precipitacion_mm": getattr(req, "precipitacion", 0.0),
        "Num_Paneles": req.num_paneles,
        "Potencia_Panel_W": getattr(req, "potencia_panel_w", 450.0),
        "Capacidad_Sistema_kW": req.capacidad_kw,
        "Inclinacion_Paneles_grados": getattr(req, "inclinacion", 20.0),
        "Orientacion_Azimut": getattr(req, "orientacion_azimut", 180.0),
        "Num_Inversores": getattr(req, "num_inversores", 1),
        "Eficiencia_Inversor_%": getattr(req, "eficiencia_inversor", 96.0),
        "Edad_Sistema_anios": getattr(req, "edad_sistema", 1.0),
        "Num_Habitantes": getattr(req, "num_habitantes", 4),
    }


# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/api/health")
def health_check():
    if not artifacts:
        return {
            "status": "no_models",
            "message": "Modelos no cargados. Ejecute train_models.py primero.",
        }
    return {
        "status": "ok",
        "best_model": artifacts.get("best_model_name", "unknown"),
        "r2_score": round(artifacts.get("best_r2", 0), 4),
        "models_loaded": list(artifacts.get("all_models", {}).keys()),
        "version": "1.0.0",
    }


@app.post("/api/predict/generation")
def predict_generation(req: GenerationRequest):
    check_models()
    feature_names = artifacts["feature_names"]["generation"]
    input_dict = build_generation_input(req)

    prediction = predict_single(
        artifacts["best_model"],
        artifacts["preprocessor"],
        feature_names["cat_cols"],
        feature_names["num_cols"],
        input_dict,
    )
    # Sin irradiancia no hay generación; el modelo devuelve un residuo (~0.17 kWh)
    # por el ruido nocturno del dataset sintético.
    prediction = 0.0 if req.irradiancia <= 0 else max(0, prediction)

    return {
        "generacion_predicha_kwh": round(prediction, 3),
        "modelo_usado": artifacts["best_model_name"],
        "confianza": round(artifacts["best_r2"], 4),
    }


@app.post("/api/predict/cost")
def predict_cost(req: CostRequest):
    check_models()

    ciudad = normalize_city_name(req.ciudad)
    feature_names = artifacts["feature_names"]["cost"]

    # Construir input para el modelo de costo
    # Usamos valores promedio de la ciudad para los campos que no tenemos
    city_stats = artifacts.get("dataset_stats", {}).get("city_stats", {}).get(ciudad, {})
    lat = get_latitud(ciudad)

    input_dict = {
        "Ciudad": ciudad,
        "Estacion": "Verano",
        "Tarifa_CFE": req.tarifa_cfe,
        "Hora": 12,
        "Mes": 6,
        "Dia_Semana": 2,
        "Es_FinDeSemana": 0,
        "Latitud": lat,
        "Temperatura_C": 30.0,
        "Humedad_Relativa_%": 50.0,
        "Irradiancia_Wm2": city_stats.get("irradiancia_promedio", 500.0),
        "Nubosidad_%": 30.0,
        "Velocidad_Viento_kmh": 10.0,
        "Precipitacion_mm": 0.0,
        "Num_Paneles": 8,
        "Potencia_Panel_W": 450.0,
        "Capacidad_Sistema_kW": 3.6,
        "Inclinacion_Paneles_grados": 20.0,
        "Orientacion_Azimut": 180.0,
        "Num_Inversores": 1,
        "Eficiencia_Inversor_%": 96.0,
        "Edad_Sistema_anios": 1.0,
        "Num_Habitantes": 4,
        TARGET_GENERATION_KEY: req.generacion_kwh,
        TARGET_CONSUMPTION_KEY: req.consumo_kwh,
    }

    prediction = predict_single(
        artifacts["cost_model"],
        artifacts["cost_preprocessor"],
        feature_names["cat_cols"],
        feature_names["num_cols"],
        input_dict,
    )
    prediction = max(0, prediction)

    # Calcular ahorro: costo sin solar (generacion=0)
    input_no_solar = dict(input_dict)
    input_no_solar[TARGET_GENERATION_KEY] = 0.0
    cost_no_solar = predict_single(
        artifacts["cost_model"],
        artifacts["cost_preprocessor"],
        feature_names["cat_cols"],
        feature_names["num_cols"],
        input_no_solar,
    )
    cost_no_solar = max(0, cost_no_solar)
    ahorro = max(0, cost_no_solar - prediction)

    return {
        "costo_estimado_mxn": round(prediction, 2),
        "ahorro_vs_sin_solar": round(ahorro, 2),
    }


@app.post("/api/predict/net-consumption")
def predict_net_consumption(req: NetConsumptionRequest):
    check_models()
    feature_names = artifacts["feature_names"]["net"]
    input_dict = build_generation_input(req)
    # Agregar generación como feature (primero predecimos generación)
    gen_feature_names = artifacts["feature_names"]["generation"]
    gen_prediction = predict_single(
        artifacts["best_model"],
        artifacts["preprocessor"],
        gen_feature_names["cat_cols"],
        gen_feature_names["num_cols"],
        input_dict,
    )
    gen_prediction = max(0, gen_prediction)
    input_dict[TARGET_GENERATION_KEY] = gen_prediction

    prediction = predict_single(
        artifacts["net_consumption_model"],
        artifacts["net_preprocessor"],
        feature_names["cat_cols"],
        feature_names["num_cols"],
        input_dict,
    )

    return {
        "consumo_neto_kwh": round(prediction, 3),
        "es_excedente": prediction < 0,
        "generacion_estimada_kwh": round(gen_prediction, 3),
    }


@app.post("/api/recommend/panels")
def recommend_panels(req: PanelRecommendRequest):
    check_models()
    ciudad = normalize_city_name(req.ciudad)
    city_stats = artifacts.get("dataset_stats", {}).get("city_stats", {})

    if ciudad not in city_stats:
        raise HTTPException(status_code=400, detail=f"Ciudad no encontrada: {ciudad}")

    stats = city_stats[ciudad]
    gen_hora_promedio = stats["generacion_diaria_promedio"]  # es promedio por hora
    num_paneles_dataset = stats["num_paneles_promedio"]
    potencia = stats["potencia_panel_promedio"]

    # Horas solares pico por ciudad (promedio anual México)
    HORAS_SOL = {
        "CDMX": 5.5, "Cancun": 5.3, "Chihuahua": 6.5, "Guadalajara": 5.8,
        "Hermosillo": 7.0, "Merida": 5.5, "Monterrey": 5.5, "Puebla": 5.5,
    }
    horas_sol = HORAS_SOL.get(ciudad, 5.5)

    # Generación diaria por panel = (gen promedio por hora / paneles) × horas de sol
    gen_por_panel_hora = gen_hora_promedio / max(num_paneles_dataset, 1)
    gen_diaria_por_panel = gen_por_panel_hora * horas_sol
    gen_mensual_por_panel = gen_diaria_por_panel * 30

    # Paneles necesarios
    if gen_mensual_por_panel > 0:
        paneles_needed = math.ceil(req.consumo_mensual_kwh / gen_mensual_por_panel)
    else:
        paneles_needed = 12

    paneles_needed = max(4, min(24, paneles_needed))
    capacidad = paneles_needed * potencia / 1000
    gen_diaria_estimada = gen_diaria_por_panel * paneles_needed

    # Tarifas CFE promedio reales MXN/kWh — México 2024/2025
    CFE_RATES = {"1": 1.20, "1A": 1.40, "1B": 1.65, "1C": 2.10, "DAC": 5.80}
    tarifa_rate = CFE_RATES.get(req.tarifa_cfe, 1.65)

    # Costo y ROI
    costo_sistema = paneles_needed * COSTO_POR_PANEL_MXN
    gen_mensual = gen_mensual_por_panel * paneles_needed
    kwh_ahorrados = min(gen_mensual, req.consumo_mensual_kwh)  # no se ahorra más de lo que se consume
    ahorro_mensual = kwh_ahorrados * tarifa_rate

    if ahorro_mensual > 0:
        roi_anios = costo_sistema / (ahorro_mensual * 12)
    else:
        roi_anios = 99

    return {
        "paneles_recomendados": paneles_needed,
        "capacidad_kw": round(capacidad, 2),
        "ahorro_mensual_estimado": round(ahorro_mensual, 2),
        "roi_anios": round(min(roi_anios, 30), 1),
        "generacion_diaria_estimada_kwh": round(gen_diaria_estimada, 2),
        "costo_sistema_estimado_mxn": round(costo_sistema, 0),
    }


@app.post("/api/recommend/best-hours")
def recommend_best_hours(req: BestHoursRequest):
    check_models()
    ciudad = normalize_city_name(req.ciudad)
    estacion = normalize_estacion(req.estacion)
    city_stats = artifacts.get("dataset_stats", {}).get("city_stats", {})

    if ciudad not in city_stats:
        raise HTTPException(status_code=400, detail=f"Ciudad no encontrada: {ciudad}")

    perfiles = city_stats[ciudad].get("perfiles_horarios", {})
    perfil = perfiles.get(estacion, {})

    if not perfil:
        raise HTTPException(status_code=400, detail=f"No hay datos para {ciudad} en {estacion}")

    # Convertir a lista y encontrar horas pico
    hourly = [(int(h), v) for h, v in perfil.items()]
    hourly.sort(key=lambda x: x[0])

    values = [v for _, v in hourly]
    if values:
        p75 = np.percentile(values, 75)
        horas_pico = [h for h, v in hourly if v >= p75 and v > 0]
        mejor_hora = max(hourly, key=lambda x: x[1])[0] if hourly else 12
        # Peor hora: buscar en rango nocturno (18-23, 0-5)
        nocturnas = [(h, v) for h, v in hourly if h >= 18 or h <= 5]
        peor_hora = min(nocturnas, key=lambda x: x[1])[0] if nocturnas else 20
    else:
        horas_pico = [10, 11, 12, 13, 14]
        mejor_hora = 12
        peor_hora = 20

    perfil_completo = {str(h): round(v, 3) for h, v in hourly}

    return {
        "horas_pico_generacion": horas_pico,
        "mejor_hora_consumo": mejor_hora,
        "peor_hora_consumo": peor_hora,
        "perfil_horario": perfil_completo,
    }


@app.post("/api/recommend/optimal-tariff")
def recommend_optimal_tariff(req: OptimalTariffRequest):
    check_models()
    ciudad = normalize_city_name(req.ciudad)
    tariff_stats = artifacts.get("dataset_stats", {}).get("tariff_stats", {})
    city_stats = artifacts.get("dataset_stats", {}).get("city_stats", {})

    if not tariff_stats:
        raise HTTPException(status_code=503, detail="Estadísticas de tarifas no disponibles")

    # Estimar costo por tarifa basado en estadísticas del dataset
    cost_per_tariff = {}
    for tarifa, stats in tariff_stats.items():
        base_cost = stats["costo_promedio"]
        # Ajustar por número de paneles (más paneles = menos costo neto)
        panel_factor = max(0.1, 1 - (req.num_paneles / 24) * 0.6)
        # Ajustar por consumo
        consumption_factor = req.consumo_mensual_kwh / 300  # normalizar
        estimated = base_cost * panel_factor * consumption_factor
        cost_per_tariff[tarifa] = round(max(0, estimated), 2)

    best_tarifa = min(cost_per_tariff, key=cost_per_tariff.get)
    dac_cost = cost_per_tariff.get("DAC", cost_per_tariff.get(max(cost_per_tariff, key=cost_per_tariff.get)))
    ahorro_dac = max(0, dac_cost - cost_per_tariff[best_tarifa])

    return {
        "tarifa_actual_sugerida": best_tarifa,
        "ahorro_vs_DAC": round(ahorro_dac, 2),
        "razon": (f"Con {req.num_paneles} paneles en {ciudad}, la tarifa {best_tarifa} "
                  f"optimiza tu costo. Ahorras ${ahorro_dac:.0f}/mes vs tarifa DAC."),
        "comparativa_tarifas": cost_per_tariff,
    }


@app.post("/api/risk/low-performance")
def assess_risk(req: RiskRequest):
    check_models()
    feature_names = artifacts["feature_names"]["risk"]
    input_dict = build_generation_input(req)

    # Usar predict_proba del clasificador
    risk_model = artifacts["risk_model"]
    preprocessor = artifacts["risk_preprocessor"]

    # Preprocesar
    from utils import CYCLICAL_COLS
    processed = dict(input_dict)
    for col, period in CYCLICAL_COLS.items():
        if col in processed:
            val = processed.pop(col)
            processed[f"{col}_sin"] = np.sin(2 * np.pi * val / period)
            processed[f"{col}_cos"] = np.cos(2 * np.pi * val / period)

    import pandas as pd
    all_cols = feature_names["cat_cols"] + feature_names["num_cols"]
    row = {col: [processed.get(col, 0)] for col in all_cols}
    df_input = pd.DataFrame(row)
    X_transformed = preprocessor.transform(df_input)

    proba = risk_model.predict_proba(X_transformed)[0]
    prob_low = float(proba[1]) if len(proba) > 1 else float(proba[0])

    # Clasificar nivel de riesgo
    if prob_low > 0.7:
        riesgo = "alto"
        recomendacion = "Considere usar batería de respaldo. La combinación de alta nubosidad y baja irradiancia reduce significativamente la generación."
    elif prob_low > 0.4:
        riesgo = "medio"
        recomendacion = "Monitoree el rendimiento de sus paneles. Considere ajustar el consumo de electrodomésticos a horas de mayor generación."
    else:
        riesgo = "bajo"
        recomendacion = "Las condiciones son favorables para la generación solar. Su sistema debería operar con buen rendimiento."

    # Factores principales
    factores = []
    if req.nubosidad > 60:
        factores.append("alta nubosidad")
    if req.irradiancia < 300:
        factores.append("baja irradiancia")
    if req.temperatura > 40:
        factores.append("temperatura extrema")
    if req.humedad > 80:
        factores.append("alta humedad")
    if not factores:
        factores.append("condiciones normales")

    return {
        "riesgo": riesgo,
        "probabilidad": round(prob_low, 3),
        "recomendacion": recomendacion,
        "factores_principales": factores,
    }


@app.get("/api/data/aggregations")
def get_aggregations():
    check_models()
    ds = artifacts.get("dataset_stats")
    if not ds:
        raise HTTPException(status_code=503, detail="Estadísticas del dataset no disponibles")
    return ds


@app.get("/api/models/comparison")
def get_models_comparison():
    check_models()
    metrics = artifacts.get("metrics")
    if not metrics:
        raise HTTPException(status_code=503, detail="Métricas no disponibles")
    return metrics

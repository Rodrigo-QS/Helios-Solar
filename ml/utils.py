"""
HeliosDash ML - Utilidades
Funciones de carga, preprocesamiento, feature engineering e inferencia.
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from typing import Dict, List, Tuple, Any, Optional

# --- Rutas ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
METRICS_PATH = os.path.join(BASE_DIR, "metrics.json")
DATASET_STATS_PATH = os.path.join(BASE_DIR, "dataset_stats.json")
DEFAULT_DATASET_PATH = os.path.join(BASE_DIR, "..", "Dataset_Paneles_Solares_MX.xlsx")
# Copia versionada del dataset (la misma que consume el frontend). Se usa cuando
# no está el Excel original, para que el pipeline sea reproducible al clonar el repo.
JSON_DATASET_PATH = os.path.join(BASE_DIR, "..", "data", "solar_dataset.json")

# El JSON usa nombres de columna sin sufijos de unidad; se mapean a los del Excel.
JSON_COLUMN_MAP = {
    "Humedad_Relativa": "Humedad_Relativa_%",
    "Nubosidad": "Nubosidad_%",
    "Inclinacion_Paneles": "Inclinacion_Paneles_grados",
    "Eficiencia_Inversor": "Eficiencia_Inversor_%",
}

# --- Columnas del dataset ---
CATEGORICAL_COLS = ["Ciudad", "Estacion", "Tarifa_CFE", "Dia_Semana"]
CYCLICAL_COLS = {"Hora": 24, "Mes": 12}
BINARY_COLS = ["Es_FinDeSemana"]

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
NUMERIC_COLS = [
    "Latitud", "Temperatura_C", "Humedad_Relativa_%", "Irradiancia_Wm2",
    "Nubosidad_%", "Velocidad_Viento_kmh", "Precipitacion_mm",
    "Num_Paneles", "Potencia_Panel_W", "Capacidad_Sistema_kW",
    "Inclinacion_Paneles_grados", "Orientacion_Azimut", "Num_Inversores",
    "Eficiencia_Inversor_%", "Edad_Sistema_anios", "Num_Habitantes"
]

TARGET_GENERATION = "Generacion_Solar_kWh"
TARGET_COST = "Costo_Estimado_MXN"
TARGET_NET = "Consumo_Neto_kWh"
TARGET_CONSUMPTION = "Consumo_Electrico_kWh"

CIUDADES = ["CDMX", "Cancun", "Chihuahua", "Guadalajara", "Hermosillo", "Merida", "Monterrey", "Puebla"]
ESTACIONES = ["Invierno", "Primavera", "Verano", "Otoño"]
TARIFAS = ["1", "1A", "1B", "1C", "DAC"]

CITY_LATITUDES = {
    "CDMX": 19.43, "Cancun": 21.16, "Chihuahua": 28.63,
    "Guadalajara": 20.67, "Hermosillo": 29.07, "Merida": 20.97,
    "Monterrey": 25.67, "Puebla": 19.04
}

COSTO_POR_PANEL_MXN = 11500  # Precio promedio instalado MX 2024 (panel 450W + inversor + mano de obra)


def normalize_city_name(name: str) -> str:
    """Normaliza nombres de ciudad (con/sin acentos) a los del dataset."""
    mapping = {
        "cancun": "Cancun", "cancún": "Cancun",
        "merida": "Merida", "mérida": "Merida",
        "cdmx": "CDMX", "chihuahua": "Chihuahua",
        "guadalajara": "Guadalajara", "hermosillo": "Hermosillo",
        "monterrey": "Monterrey", "puebla": "Puebla",
    }
    key = name.lower().strip()
    return mapping.get(key, name)


def normalize_estacion(name: str) -> str:
    """Normaliza nombres de estación (con/sin acentos)."""
    mapping = {
        "invierno": "Invierno", "primavera": "Primavera",
        "verano": "Verano", "otoño": "Otoño", "otono": "Otoño",
    }
    return mapping.get(name.lower().strip(), name)


def load_dataset(path: Optional[str] = None) -> pd.DataFrame:
    """
    Carga el dataset (Excel o JSON) y valida columnas.
    Si no se indica ruta y no existe el Excel, usa data/solar_dataset.json.
    """
    path = path or os.environ.get("DATASET_PATH")
    if not path:
        path = DEFAULT_DATASET_PATH if os.path.exists(DEFAULT_DATASET_PATH) else JSON_DATASET_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset no encontrado: {path}")

    if path.lower().endswith(".json"):
        df = pd.read_json(path, dtype={"Tarifa_CFE": str}).rename(columns=JSON_COLUMN_MAP)
    else:
        df = pd.read_excel(path, engine="openpyxl")
    df["Tarifa_CFE"] = df["Tarifa_CFE"].astype(str)
    required = [TARGET_GENERATION, TARGET_COST, TARGET_NET, TARGET_CONSUMPTION] + NUMERIC_COLS + CATEGORICAL_COLS
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en el dataset: {missing}")

    return df


def add_cyclical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Convierte Hora, Mes, Dia_Semana a pares sin/cos y elimina originales."""
    df = df.copy()
    for col, period in CYCLICAL_COLS.items():
        if col in df.columns:
            df[f"{col}_sin"] = np.sin(2 * np.pi * df[col] / period)
            df[f"{col}_cos"] = np.cos(2 * np.pi * df[col] / period)
            df.drop(columns=[col], inplace=True)
    return df


def get_cyclical_col_names() -> List[str]:
    """Retorna lista de columnas cíclicas generadas."""
    cols = []
    for col in CYCLICAL_COLS:
        cols.extend([f"{col}_sin", f"{col}_cos"])
    return cols


def get_feature_columns(extra_cols: Optional[List[str]] = None) -> Tuple[List[str], List[str], List[str]]:
    """
    Retorna las listas de columnas para el ColumnTransformer:
    (categorical_cols, numeric_cols_for_scaling)
    """
    cyclical = get_cyclical_col_names()
    numeric_to_scale = NUMERIC_COLS + cyclical + BINARY_COLS
    if extra_cols:
        numeric_to_scale = numeric_to_scale + extra_cols
    return CATEGORICAL_COLS, numeric_to_scale


def build_preprocessor(categorical_cols: List[str], numeric_cols: List[str]) -> ColumnTransformer:
    """Construye ColumnTransformer con OneHotEncoder + StandardScaler."""
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
            ("num", StandardScaler(), numeric_cols),
        ],
        remainder="drop"
    )


def prepare_training_data(
    df: pd.DataFrame,
    target_col: str,
    extra_feature_cols: Optional[List[str]] = None
) -> Tuple[pd.DataFrame, pd.Series, List[str], List[str]]:
    """
    Prepara X e y para entrenamiento.
    Retorna: X (DataFrame con features), y (Series), cat_cols, num_cols
    """
    df_proc = add_cyclical_features(df.copy())

    cat_cols, num_cols = get_feature_columns(extra_cols=extra_feature_cols)

    # Verificar que todas las columnas existen
    all_feature_cols = cat_cols + num_cols
    available = [c for c in all_feature_cols if c in df_proc.columns]
    missing_cat = [c for c in cat_cols if c not in df_proc.columns]
    missing_num = [c for c in num_cols if c not in df_proc.columns]

    if missing_cat:
        cat_cols = [c for c in cat_cols if c in df_proc.columns]
    if missing_num:
        num_cols = [c for c in num_cols if c in df_proc.columns]

    X = df_proc[cat_cols + num_cols]
    y = df_proc[target_col]

    return X, y, cat_cols, num_cols


def predict_single(model, preprocessor, cat_cols: List[str], num_cols: List[str],
                   input_dict: Dict[str, Any]) -> float:
    """Preprocesa un solo input y predice."""
    processed = dict(input_dict)

    # Aplicar encoding cíclico a Hora y Mes
    for col, period in CYCLICAL_COLS.items():
        if col in processed:
            val = float(processed.pop(col))
            processed[f"{col}_sin"] = np.sin(2 * np.pi * val / period)
            processed[f"{col}_cos"] = np.cos(2 * np.pi * val / period)

    # Asegurar que Dia_Semana sea string (nombre del día)
    if "Dia_Semana" in processed and isinstance(processed["Dia_Semana"], (int, float)):
        idx = int(processed["Dia_Semana"])
        processed["Dia_Semana"] = DAY_NAMES[idx % 7]

    # Crear DataFrame de una fila
    all_cols = cat_cols + num_cols
    row = {}
    for col in all_cols:
        if col in processed:
            row[col] = [processed[col]]
        elif col in cat_cols:
            row[col] = ["unknown"]
        else:
            row[col] = [0]

    df_input = pd.DataFrame(row)
    X_transformed = preprocessor.transform(df_input)
    prediction = model.predict(X_transformed)[0]
    return float(prediction)


def compute_aggregations(df: pd.DataFrame) -> Dict[str, Any]:
    """Calcula todas las agregaciones para el endpoint /api/data/aggregations."""

    # 1. Por ciudad
    por_ciudad = []
    city_group = df.groupby("Ciudad")
    for ciudad, grp in city_group:
        por_ciudad.append({
            "ciudad": ciudad,
            "generacion_promedio": round(float(grp[TARGET_GENERATION].mean()), 3),
            "irradiancia_promedio": round(float(grp["Irradiancia_Wm2"].mean()), 1),
            "temperatura_promedio": round(float(grp["Temperatura_C"].mean()), 1),
            "nubosidad_promedio": round(float(grp["Nubosidad_%"].mean()), 1),
            "costo_promedio": round(float(grp[TARGET_COST].mean()), 2),
            "consumo_neto_promedio": round(float(grp[TARGET_NET].mean()), 3),
            "registros": int(len(grp)),
        })

    # 2. Por hora y estación (perfil horario)
    por_hora_estacion = []
    hourly = df.groupby(["Hora", "Estacion"])[TARGET_GENERATION].mean().unstack(fill_value=0)
    for hora in range(24):
        row = {"hora": int(hora)}
        for est in ESTACIONES:
            if est in hourly.columns and hora in hourly.index:
                row[est] = round(float(hourly.loc[hora, est]), 3)
            else:
                row[est] = 0.0
        por_hora_estacion.append(row)

    # 3. Correlación de Pearson
    corr_vars = [
        "Temperatura_C", "Humedad_Relativa_%", "Irradiancia_Wm2",
        "Nubosidad_%", "Velocidad_Viento_kmh", "Num_Paneles",
        "Capacidad_Sistema_kW", "Edad_Sistema_anios",
        TARGET_GENERATION, TARGET_CONSUMPTION, TARGET_NET, TARGET_COST
    ]
    corr_df = df[corr_vars].corr()
    correlacion = {
        "variables": corr_vars,
        "matrix": [[round(float(corr_df.iloc[i, j]), 3) for j in range(len(corr_vars))]
                    for i in range(len(corr_vars))]
    }

    # 4. Boxplot consumo neto por tarifa
    boxplot_tarifa = []
    for tarifa in TARIFAS:
        subset = df[df["Tarifa_CFE"] == tarifa][TARGET_NET]
        if len(subset) > 0:
            boxplot_tarifa.append({
                "tarifa": tarifa,
                "min": round(float(subset.min()), 3),
                "q1": round(float(subset.quantile(0.25)), 3),
                "median": round(float(subset.median()), 3),
                "q3": round(float(subset.quantile(0.75)), 3),
                "max": round(float(subset.max()), 3),
            })

    # 5. Datos para scatter (muestrear para performance)
    scatter_sample = df.sample(n=min(500, len(df)), random_state=42)
    scatter_data = []
    for _, row in scatter_sample.iterrows():
        scatter_data.append({
            "irradiancia": round(float(row["Irradiancia_Wm2"]), 1),
            "generacion": round(float(row[TARGET_GENERATION]), 3),
            "nubosidad": round(float(row["Nubosidad_%"]), 1),
            "ciudad": str(row["Ciudad"]),
            "hora": int(row["Hora"]),
            "estacion": str(row["Estacion"]),
        })

    # 6. Resumen general
    resumen = {
        "total_registros": int(len(df)),
        "ciudades": int(df["Ciudad"].nunique()),
        "rango_generacion": [round(float(df[TARGET_GENERATION].min()), 3),
                             round(float(df[TARGET_GENERATION].max()), 3)],
        "generacion_promedio": round(float(df[TARGET_GENERATION].mean()), 3),
    }

    return {
        "por_ciudad": por_ciudad,
        "por_hora_estacion": por_hora_estacion,
        "correlacion": correlacion,
        "boxplot_tarifa": boxplot_tarifa,
        "scatter_data": scatter_data,
        "resumen": resumen,
    }


def compute_city_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Estadísticas por ciudad para recomendaciones.
    Usadas por /api/recommend/panels y /api/recommend/best-hours.
    """
    stats = {}
    for ciudad in df["Ciudad"].unique():
        city_df = df[df["Ciudad"] == ciudad]
        stats[ciudad] = {
            "generacion_diaria_promedio": round(float(city_df[TARGET_GENERATION].mean()), 3),
            "num_paneles_promedio": round(float(city_df["Num_Paneles"].mean()), 1),
            "potencia_panel_promedio": round(float(city_df["Potencia_Panel_W"].mean()), 0),
            "irradiancia_promedio": round(float(city_df["Irradiancia_Wm2"].mean()), 1),
            "costo_promedio": round(float(city_df[TARGET_COST].mean()), 2),
            "consumo_promedio": round(float(city_df[TARGET_CONSUMPTION].mean()), 3),
        }

        # Perfil horario por estación
        hourly_profiles = {}
        for estacion in df["Estacion"].unique():
            subset = city_df[city_df["Estacion"] == estacion]
            hourly = subset.groupby("Hora")[TARGET_GENERATION].mean()
            hourly_profiles[estacion] = {int(h): round(float(v), 3) for h, v in hourly.items()}
        stats[ciudad]["perfiles_horarios"] = hourly_profiles

    return stats


def compute_tariff_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Estadísticas por tarifa para recomendaciones."""
    stats = {}
    for tarifa in df["Tarifa_CFE"].unique():
        tarifa_df = df[df["Tarifa_CFE"] == tarifa]
        stats[str(tarifa)] = {
            "costo_promedio": round(float(tarifa_df[TARGET_COST].mean()), 2),
            "consumo_neto_promedio": round(float(tarifa_df[TARGET_NET].mean()), 3),
            "registros": int(len(tarifa_df)),
        }
    return stats


def load_model_artifacts() -> Dict[str, Any]:
    """Carga todos los modelos y artefactos guardados."""
    artifacts = {}

    # Modelos principales
    model_files = {
        "linear_regression": "linear_regression.joblib",
        "random_forest": "random_forest.joblib",
        "gradient_boosting": "gradient_boosting.joblib",
        "neural_network": "neural_network.joblib",
    }
    all_models = {}
    for name, filename in model_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            all_models[name] = joblib.load(path)
    artifacts["all_models"] = all_models

    # Mejor modelo
    best_path = os.path.join(MODELS_DIR, "best_model.joblib")
    if os.path.exists(best_path):
        artifacts["best_model"] = joblib.load(best_path)

    # Modelos secundarios
    for name in ["cost_model", "net_consumption_model", "risk_model"]:
        path = os.path.join(MODELS_DIR, f"{name}.joblib")
        if os.path.exists(path):
            artifacts[name] = joblib.load(path)

    # Preprocessor
    prep_path = os.path.join(MODELS_DIR, "preprocessor.joblib")
    if os.path.exists(prep_path):
        artifacts["preprocessor"] = joblib.load(prep_path)

    # Preprocessors secundarios
    for name in ["cost_preprocessor", "net_preprocessor", "risk_preprocessor"]:
        path = os.path.join(MODELS_DIR, f"{name}.joblib")
        if os.path.exists(path):
            artifacts[name] = joblib.load(path)

    # Feature names
    fn_path = os.path.join(MODELS_DIR, "feature_names.json")
    if os.path.exists(fn_path):
        with open(fn_path, "r") as f:
            artifacts["feature_names"] = json.load(f)

    # Métricas
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            artifacts["metrics"] = json.load(f)

    # Estadísticas del dataset
    if os.path.exists(DATASET_STATS_PATH):
        with open(DATASET_STATS_PATH, "r") as f:
            artifacts["dataset_stats"] = json.load(f)

    # Extraer info del mejor modelo
    if "metrics" in artifacts:
        best_name = artifacts["metrics"].get("best_model", "unknown")
        best_r2 = artifacts["metrics"].get("models", {}).get(best_name, {}).get("r2", 0)
        artifacts["best_model_name"] = best_name
        artifacts["best_r2"] = best_r2

    return artifacts

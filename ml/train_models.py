"""
HeliosDash ML - Pipeline de Entrenamiento
Entrena 4 modelos para predicción de generación solar + modelos secundarios.
Uso: python3 train_models.py [--dataset RUTA]
"""

import os
import sys
import json
import argparse
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import (
    RandomForestRegressor, RandomForestClassifier,
    GradientBoostingRegressor, GradientBoostingClassifier
)
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    accuracy_score, f1_score, classification_report
)

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except Exception:
    HAS_XGBOOST = False
    print("XGBoost no disponible, usando sklearn GradientBoosting")

from utils import (
    load_dataset, add_cyclical_features, build_preprocessor,
    prepare_training_data, compute_aggregations, compute_city_stats,
    compute_tariff_stats,
    BASE_DIR, MODELS_DIR, METRICS_PATH, DATASET_STATS_PATH,
    DEFAULT_DATASET_PATH, TARGET_GENERATION, TARGET_COST, TARGET_NET,
    TARGET_CONSUMPTION
)

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


def parse_args():
    parser = argparse.ArgumentParser(description="Entrenar modelos HeliosDash ML")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Ruta al dataset (.xlsx o .json). Por defecto usa "
                             "Dataset_Paneles_Solares_MX.xlsx si existe, o data/solar_dataset.json")
    return parser.parse_args()


def evaluate_model(model, X_test, y_test) -> dict:
    """Evalúa un modelo y retorna métricas."""
    y_pred = model.predict(X_test)
    return {
        "r2": round(float(r2_score(y_test, y_pred)), 4),
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
    }


def train_primary_models(X_train, X_test, y_train, y_test):
    """Entrena los 4 modelos principales para Generacion_Solar_kWh."""
    models = {}
    metrics = {}

    # 1. Linear Regression
    print("      Entrenando Linear Regression...")
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    models["linear_regression"] = lr
    metrics["linear_regression"] = evaluate_model(lr, X_test, y_test)
    print(f"      Linear Regression  -> R²: {metrics['linear_regression']['r2']}  "
          f"MAE: {metrics['linear_regression']['mae']}  RMSE: {metrics['linear_regression']['rmse']}")

    # 2. Random Forest
    print("      Entrenando Random Forest...")
    rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    models["random_forest"] = rf
    metrics["random_forest"] = evaluate_model(rf, X_test, y_test)
    print(f"      Random Forest       -> R²: {metrics['random_forest']['r2']}  "
          f"MAE: {metrics['random_forest']['mae']}  RMSE: {metrics['random_forest']['rmse']}")

    # 3. Gradient Boosting (XGBoost si disponible)
    print("      Entrenando Gradient Boosting...")
    if HAS_XGBOOST:
        gb = XGBRegressor(
            n_estimators=200, learning_rate=0.1, max_depth=6,
            random_state=42, n_jobs=-1, verbosity=0
        )
    else:
        gb = GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.1, max_depth=6, random_state=42
        )
    gb.fit(X_train, y_train)
    models["gradient_boosting"] = gb
    metrics["gradient_boosting"] = evaluate_model(gb, X_test, y_test)
    print(f"      Gradient Boosting   -> R²: {metrics['gradient_boosting']['r2']}  "
          f"MAE: {metrics['gradient_boosting']['mae']}  RMSE: {metrics['gradient_boosting']['rmse']}")

    # 4. Neural Network (MLPRegressor)
    print("      Entrenando Neural Network...")
    nn = MLPRegressor(
        hidden_layer_sizes=(128, 64, 32),
        max_iter=1000,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=42,
        learning_rate="adaptive",
    )
    nn.fit(X_train, y_train)
    models["neural_network"] = nn
    metrics["neural_network"] = evaluate_model(nn, X_test, y_test)
    print(f"      Neural Network      -> R²: {metrics['neural_network']['r2']}  "
          f"MAE: {metrics['neural_network']['mae']}  RMSE: {metrics['neural_network']['rmse']}")

    # Seleccionar mejor modelo
    best_name = max(metrics, key=lambda k: metrics[k]["r2"])
    print(f"      >>> Mejor modelo: {best_name} (R² = {metrics[best_name]['r2']})")

    return models, metrics, best_name


def train_secondary_models(df, preprocessor_gen, cat_cols_gen, num_cols_gen):
    """Entrena modelos secundarios: costo, consumo neto, riesgo."""
    results = {}

    # --- Modelo de Costo ---
    print("      Entrenando modelo de Costo (Costo_Estimado_MXN)...")
    extra_cost = [TARGET_GENERATION, TARGET_CONSUMPTION]
    X_cost, y_cost, cat_cols_cost, num_cols_cost = prepare_training_data(
        df, TARGET_COST, extra_feature_cols=extra_cost
    )
    preprocessor_cost = build_preprocessor(cat_cols_cost, num_cols_cost)
    X_cost_train, X_cost_test, y_cost_train, y_cost_test = train_test_split(
        X_cost, y_cost, test_size=0.2, random_state=42
    )
    X_cost_train_t = preprocessor_cost.fit_transform(X_cost_train)
    X_cost_test_t = preprocessor_cost.transform(X_cost_test)

    cost_model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=6, random_state=42)
    cost_model.fit(X_cost_train_t, y_cost_train)
    cost_metrics = evaluate_model(cost_model, X_cost_test_t, y_cost_test)
    print(f"      Modelo Costo        -> R²: {cost_metrics['r2']}")
    results["cost"] = {
        "model": cost_model, "preprocessor": preprocessor_cost,
        "cat_cols": cat_cols_cost, "num_cols": num_cols_cost,
        "metrics": cost_metrics,
    }

    # --- Modelo de Consumo Neto ---
    print("      Entrenando modelo de Consumo Neto (Consumo_Neto_kWh)...")
    extra_net = [TARGET_GENERATION]
    X_net, y_net, cat_cols_net, num_cols_net = prepare_training_data(
        df, TARGET_NET, extra_feature_cols=extra_net
    )
    preprocessor_net = build_preprocessor(cat_cols_net, num_cols_net)
    X_net_train, X_net_test, y_net_train, y_net_test = train_test_split(
        X_net, y_net, test_size=0.2, random_state=42
    )
    X_net_train_t = preprocessor_net.fit_transform(X_net_train)
    X_net_test_t = preprocessor_net.transform(X_net_test)

    net_model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=6, random_state=42)
    net_model.fit(X_net_train_t, y_net_train)
    net_metrics = evaluate_model(net_model, X_net_test_t, y_net_test)
    print(f"      Modelo Consumo Neto -> R²: {net_metrics['r2']}")
    results["net"] = {
        "model": net_model, "preprocessor": preprocessor_net,
        "cat_cols": cat_cols_net, "num_cols": num_cols_net,
        "metrics": net_metrics,
    }

    # --- Modelo de Riesgo (clasificación binaria) ---
    print("      Entrenando modelo de Riesgo (bajo rendimiento)...")
    p25 = df[TARGET_GENERATION].quantile(0.25)
    df_risk = df.copy()
    df_risk["low_performance"] = (df_risk[TARGET_GENERATION] < p25).astype(int)

    X_risk, y_risk, cat_cols_risk, num_cols_risk = prepare_training_data(
        df_risk, "low_performance"
    )
    preprocessor_risk = build_preprocessor(cat_cols_risk, num_cols_risk)
    X_risk_train, X_risk_test, y_risk_train, y_risk_test = train_test_split(
        X_risk, y_risk, test_size=0.2, random_state=42
    )
    X_risk_train_t = preprocessor_risk.fit_transform(X_risk_train)
    X_risk_test_t = preprocessor_risk.transform(X_risk_test)

    risk_model = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, max_depth=6, random_state=42)
    risk_model.fit(X_risk_train_t, y_risk_train)

    y_risk_pred = risk_model.predict(X_risk_test_t)
    risk_accuracy = round(float(accuracy_score(y_risk_test, y_risk_pred)), 4)
    risk_f1 = round(float(f1_score(y_risk_test, y_risk_pred)), 4)
    print(f"      Modelo Riesgo       -> Accuracy: {risk_accuracy}, F1: {risk_f1}")
    results["risk"] = {
        "model": risk_model, "preprocessor": preprocessor_risk,
        "cat_cols": cat_cols_risk, "num_cols": num_cols_risk,
        "metrics": {"accuracy": risk_accuracy, "f1": risk_f1},
        "p25_threshold": round(float(p25), 4),
    }

    return results


def save_all(models, metrics_dict, best_name, secondary, preprocessor,
             cat_cols, num_cols, df):
    """Guarda todos los modelos y artefactos."""
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Modelos principales
    for name, model in models.items():
        joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.joblib"))
    joblib.dump(models[best_name], os.path.join(MODELS_DIR, "best_model.joblib"))

    # Preprocessor principal
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "preprocessor.joblib"))

    # Extraer scaler y encoder del ColumnTransformer para compatibilidad
    for name, transformer in preprocessor.named_transformers_.items():
        if name == "cat":
            joblib.dump(transformer, os.path.join(MODELS_DIR, "encoder.joblib"))
        elif name == "num":
            joblib.dump(transformer, os.path.join(MODELS_DIR, "scaler.joblib"))

    # Modelos secundarios
    joblib.dump(secondary["cost"]["model"], os.path.join(MODELS_DIR, "cost_model.joblib"))
    joblib.dump(secondary["cost"]["preprocessor"], os.path.join(MODELS_DIR, "cost_preprocessor.joblib"))
    joblib.dump(secondary["net"]["model"], os.path.join(MODELS_DIR, "net_consumption_model.joblib"))
    joblib.dump(secondary["net"]["preprocessor"], os.path.join(MODELS_DIR, "net_preprocessor.joblib"))
    joblib.dump(secondary["risk"]["model"], os.path.join(MODELS_DIR, "risk_model.joblib"))
    joblib.dump(secondary["risk"]["preprocessor"], os.path.join(MODELS_DIR, "risk_preprocessor.joblib"))

    # Feature names
    feature_info = {
        "generation": {"cat_cols": cat_cols, "num_cols": num_cols},
        "cost": {"cat_cols": secondary["cost"]["cat_cols"], "num_cols": secondary["cost"]["num_cols"]},
        "net": {"cat_cols": secondary["net"]["cat_cols"], "num_cols": secondary["net"]["num_cols"]},
        "risk": {"cat_cols": secondary["risk"]["cat_cols"], "num_cols": secondary["risk"]["num_cols"]},
    }
    with open(os.path.join(MODELS_DIR, "feature_names.json"), "w") as f:
        json.dump(feature_info, f, indent=2, ensure_ascii=False)

    # Métricas
    all_metrics = {
        "best_model": best_name,
        "models": metrics_dict,
        "secondary": {
            "cost": secondary["cost"]["metrics"],
            "net_consumption": secondary["net"]["metrics"],
            "risk": secondary["risk"]["metrics"],
        },
        "risk_threshold_p25": secondary["risk"]["p25_threshold"],
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(all_metrics, f, indent=2, ensure_ascii=False)

    # Agregaciones del dataset
    print("[6/6] Calculando y guardando agregaciones del dataset...")
    aggregations = compute_aggregations(df)
    city_stats = compute_city_stats(df)
    tariff_stats = compute_tariff_stats(df)

    dataset_stats = {
        **aggregations,
        "city_stats": city_stats,
        "tariff_stats": tariff_stats,
    }
    with open(DATASET_STATS_PATH, "w") as f:
        json.dump(dataset_stats, f, indent=2, ensure_ascii=False)


def main():
    args = parse_args()

    print("=" * 50)
    print("  HeliosDash ML - Pipeline de Entrenamiento")
    print("=" * 50)

    # Paso 1: Cargar dataset
    print(f"\n[1/6] Cargando dataset desde {args.dataset or 'ruta por defecto'}")
    df = load_dataset(args.dataset)
    print(f"      Shape: {df.shape} | Valores nulos: {df.isnull().sum().sum()}")
    print(f"      Ciudades: {sorted(df['Ciudad'].unique())}")
    print(f"      Rango generación: [{df[TARGET_GENERATION].min():.2f}, {df[TARGET_GENERATION].max():.2f}]")

    # Paso 2: Preparar features
    print("\n[2/6] Preparando features...")
    X, y, cat_cols, num_cols = prepare_training_data(df, TARGET_GENERATION)
    print(f"      Features categóricas: {len(cat_cols)} -> {cat_cols}")
    print(f"      Features numéricas: {len(num_cols)}")
    print(f"      Total features (antes de encoding): {len(cat_cols) + len(num_cols)}")

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"      Train: {len(X_train)} | Test: {len(X_test)}")

    # Fit preprocessor
    preprocessor = build_preprocessor(cat_cols, num_cols)
    X_train_t = preprocessor.fit_transform(X_train)
    X_test_t = preprocessor.transform(X_test)
    print(f"      Features después de encoding: {X_train_t.shape[1]}")

    # Paso 3: Entrenar modelos principales
    print("\n[3/6] Entrenando 4 modelos para Generacion_Solar_kWh...")
    models, metrics_dict, best_name = train_primary_models(X_train_t, X_test_t, y_train, y_test)

    # Paso 4: Entrenar modelos secundarios
    print("\n[4/6] Entrenando modelos secundarios...")
    secondary = train_secondary_models(df, preprocessor, cat_cols, num_cols)

    # Paso 5: Guardar todo
    print("\n[5/6] Guardando modelos y artefactos en ml/models/")
    save_all(models, metrics_dict, best_name, secondary, preprocessor, cat_cols, num_cols, df)

    # Resumen final
    print("\n" + "=" * 50)
    print("  Entrenamiento completado exitosamente")
    print("=" * 50)
    print(f"  Mejor modelo: {best_name} (R² = {metrics_dict[best_name]['r2']})")
    print(f"  Modelos guardados en: {MODELS_DIR}")
    print(f"  Métricas en: {METRICS_PATH}")
    print(f"  Estadísticas en: {DATASET_STATS_PATH}")
    print(f"\n  Para iniciar la API:")
    print(f"  cd {BASE_DIR} && uvicorn api:app --reload --port 8000")
    print("=" * 50)


if __name__ == "__main__":
    main()

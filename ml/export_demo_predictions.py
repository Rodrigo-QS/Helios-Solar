"""
HeliosDash ML - Exporta predicciones precalculadas para el build demo.

El demo es un sitio estático sin backend. Para que se comporte como la
plataforma real, este script consulta los modelos entrenados (llamando a las
mismas funciones de los endpoints de api.py) sobre una cuadrícula de entradas
y guarda los resultados en services/demo/predictions.json. El frontend en modo
demo interpola sobre esa tabla en lugar de llamar a la API.

Se exportan los modelos de generación y de costo. El riesgo y la tarifa óptima
del demo son datos simulados (services/demo/demoApi.ts): el clasificador de
riesgo actual etiqueta "bajo rendimiento" casi solo en horas nocturnas, así que
de día siempre responde "bajo" y no ilustra la funcionalidad.

Uso (después de train_models.py):
    python export_demo_predictions.py
"""

import json
import math
import os
from datetime import date

import api
from utils import load_model_artifacts, load_dataset, CIUDADES, ESTACIONES, TARIFAS

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "services", "demo", "predictions.json")

HORAS = list(range(24))
NUBOSIDAD = list(range(0, 101, 10))
GENERACION_COSTO = [round(g * 0.5, 1) for g in range(17)]  # 0.0 … 8.0 kWh
PANELES_REF = 10
CAPACIDAD_REF = round(PANELES_REF * 0.45, 2)  # WhatIf usa 0.45 kW por panel
MES_POR_ESTACION = {"Invierno": 1, "Primavera": 4, "Verano": 7, "Otoño": 10}


def estimate_irradiance(hora: int, nubosidad: float) -> int:
    """Réplica exacta de estimateIrradiance() en views/WhatIf.tsx."""
    if hora < 6 or hora > 19:
        return 0
    solar = math.exp(-0.5 * ((hora - 12) / 4) ** 2) * 1000
    cloud = 1 - (nubosidad / 100) * 0.8
    return int(math.floor(solar * cloud + 0.5))  # Math.round de JS


def main():
    api.artifacts = load_model_artifacts()
    api.check_models()
    df = load_dataset()

    temp_base = {
        c: {e: round(float(df[(df.Ciudad == c) & (df.Estacion == e)].Temperatura_C.mean()), 1)
            for e in ESTACIONES}
        for c in CIUDADES
    }

    gen = {}
    for c in CIUDADES:
        gen[c] = {}
        for e in ESTACIONES:
            g_rows = []
            for h in HORAS:
                g_row = []
                for n in NUBOSIDAD:
                    common = dict(
                        ciudad=c, estacion=e, hora=h, mes=MES_POR_ESTACION[e],
                        temperatura=temp_base[c][e], irradiancia=estimate_irradiance(h, n),
                        nubosidad=n, num_paneles=PANELES_REF, capacidad_kw=CAPACIDAD_REF,
                    )
                    g = api.predict_generation(api.GenerationRequest(**common, tarifa_cfe="1"))
                    g_row.append(g["generacion_predicha_kwh"])
                g_rows.append(g_row)
            gen[c][e] = g_rows
        print(f"  {c}: listo")

    cost = {
        c: {t: [[res["costo_estimado_mxn"], res["ahorro_vs_sin_solar"]]
                for res in (api.predict_cost(api.CostRequest(
                    ciudad=c, tarifa_cfe=t, consumo_kwh=10, generacion_kwh=g))
                    for g in GENERACION_COSTO)]
            for t in TARIFAS}
        for c in CIUDADES
    }

    metrics = api.artifacts["metrics"]
    out = {
        "meta": {
            "modelo": metrics["best_model"],
            "r2": metrics["models"][metrics["best_model"]]["r2"],
            "generado": date.today().isoformat(),
            "paneles_ref": PANELES_REF,
            "capacidad_ref_kw": CAPACIDAD_REF,
            "horas": HORAS,
            "nubosidad": NUBOSIDAD,
            "generacion_costo": GENERACION_COSTO,
            "consumo_costo_kwh": 10,
        },
        "temp_base": temp_base,
        "gen": gen,
        "cost": cost,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Guardado en {os.path.normpath(OUT_PATH)} ({os.path.getsize(OUT_PATH) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

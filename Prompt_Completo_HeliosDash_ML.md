# PROMPT COMPLETO — Proyecto HeliosDash con ML y Visualización de Datos
## Para ejecutar en VS Code con Claude (o Antigravity)

---

# FASE 1 DE 3: BACKEND ML — Modelos de Predicción con Python

## Contexto

Tengo un proyecto de **Visualización de Datos Masivos** sobre paneles solares en México. Tengo un dataset (`Dataset_Paneles_Solares_MX.xlsx`) con **1,500 registros y 28 columnas** de 8 ciudades mexicanas.

Necesito crear un backend en Python que entrene modelos de Machine Learning y exponga predicciones vía una API REST (Flask o FastAPI) que mi frontend React consumirá.

## Dataset — Estructura completa

```
Columnas (28):
Fecha, Hora (0-23), Mes (1-12), Estacion (Invierno/Primavera/Verano/Otoño),
Dia_Semana, Es_FinDeSemana (0/1), Ciudad (8 ciudades), Latitud,
Temperatura_C (2.9-45.7), Humedad_Relativa_% (0-100), Irradiancia_Wm2 (0-1200),
Nubosidad_% (0-100), Velocidad_Viento_kmh, Precipitacion_mm,
Num_Paneles (4-24), Potencia_Panel_W, Capacidad_Sistema_kW (1.32-13.2),
Inclinacion_Paneles_grados, Orientacion_Azimut, Num_Inversores,
Eficiencia_Inversor_%, Edad_Sistema_anios, Num_Habitantes,
Tarifa_CFE (1/1A/1B/1C/DAC),
Generacion_Solar_kWh (0-12.59), Consumo_Electrico_kWh (0.1-5.34),
Consumo_Neto_kWh (-11.22 a 5.16), Costo_Estimado_MXN (0-22.32)

Ciudades: CDMX, Cancún, Chihuahua, Guadalajara, Hermosillo, Mérida, Monterrey, Puebla
Estaciones: Invierno, Primavera, Verano, Otoño
Tarifas CFE: 1, 1A, 1B, 1C, DAC
1,500 registros totales
```

## Lo que necesito que crees

### 1. `ml/train_models.py` — Script de entrenamiento

Este script debe:

a) **Cargar y preprocesar** el dataset Excel:
   - One-hot encoding para: Ciudad, Estacion, Tarifa_CFE
   - Normalización/estandarización de features numéricas
   - Split 80/20 train/test

b) **Entrenar 4 modelos** para predecir `Generacion_Solar_kWh`:
   - **Linear Regression** (sklearn)
   - **Random Forest Regressor** (sklearn, n_estimators=100)
   - **Gradient Boosting Regressor** (sklearn o XGBoost)
   - **Neural Network** (sklearn MLPRegressor o TensorFlow/Keras sencillo)

c) **Evaluar cada modelo** con: R², MAE, RMSE, y guardar las métricas en un JSON (`ml/metrics.json`)

d) **Seleccionar el mejor modelo** (mayor R²) y guardarlo con joblib (`ml/best_model.joblib`)

e) **Entrenar modelos secundarios** para:
   - Predicción de `Costo_Estimado_MXN` (regresión)
   - Predicción de `Consumo_Neto_kWh` (regresión)
   - Clasificación de riesgo de bajo rendimiento (clasificación binaria: 1 si Generacion_Solar_kWh < percentil 25, 0 si no)

f) **Guardar** también: el scaler, el encoder, y los nombres de features para poder hacer predicciones nuevas.

### 2. `ml/api.py` — API REST con Flask/FastAPI

Endpoints que necesito:

```
GET  /api/health
     → { "status": "ok", "best_model": "random_forest", "r2_score": 0.94 }

POST /api/predict/generation
     Body: { ciudad, hora, estacion, temperatura, irradiancia, nubosidad, num_paneles, capacidad_kw, ... }
     → { "generacion_predicha_kwh": 4.2, "modelo_usado": "random_forest", "confianza": 0.94 }

POST /api/predict/cost
     Body: { ciudad, tarifa_cfe, consumo_kwh, generacion_kwh }
     → { "costo_estimado_mxn": 3.5, "ahorro_vs_sin_solar": 8.2 }

POST /api/predict/net-consumption
     Body: { ciudad, hora, estacion, num_paneles, consumo_electrico, ... }
     → { "consumo_neto_kwh": -2.3, "es_excedente": true }

POST /api/recommend/panels
     Body: { ciudad, num_habitantes, tarifa_cfe, consumo_mensual_kwh }
     → { "paneles_recomendados": 12, "capacidad_kw": 5.4, "ahorro_mensual_estimado": 450, "roi_anios": 5.2 }

POST /api/recommend/best-hours
     Body: { ciudad, estacion }
     → { "horas_pico_generacion": [10,11,12,13,14], "mejor_hora_consumo": 12, "peor_hora_consumo": 20 }

POST /api/recommend/optimal-tariff
     Body: { ciudad, consumo_mensual_kwh, num_paneles }
     → { "tarifa_actual_sugerida": "1C", "ahorro_vs_DAC": 120, "razon": "..." }

POST /api/risk/low-performance
     Body: { ciudad, estacion, nubosidad, irradiancia }
     → { "riesgo": "alto", "probabilidad": 0.78, "recomendacion": "Considere usar batería de respaldo" }

GET  /api/data/aggregations
     → { "por_ciudad": [...], "por_hora_estacion": [...], "correlacion": [[...]], "boxplot_tarifa": [...] }

GET  /api/models/comparison
     → { "linear_regression": { "r2": 0.82, "mae": 0.45 }, "random_forest": { "r2": 0.94, ... }, ... }
```

**Configuración CORS** habilitada para que el frontend React pueda consumirla.

### 3. `ml/requirements.txt`

```
pandas
openpyxl
scikit-learn
flask (o fastapi + uvicorn)
flask-cors
joblib
numpy
```

### 4. Estructura de archivos

```
ml/
├── train_models.py          # Entrenamiento de los 4 modelos
├── api.py                   # API REST
├── requirements.txt
├── models/
│   ├── best_model.joblib
│   ├── linear_regression.joblib
│   ├── random_forest.joblib
│   ├── gradient_boosting.joblib
│   ├── neural_network.joblib
│   ├── scaler.joblib
│   ├── encoder.joblib
│   └── feature_names.json
├── metrics.json             # Métricas de todos los modelos
└── utils.py                 # Funciones helper (preprocesamiento, cálculos)
```

---

# FASE 2 DE 3: FRONTEND — Vista de Análisis con las 5 Gráficas

## Contexto de la app existente

La app es React 19 + TypeScript + Vite + Tailwind (CDN) + recharts. El tema es **dark con verde neón (#13ec5b)**, fondos oscuros (#102216), cards con glassmorphism.

Ya existe: Dashboard, Simulador ROI, Sidebar, GlassCard component. La vista de "Análisis" es un placeholder que debe reemplazarse.

## Lo que necesito

### 1. Crear `views/Analysis.tsx`

Vista completa con:

**Header:** Título "Análisis Avanzado" + 3 dropdowns de filtros globales:
- Ciudad (Todas / CDMX / Cancún / Chihuahua / Guadalajara / Hermosillo / Mérida / Monterrey / Puebla)
- Estación (Todas / Invierno / Primavera / Verano / Otoño)
- Tarifa CFE (Todas / 1 / 1A / 1B / 1C / DAC)
- Botón "Reset Filtros"

**Layout de gráficas (grid 2 columnas en desktop, 1 en móvil):**

```
┌────────────────────────┬─────────────────────────┐
│ Gráfica 1              │ Gráfica 2               │
│ Barras: Generación     │ Scatter: Irradiancia    │
│ Solar por Ciudad       │ vs Generación           │
├────────────────────────┴─────────────────────────┤
│ Gráfica 3: Líneas — Perfil Horario por Estación  │
├────────────────────────┬─────────────────────────┤
│ Gráfica 4              │ Gráfica 5               │
│ Heatmap: Correlación   │ Boxplot: Consumo Neto   │
│ entre Variables        │ por Tarifa CFE          │
└────────────────────────┴─────────────────────────┘
```

**Gráfica 1 — Generación Solar Promedio por Ciudad (BarChart recharts):**
- Agrupar datos por Ciudad → promedio de Generacion_Solar_kWh
- Barras verticales color verde (#13ec5b) con gradiente
- Tooltip con valor exacto
- Se filtra por estación seleccionada

**Gráfica 2 — Irradiancia vs Generación Solar (ScatterChart recharts):**
- X = Irradiancia_Wm2, Y = Generacion_Solar_kWh
- Color de cada punto según Nubosidad_% (baja=verde, alta=rojo)
- Tooltip con ciudad, hora, irradiancia, generación, nubosidad
- Muestra todos los puntos filtrados

**Gráfica 3 — Perfil Horario por Estación (LineChart recharts):**
- 4 líneas, una por estación
- X = Hora (0-23), Y = promedio Generacion_Solar_kWh
- Colores: Primavera=#13ec5b, Verano=#eab308, Otoño=#f97316, Invierno=#3b82f6
- Se filtra por ciudad

**Gráfica 4 — Heatmap de Correlación (Custom con divs/SVG):**
- Matriz de correlación de Pearson entre 12 variables numéricas
- Escala: -1 (rojo #ef4444) → 0 (gris #374151) → +1 (verde #13ec5b)
- Mostrar valor numérico en cada celda
- Variables: Temperatura_C, Humedad_Relativa_%, Irradiancia_Wm2, Nubosidad_%, Velocidad_Viento_kmh, Num_Paneles, Capacidad_Sistema_kW, Edad_Sistema_anios, Generacion_Solar_kWh, Consumo_Electrico_kWh, Consumo_Neto_kWh, Costo_Estimado_MXN
- Calcular la correlación en JavaScript (no necesita backend)

**Gráfica 5 — Boxplot Consumo Neto por Tarifa (Custom SVG):**
- Para cada tarifa (1, 1A, 1B, 1C, DAC): calcular min, Q1, mediana, Q3, max de Consumo_Neto_kWh
- Línea horizontal punteada roja en y=0 (punto de equilibrio)
- Colores distintos por tarifa
- Tooltip con los 5 estadísticos

### 2. Crear `data/solarData.ts`

Leer el archivo `Dataset_Paneles_Solares_MX.xlsx` y exportar como array de objetos TypeScript. Si no se puede leer el Excel, generar datos sintéticos realistas para las 8 ciudades con los rangos correctos (ver rangos en Fase 1).

### 3. Modificar `App.tsx`

Cambiar:
```tsx
case 'analysis':
  return <PlaceholderView title="Análisis Avanzado" />;
```
Por:
```tsx
case 'analysis':
  return <Analysis onNavigate={setCurrentView} showNotification={showNotification} />;
```

### Estilo visual (IMPORTANTE — mantener consistencia):

```
Fondo general: bg-background (#102216)
Cards: usar componente GlassCard existente (bg-[rgba(21,46,29,0.6)] backdrop-blur-xl border-primary/10)
Títulos: text-white font-bold
Subtítulos: text-gray-400 text-sm
Color primario: #13ec5b
Dropdowns: bg-black/20 border border-gray-700 rounded-lg text-white text-sm px-3 py-2
Scrollable: clase custom-scrollbar
```

---

# FASE 3 DE 3: FEATURES INTELIGENTES — Vistas Nuevas con Predicciones ML

## Necesito crear estas vistas/componentes nuevos que consuman la API de ML:

### Feature 1: Calculadora "¿Me Conviene?" (`views/Calculator.tsx`)

**Input del usuario (formulario):**
- Ciudad (dropdown 8 ciudades)
- Tarifa CFE actual (dropdown)
- Consumo mensual promedio en kWh (slider o input numérico)

**Output (tarjetas de resultado):**
- Veredicto grande: "SÍ TE CONVIENE" (verde) o "ANALIZA CON CUIDADO" (amarillo)
- Ahorro mensual estimado ($MXN)
- Paneles recomendados
- ROI en años
- Gráfica mini: comparativa antes vs después

**Consume:** `/api/recommend/panels` y `/api/predict/cost`

### Feature 2: Comparador de Ciudades (`views/Comparator.tsx`)

**Input:** 2 dropdowns para seleccionar 2 ciudades

**Output (side by side):**
- Generación solar promedio de cada ciudad
- Perfil horario superpuesto (2 líneas en un LineChart)
- Tabla comparativa: irradiancia promedio, temperatura, nubosidad, costo estimado
- Indicador: "Hermosillo genera 35% más que CDMX"

**Consume:** `/api/data/aggregations` + datos locales

### Feature 3: Alertas Inteligentes (mejorar vista existente `views/Alerts.tsx`)

Reemplazar el placeholder de "Centro de Alertas" con alertas generadas por el modelo:

- "En Monterrey durante verano, la generación solar sube 40%. Buen momento para cargar tu VE."
- "Chihuahua en invierno: riesgo alto de bajo rendimiento por nubosidad. Activa batería de respaldo."
- "Tu tarifa DAC en CDMX podría ahorrarte $X/mes cambiando a 1C con paneles solares."

Las alertas se calculan con los datos del dataset + predicciones del modelo. Mostrar con iconos y colores por severidad (info=azul, warning=amarillo, success=verde).

**Consume:** `/api/risk/low-performance` + `/api/recommend/optimal-tariff`

### Feature 4: Recomendador de Sistema (`views/Recommender.tsx`)

**Flujo tipo wizard (3 pasos):**

Paso 1: "¿Dónde vives?" → Mapa o selector de ciudad
Paso 2: "¿Cuántos son en casa?" → Selector de 1-6+ personas + tarifa CFE
Paso 3: Resultados animados:
  - Número de paneles recomendados (con ícono visual)
  - Capacidad del sistema (kW)
  - Ahorro mensual estimado ($MXN)
  - Retorno de inversión (años)
  - Generación diaria esperada (kWh)
  - Gráfica: proyección de ahorro a 10 años

**Consume:** `/api/recommend/panels` + `/api/predict/generation`

### Feature 5: Modo "¿Qué Pasaría Si...?" (agregar a `views/Simulator.tsx` o nueva vista)

**Sliders interactivos:**
- Nubosidad (0-100%)
- Número de paneles (4-24)
- Tarifa CFE (dropdown)
- Hora del día (0-23)
- Estación del año

**Output en tiempo real:**
- Generación solar predicha (se actualiza al mover sliders)
- Costo estimado
- Consumo neto
- Indicador de riesgo
- Gráfica que se actualiza dinámicamente

**Consume:** `/api/predict/generation` + `/api/predict/cost` + `/api/risk/low-performance`

### Feature 6: Resumen Ejecutivo Exportable

**Botón en el dashboard o en Analysis:** "Generar Reporte PDF"

El reporte incluye:
- Título: "Reporte de Análisis Solar — [Ciudad] — [Fecha]"
- Resumen de datos: registros analizados, periodo, ciudad
- Las 5 gráficas como imágenes estáticas
- Tabla de métricas de los 4 modelos ML (R², MAE, RMSE)
- Predicciones personalizadas del usuario
- Recomendaciones basadas en el modelo

**Implementar con:** html2canvas + jsPDF, o generar desde el backend con reportlab.

---

## Navegación actualizada del Sidebar

Agregar las nuevas vistas al sidebar y al type ViewState:

```typescript
export type ViewState = 'dashboard' | 'simulator' | 'analysis' | 'calculator' | 'comparator' | 'recommender' | 'whatif' | 'history' | 'devices' | 'alerts' | 'settings';
```

```
MENÚ PRINCIPAL
├── Resumen (dashboard)
├── Análisis (analysis) — las 5 gráficas
├── Historial (history)
├── Simulador ROI (simulator)
│
HERRAMIENTAS IA ← NUEVA SECCIÓN
├── ¿Me Conviene? (calculator)
├── Comparador (comparator)
├── Recomendador (recommender)
├── ¿Qué Pasaría Si? (whatif)
│
SISTEMA
├── Dispositivos (devices)
├── Alertas (alerts)
├── Ajustes (settings)
```

---

## Notas técnicas finales

1. **Frontend:** React 19 + TypeScript + Vite + Tailwind (CDN) + recharts. No agregar librerías de gráficas extra excepto para el PDF export (jsPDF).
2. **Backend:** Python + Flask/FastAPI + scikit-learn. Los 4 modelos ML deben entrenarse de verdad con el dataset.
3. **Comunicación:** El frontend consume la API del backend vía fetch(). Si la API no está corriendo, las vistas deben funcionar con datos precalculados como fallback.
4. **Idioma:** Toda la UI en español.
5. **Responsive:** Grid de 1 columna en móvil, 2 en desktop.
6. **Tema:** Dark mode, verde neón (#13ec5b), glassmorphism, consistente con el dashboard existente.

---

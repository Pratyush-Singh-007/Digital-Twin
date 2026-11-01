# AgriTwin: An Uncertainty-Aware Digital Twin for Agricultural Decision Support

[![React 18](https://img.shields.io/badge/React-18.3-black?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-black?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-black?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2.15-black?style=flat-square)](https://recharts.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-black?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Conformal Prediction](https://img.shields.io/badge/Conformal_Prediction-Split--Conformal-black?style=flat-square)](https://en.wikipedia.org/wiki/Conformal_prediction)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

> **A software prototype for soil-moisture decision support. It forecasts moisture with a ridge surrogate, widens a nominal split-conformal interval using a dropout heuristic, scores a late-blight weather proxy, and gates simulated irrigation actions. It has not been validated against field outcomes.**

---

## Prototype Showcase

![AgriTwin Dashboard Preview](docs/images/dashboard.png)

---

## 1. Executive Summary & Core Motivation

Standard machine learning models deployed in precision agriculture emit uncalibrated scalar predictions. When low-cost IoT soil moisture probes fail—suffering battery drops, packet loss, capacitive drift, or unprecedented heat anomalies—**deterministic point models fail silently**. They output confident predictions on corrupted data, leading to:

1. **Hazardous Disease Spreading:** Irrigating parched soil during warm, humid conditions that accelerate fungal pathogen spore germination.
2. **False-Dry Over-Watering:** Irrigating saturated fields because a damaged sensor erroneously reads near-zero moisture.
3. **Resource Depletion:** Wasting scarce groundwater reserves and increasing pumping electricity costs.

### The AgriTwin Solution
AgriTwin demonstrates one way to expose uncertainty instead of displaying only a point forecast. The interval uses split-conformal residual calibration, with a heuristic width increase under simulated dropout. It is a research prototype, not a validated farm controller.

When input telemetry degrades (e.g., packet dropout increases from 0% to 30%), **the confidence envelope widens in real-time ($<300\,\text{ms}$)**. Once uncertainty exceeds an agronomic safety bound ($\epsilon$), the digital twin's actuator engine **immediately disengages automation and requests human supervisor review**.

```
                ┌──────────────────────────────────────────────────┐
                │          Hourly Microclimate Telemetry           │
                │     Open-Meteo Live API or Synthetic Season      │
                └─────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                ┌──────────────────────────────────────────────────┐
                │   Surrogate Forecasting + Conformal Calibrator   │
                │        Ridge Regression (16 Lag Features)        │
                └─────────────────────────┬────────────────────────┘
                                          │
                   Outputs: Mean Soil Moisture + [Lower, Upper] Band
                                          │
                                          ▼
        ═════════════════════ DECISION PIPELINE ═════════════════════
        ┌───────────────────────────────────────────────────────────┐
        │  GATE 1 (Rule 3 - Safety Brake - Evaluated First):        │
        │  Is Interval Width (Upper - Lower) >= Safety Bound (ε)?   │
        └──────────────┬─────────────────────────────┬──────────────┘
                       │ YES                         │ NO
                       ▼                             ▼
              ┌──────────────────┐         ┌────────────────────────────────┐
              │  STATE: LOCKED   │         │  GATE 2 (Moisture Threshold):  │
              │  Safety Brake    │         │  Is Soil Moisture < Dry Limit? │
              │  Engaged (Human  │         └────────┬──────────────┬────────┘
              │  Review Needed)  │                  │ NO           │ YES
              └──────────────────┘                  ▼              ▼
                                           ┌────────────────┐ ┌─────────────────────────────┐
                                           │  STATE: HOLD   │ │ GATE 3 (Rule 2 - Conflict): │
                                           │  Adequate      │ │ Is Late Blight Index > 0.70?│
                                           │  Moisture      │ └──────┬───────────────┬──────┘
                                           └────────────────┘        │ YES           │ NO
                                                                     ▼               ▼
                                                            ┌────────────────┐ ┌────────────────┐
                                                            │STATE:SUSPENDED │ │STATE: IRRIGATE │
                                                            │Pest Conflict   │ │Autonomous Safe │
                                                            │(Prevent Blight)│ │Action Approved │
                                                            └────────────────┘ └────────────────┘
```

---

## 2. Interactive Screens & User Interface

### Screen 1: Twin Dashboard
The primary operations center provides high-density, real-time observability over soil moisture dynamics, telemetry noise, uncertainty bands, and actuator commands.

![Twin Dashboard](docs/images/dashboard.png)

- **Soil Moisture Forecast Chart:** Recharts-powered interactive canvas displaying recent telemetry with shaded dropout zones, a surrogate point prediction, and a 12-hour forecast with a nominal 90% residual interval.
- **Sensor Noise Simulator:** Real-time hardware fault injector with a 0%–40% Bernoulli packet dropout slider, $+15^\circ\text{C}$ Heat Spike toggle, and $-60\%$ Drought Shock toggle. Updates a 48-slot hardware packet status strip in real-time.
- **Uncertainty Safety Meter:** Live telemetry gauge comparing empirical interval width against the adjustable safety limit $\epsilon$. Triggers visual alerts when the safety bound is breached.
- **Pathogen Conflict Gauge:** Half-circle vector gauge ($0\text{--}1.0$) with a critical hazard threshold at $0.70$. Accompanied by sub-score meters for temperature suitability, sustained relative humidity, and leaf-wetness duration, plus a parameter editor popover.
- **Actuator Status Card:** High-contrast dispatch card communicating the live command state:
  - `IRRIGATE` (Safe action approved)
  - `SUSPENDED` (Moisture deficit detected, but suspended due to blight hazard)
  - `LOCKED` (Safety brake active; manual review required, with manual approve/dismiss overrides)

---

### Screen 2: Decision Logic Architecture
Visualizes the deterministic execution tree and maintains a transparent audit history of all control signals.

![Decision Logic](docs/images/decision-logic.png)

- **Interactive Decision Tree:** Flowchart highlighting the active evaluation path in real time based on active sensor telemetry.
- **Threshold Tuning Sliders:** Interactive control over the uncertainty safety bound ($\epsilon \in [0.04, 0.25]$) and the dry soil threshold ($\theta \in [0.15, 0.38]\,\text{m}^3/\text{m}^3$).
- **48-Hour Decision Audit Strip:** Chronological timeline of hourly actuator triggers color-coded by rule type, complete with detailed tooltip audit logs.

---

### Screen 3: 90-Day Season Simulation Benchmark
A controlled scientific experiment executing two competing control policies across an identical 90-day Indian monsoon season with identical telemetry corruption.

![Season Simulation](docs/images/season-simulation.png)

- **Policy A (Confidence-Blind Farm):** Acts naively on scalar point predictions without uncertainty estimation or pathogen awareness.
- **Policy B (Uncertainty-Gated Twin):** Governed by the 3-tier safety cascade (Rules 1–3).
- **Catastrophic Failure Tracking:** Quantifies three failure classes against clean ground truth:
  1. *Blight Vector Contaminations:* Irrigating during active pathogen outbreaks ($\text{Risk} > 0.70$).
  2. *Over-watering on Corrupted False-Dry:* Pumping water onto saturated soil ($\text{Moisture} > 30\%$).
  3. *Under-watering Parched Soil:* Failing to irrigate crops in deficit ($\text{Moisture} < 20\%$).
- **Dropout Sensitivity Sweep:** Automated multi-run sweep across 10%, 20%, 30%, and 40% telemetry dropout levels, charting catastrophic failure containment.

---

### Screen 4: Empirical Model Evaluation
Live validation metrics computed directly from client-side model residuals and evaluation runs—with zero hardcoded figures.

![Model Evaluation](docs/images/model-evaluation.png)

- **Experiment 1 (Baseline Accuracy):** Live-computed Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Coefficient of Determination ($R^2$) on clean validation splits.
- **Experiment 2 (Robustness):** Fixed-seed, held-out scenarios report PICP, MPIW, and MAE for 0–40% dropout, heat shock, drought shock, and a combined stress case. Results are empirical for this dataset and do not establish coverage guarantees under distribution shift.
- **Experiment 3 (Decision Utility):** Net quantitative failure reduction percentage and simulated water savings.

---

## 3. Mathematical & Agronomic Foundations

### 3.1 Residual Calibration and Evaluation
The surrogate uses chronological 60/20/20 train, calibration, and evaluation partitions. Absolute residuals from the calibration partition set the nominal 90% interval quantile. MAE, RMSE, $R^2$, PICP, and MPIW are then computed on the later untouched evaluation partition.

At prediction time, interval width is multiplied by $1 + 4.5\delta$, where $\delta$ is the missing-reading fraction in the input window. This dropout response is a heuristic. Hourly time-series residuals are dependent, and heat/drought shocks can violate calibration assumptions, so nominal split-conformal coverage must not be described as a distribution-free guarantee here. The evaluation screen reports measured PICP on the configured holdout scenarios.

---

### 3.2 In-Browser Ridge Regression Surrogate
Because multi-layer recurrent neural networks (LSTMs) impose prohibitive bundle sizes and runtime latency in client browsers, AgriTwin uses an optimized, in-browser L2-regularized linear surrogate operating over a 16-dimensional lag and rolling feature vector:

$$\mathbf{w} = \left(\mathbf{X}^T \mathbf{X} + \lambda \mathbf{I}^*\right)^{-1} \mathbf{X}^T \mathbf{y}, \quad \lambda = 1.0$$

#### Feature Representation:
- **$\mathbf{x}_{1\dots 6}$:** Soil moisture lag values ($t-1, \dots, t-6$), forward-filled on missing readings.
- **$\mathbf{x}_7, \mathbf{x}_8$:** 6-hour and 12-hour rolling volumetric means.
- **$\mathbf{x}_9$:** 6-hour rolling standard deviation.
- **$\mathbf{x}_{10}, \mathbf{x}_{11}$:** Normalized temperature ($T/40$) and relative humidity ($\text{RH}/100$).
- **$\mathbf{x}_{12}$:** 6-hour cumulative rainfall sum.
- **$\mathbf{x}_{13}, \mathbf{x}_{14}$:** Cyclical diurnal encoding: $\sin(2\pi h / 24), \, \cos(2\pi h / 24)$.
- **$\mathbf{x}_{15}$:** Telemetry corruption fraction $\delta_t$.
- **$\mathbf{x}_0$:** Intercept term ($1.0$).

---

### 3.3 Microclimate Pathogen Model (*Phytophthora infestans*)
Late blight of potato and tomato produces devastating epidemics when microclimate leaves remain continuously wet under moderate temperatures. The twin implements an empirical risk index:

$$\text{PestRisk} = 0.30 \cdot S_{\text{temp}} + 0.35 \cdot S_{\text{rh}} + 0.35 \cdot S_{\text{wet}}$$

1. **Temperature Score ($S_{\text{temp}}$):** Fraction of the last 24 hours where ambient temperature was within the sporulation envelope:
   $$T \in [10^\circ\text{C}, \, 25^\circ\text{C}]$$
2. **Sustained Humidity Score ($S_{\text{rh}}$):** Run length of consecutive hours where $\text{RH} > 85\%$, normalized by the critical infection window (6 hours):
   $$S_{\text{rh}} = \min\left(1.0, \, \frac{\text{ConsecutiveHours}(\text{RH} > 85\%)}{6}\right)$$
3. **Leaf-Wetness Duration ($S_{\text{wet}}$):** Hours in the last 24h where active rainfall was recorded or the dew-point depression fell below $2^\circ\text{C}$:
   $$T - T_{\text{dew}} < 2.0^\circ\text{C} \quad \text{or} \quad \text{Rain} > 0\,\text{mm}$$
   where dew point $T_{\text{dew}}$ is derived via the Magnus-Tetens approximation:
   $$\gamma(T, \text{RH}) = \frac{17.27 \cdot T}{237.7 + T} + \ln\left(\frac{\text{RH}}{100}\right), \quad T_{\text{dew}} = \frac{237.7 \cdot \gamma(T, \text{RH})}{17.27 - \gamma(T, \text{RH})}$$

---

## 4. Data Provenance & Grounding

| Data Source | Primary Role | Description & Methodological Notice |
| :--- | :--- | :--- |
| **Open-Meteo API** | Live Weather Telemetry | Free, keyless meteorological API providing hourly temperature, humidity, dew point, rainfall, shortwave radiation, reference $\text{ET}_0$, VPD, and volumetric soil moisture (0–7 cm). |
| **ECMWF ERA5-Land** | Candidate model target | Not ingested by the current prototype. The reanalysis is a model product at $\sim 9\,\text{km}$ resolution, not a direct field sensor. |
| **ISMN IIT Kanpur** | Candidate in-situ ground truth | The About screen's CSV control counts rows only; no values are parsed or compared with forecasts. |
| **Synthetic Season** | Offline Fallback | Built-in 90-day hourly monsoon season generator capturing Indian monsoon onset, diurnal evaporative flux, and bucket soil physics. |

### Supported Agro-Climatic Presets
1. **Kanpur, Uttar Pradesh** ($26.45^\circ\text{N}, 80.35^\circ\text{E}$) — Gangetic Plain (Wheat / Rice)
2. **Ludhiana, Punjab** ($30.90^\circ\text{N}, 75.85^\circ\text{E}$) — Intensive Irrigation Zone (Wheat / Rice)
3. **Pune, Maharashtra** ($18.52^\circ\text{N}, 73.86^\circ\text{E}$) — Western Ghats Transition (Sugarcane / Cash crops)
4. **Nagpur, Maharashtra** ($21.15^\circ\text{N}, 79.09^\circ\text{E}$) — Vidarbha Dryland (Cotton / Soybean)
5. **Hyderabad, Telangana** ($17.39^\circ\text{N}, 78.49^\circ\text{E}$) — Deccan Semi-Arid (Rice / Cotton)
6. **Jorhat, Assam** ($26.76^\circ\text{N}, 94.22^\circ\text{E}$) — Brahmaputra High Rainfall (Tea)
7. **Custom Coordinates** — Supports arbitrary latitude and longitude entry.

---

## 5. Prototype Experiments and Validation Limits

The Model Evaluation screen computes its metrics from the selected telemetry series. Its robustness matrix uses fixed seeds and compares clean telemetry, 10–40% random dropout, a +15°C heat shock, a −60% soil-moisture shock, and a combined stress case. It reports the number of affected windows, PICP, MPIW, and MAE. The Season Simulation compares two control policies against synthetic or selected telemetry and should be interpreted as a software experiment, not measured field impact.

The late-blight panel includes four constructed microclimate profiles as rule-consistency checks. These checks verify that the coded thresholds produce the expected active/inactive label. They do not test disease incidence, crop loss, or whether suspending irrigation prevents spread. The default high-humidity threshold is 90%; [AHDB guidance](https://horticulture.ahdb.org.uk/knowledge-library/phytophthora-infestans) describes sporulation as favored around RH above 90% and 10–20°C, while infection dynamics also depend on leaf wetness, host, and pathogen conditions. See also [Hartill et al.'s leaf-wetness study](https://doi.org/10.1080/01140671.1990.10428093). Thresholds and weights still need local crop, cultivar, and field validation.

The ISMN CSV control currently counts data rows only; it does not parse observations or calculate forecast errors. ERA5-Land is a proposed source, not an integrated ingestion path. Accordingly, no field-validated agronomic or water-savings result is claimed.

---

## 6. How to Swap in a Python-Trained LSTM or XGBoost Model

The system is designed with a strict decoupled interface (`ModelInterface` in `src/types/index.ts`). A Python-trained PyTorch LSTM, Temporal Convolutional Network (TCN), or XGBoost regressor can be exported as a lightweight JSON checkpoint and dropped in.

### Step 1: Exporting from Python
```python
import json
import torch
import numpy as np

# 1. Evaluate on calibration set to calculate split-conformal nonconformity scores
model.eval()
with torch.no_grad():
    predictions = model(X_cal).cpu().numpy().squeeze()
residuals = np.abs(y_cal - predictions)

# Conformal 90% quantile (alpha = 0.10)
q_90 = float(np.quantile(residuals, 0.90))

# 2. Serialize weights, scaler, and conformal calibration parameters
export_manifest = {
    "model_architecture": "LSTM-Agri-v1",
    "input_features": ["sm_lag1", "sm_lag2", "sm_lag3", "temp", "rh", "rain6h", "vpd"],
    "weights": {
        "lstm_ih": model.lstm.weight_ih_l0.cpu().numpy().tolist(),
        "lstm_hh": model.lstm.weight_hh_l0.cpu().numpy().tolist(),
        "fc_weight": model.fc.weight.cpu().numpy().tolist(),
        "fc_bias": model.fc.bias.cpu().numpy().tolist()
    },
    "scaler": {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist()
    },
    "conformal": {
        "alpha": 0.10,
        "quantile": q_90,
        "base_sigma": float(np.std(residuals))
    }
}

with open("agri_lstm_checkpoint.json", "w") as f:
    json.dump(export_manifest, f, indent=2)
```

### Step 2: Implementing the Frontend Adapter
In `src/model/surrogate.ts`:
```typescript
import checkpoint from './agri_lstm_checkpoint.json';
import type { WeatherDataPoint, Prediction, ModelInterface } from '../types';

export class ExportedLSTMModel implements ModelInterface {
  private quantile = checkpoint.conformal.quantile;
  private baseSigma = checkpoint.conformal.base_sigma;

  predict(window: (WeatherDataPoint | null)[]): Prediction {
    // 1. Feature extraction & imputation
    const x = this.vectorize(window);

    // 2. Linear forward pass / ONNX runtime evaluation
    const meanPred = this.forwardPass(x, checkpoint.weights);

    // 3. Dynamic uncertainty scaling from telemetry dropout ratio
    const nullRatio = window.filter(p => p === null).length / window.length;
    const currentSigma = this.baseSigma * (1.0 + 4.5 * nullRatio);

    // 4. Split-conformal prediction interval
    const halfWidth = this.quantile * (currentSigma / this.baseSigma);
    const lower = Math.max(0, meanPred - halfWidth);
    const upper = Math.min(0.60, meanPred + halfWidth);

    return {
      mean: meanPred,
      lower,
      upper,
      sigma: currentSigma
    };
  }
}
```

---

## 7. Project Architecture & File Hierarchy

```
digital-twin/
├── capture-screenshots.js       # Headless Chrome automated screenshot capture script
├── docs/
│   └── images/                  # High-resolution documentation preview screenshots
│       ├── dashboard.png
│       ├── decision-logic.png
│       ├── season-simulation.png
│       └── model-evaluation.png
├── index.html                   # HTML5 Entrypoint
├── package.json                 # Project dependencies & npm run scripts
├── tailwind.config.js           # Clean monochrome, high-contrast palette
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite build configuration
└── src/
    ├── types/
    │   └── index.ts             # Strongly-typed domain interfaces
    ├── data/
    │   ├── locations.ts         # 6 Indian agro-climatic presets + crops
    │   ├── fetchWeather.ts      # Open-Meteo live hourly REST client
    │   ├── syntheticData.ts     # Realistic 90-day monsoon season generator
    │   └── corruptionInjector.ts# Dropout, heat spike & drought shock injectors
    ├── model/
    │   ├── surrogate.ts         # Ridge regression surrogate (16 lag/rolling features)
    │   └── conformal.ts         # Split-conformal calibration engine
    ├── agronomy/
    │   └── pestRisk.ts          # Phytophthora infestans late blight microclimate index
    ├── decision/
    │   └── rules.ts             # 3-tier rules cascade (Rules 1, 2, and 3)
    ├── sim/
    │   └── seasonRunner.ts      # 90-day parallel season benchmark & dropout sweep
    ├── hooks/
    │   ├── useTheme.ts          # Light/Dark mode state & persistence
    │   └── useWeatherData.ts    # Telemetry streaming & noise synchronization
    ├── components/
    │   ├── Layout.tsx           # Monochromatic shell with sidebar & location modal
    │   ├── GuidedDemo.tsx       # 5-step interactive failure-containment walkthrough
    │   ├── Dashboard/
    │   │   ├── DashboardPage.tsx
    │   │   ├── SoilMoistureChart.tsx
    │   │   ├── SensorNoisePanel.tsx
    │   │   ├── UncertaintyMeter.tsx
    │   │   ├── PestRiskGauge.tsx
    │   │   └── ActuatorPanel.tsx
    │   ├── DecisionLogic/
    │   │   └── DecisionLogicPage.tsx
    │   ├── SeasonSim/
    │   │   └── SeasonSimPage.tsx
    │   ├── ModelEval/
    │   │   └── ModelEvalPage.tsx
    │   └── About/
    │       └── AboutPage.tsx
    ├── App.tsx                  # Root application state management
    ├── main.tsx                 # React DOM mount
    └── index.css                # Tailwind base + minimalist engineering styles
```

---

## 8. Installation & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (version 9 or higher)

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/Pratyush-Singh-007/Digital-Twin.git
cd Digital-Twin

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

### Production Build
```bash
# Compile TypeScript and bundle with Vite
npm run build

# Preview the production bundle locally
npm run preview
```

---

## 9. Limitations & Research Boundaries

1. **Surrogate Model:** The in-browser model is an honest linear ridge surrogate with lag features, rather than a multi-layer deep neural network.
2. **Agronomic Pathogen Model:** The late blight index uses empirical rules based on microclimate variables; production epidemiology requires spore trapping and canopy density sensors.
3. **Reanalysis Resolution:** ERA5-Land reanalysis is gridded at $\sim 9\,\text{km}$ resolution, smoothing localized soil micro-variations.
4. **Conformal Exchangeability:** Split-conformal prediction assumes exchangeable validation residuals; extreme climate shifts or sensor drift may lead to localized coverage gaps.
5. **Software-Only Prototype:** Actuator signals (`IRRIGATE`, `SUSPENDED`, `LOCKED`) are software events. In production, these connect to hardware relays (e.g., LoRaWAN solenoid controllers) with watchdog timers.

---

## 10. License

This project is open-source under the [MIT License](LICENSE).

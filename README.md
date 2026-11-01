# AgriTwin: Uncertainty-Aware Digital Twin for Agricultural Decision Support

A software-only digital twin of soil moisture and microclimate for Indian farms. It predicts volumetric soil moisture with split-conformal confidence bands, scores late-blight (*Phytophthora infestans*) pathogen risk, and only automates irrigation when confident.

```
   ┌────────────────────────────────────────────────────────┐
   │                  Telemetry Stream                      │
   │  (Open-Meteo Live or Synthetic 90-day Fallback Season) │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │  Gate 1: Epistemic Uncertainty Safety Brake (Rule 3)   │
   │      Is 90% Conformal Interval Width ≥ ε ?            │
   └───────────────┬────────────────────────┬───────────────┘
                   │ YES                    │ NO
                   ▼                        ▼
          ┌────────────────┐       ┌────────────────────────────────┐
          │ LOCKED: Manual │       │ Gate 2: Soil Moisture Check    │
          │ Review Request │       │      Is Moisture < Dry Limit?  │
          └────────────────┘       └────────┬───────────────┬───────┘
                                            │ NO            │ YES
                                            ▼               ▼
                                   ┌────────────────┐ ┌───────────────────────────┐
                                   │ Adequate: HOLD │ │ Gate 3: Pest Conflict     │
                                   │   (Conserve)   │ │      Is Pest Risk > 0.70? │
                                   └────────────────┘ └─────┬───────────────┬─────┘
                                                            │ YES           │ NO
                                                            ▼               ▼
                                                   ┌────────────────┐ ┌───────────────┐
                                                   │ SUSPENDED:     │ │ IRRIGATE:     │
                                                   │ Pathogen Blight│ │ Safe Action   │
                                                   │ Conflict       │ │ Authorized    │
                                                   └────────────────┘ └───────────────┘
```

---

## Quickstart (One Command)

```bash
# Navigate to the project directory
cd "/Users/pratyush/Downloads/digital twin"

# Start the local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

To create an optimized production build:
```bash
npm run build
npm run preview
```

---

## Features & Screens

1. **Twin Dashboard**
   - **Header:** Location selector with 6 Indian agro-climatic presets (Kanpur, Ludhiana, Pune, Nagpur, Hyderabad, Jorhat) plus custom lat/lon coordinate input.
   - **Live Data Feed:** Open-Meteo free API fetching hourly temperature, relative humidity, dew point, rain, radiation, reference ET0, VPD, soil moisture (0–7 cm), and soil temperature. Falls back to a 90-day synthetic monsoon season if offline.
   - **Soil Moisture Forecast Chart:** 48 hours of historical telemetry with shaded dropout/corrupted regions, ground-truth trajectory, surrogate mean prediction, and 12-hour forward forecast with shaded 90% conformal bands.
   - **Sensor Noise Simulator:** Real-time slider (0–40% packet dropout), "+15°C Heat Spike" toggle, and "-60% Drought Shock" toggle. Moving the slider dynamically widens the interval in `< 300 ms` and renders an interactive 48-slot hardware telemetry status strip.
   - **Uncertainty Meter:** Visual bar of current prediction interval width vs. safety threshold $\epsilon$ (adjustable via slider). Triggers a pulsing warning when $\text{width} \ge \epsilon$.
   - **Pathogen Risk Gauge:** 0–1 half-circle gauge with late blight critical threshold marker at 0.70. Sub-scores for temperature window (10–25°C), sustained humidity hours ($>85\%$), and leaf-wetness duration (dew-point depression & rain). Includes an editable parameter popover.
   - **Actuator Decision Card:** Displays live state: `IRRIGATE` (green), `SUSPENDED` (amber), or `LOCKED` (red). When locked, provides "Approve Manually" and "Dismiss" operator overrides.
   - **Interactive Guided Demo:** Floating 5-step walkthrough demonstrating baseline $\rightarrow$ 30% dropout $\rightarrow$ band widening $\rightarrow$ actuator lock $\rightarrow$ pathogen conflict.

2. **Decision Logic**
   - Interactive tree visualization highlighting the live active evaluation path.
   - Sliders for volumetric dry threshold and uncertainty limit $\epsilon$.
   - 48-hour color-coded decision audit strip with tooltips explaining every rule fired.

3. **Season Simulation (Parallel Experiment)**
   - 90-day side-by-side simulation on identical telemetry and corruption:
     - **Confidence-Blind Farm:** Actuates on point predictions; ignores uncertainty and pathogen risk.
     - **Uncertainty-Gated Twin:** Employs Rules 1–3.
   - Evaluates 3 catastrophic error types against ground truth: (a) irrigating during pathogen outbreaks, (b) over-watering on corrupt sensor glitches, and (c) under-watering parched soil.
   - 10%–40% dropout sensitivity sweep chart demonstrating error containment.

4. **Model Evaluation**
   - **Exp 1 (Baseline Accuracy):** Live computed MAE, RMSE, and $R^2$ on clean calibration data.
   - **Exp 2 (Conformal Robustness):** Empirical coverage (PICP) and mean interval width (MPIW) across corruption levels. Demonstrates width expansion while maintaining $\sim 90\%$ coverage.
   - **Exp 3 (Decision Utility):** Live summary of error reduction and water conservation.

5. **About & Data**
   - Data provenance breakdown: Open-Meteo, ECMWF ERA5-Land (reanalysis model target), and ISMN IIT Kanpur (in-situ station with optional CSV upload).
   - Methodological limitations and assumptions.

---

## Replacing the In-Browser Surrogate with a Trained Python Model

The frontend surrogate model implements `ModelInterface` (`src/types/index.ts`):

```typescript
export interface ModelInterface {
  train(data: WeatherDataPoint[]): void;
  predict(window: (WeatherDataPoint | null)[]): Prediction;
  forecastHorizon(window: (WeatherDataPoint | null)[], h: number): ForecastPoint[];
  getMetrics(): ModelMetrics;
}
```

### Step 1: Export from Python (PyTorch LSTM or XGBoost)

Train your model in Python on ERA5-Land or ISMN ground-truth data, calibrate split-conformal nonconformity scores, and export to JSON:

```python
import json
import numpy as np

# 1. Compute calibration residuals on validation split
predictions = model.predict(X_val)
residuals = np.abs(y_val - predictions)
conformal_quantile_90 = float(np.quantile(residuals, 0.90))

# 2. Export weights or ONNX / JSON parameters
export_data = {
    "model_name": "AgriLSTM_v1",
    "input_features": ["sm_lag1", "sm_lag2", "sm_lag3", "temp", "rh", "rain6h", "vpd"],
    "weights": {
        # Export layer weights or tree leaves as nested lists
        "lstm_ih": model.lstm.weight_ih_l0.detach().cpu().numpy().tolist(),
        "lstm_hh": model.lstm.weight_hh_l0.detach().cpu().numpy().tolist(),
        "fc_w": model.fc.weight.detach().cpu().numpy().tolist(),
        "fc_b": model.fc.bias.detach().cpu().numpy().tolist()
    },
    "scaler": {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist()
    },
    "conformal_calibration": {
        "quantile_90": conformal_quantile_90,
        "base_sigma": float(np.std(residuals))
    }
}

with open("agri_lstm_checkpoint.json", "w") as f:
    json.dump(export_data, f, indent=2)
```

### Step 2: Drop into `src/model/surrogate.ts`

Import your JSON file and implement the `predict` method:

```typescript
import checkpoint from './agri_lstm_checkpoint.json';
import type { WeatherDataPoint, Prediction, ModelInterface } from '../types';

export class ExportedLSTMModel implements ModelInterface {
  private quantile = checkpoint.conformal_calibration.quantile_90;
  private baseSigma = checkpoint.conformal_calibration.base_sigma;

  predict(window: (WeatherDataPoint | null)[]): Prediction {
    // 1. Vectorize and forward-fill missing values
    const features = this.extractFeatures(window);

    // 2. Perform matrix multiplication / ONNX-runtime pass
    const pointPrediction = this.forwardPass(features, checkpoint.weights);

    // 3. Dynamic uncertainty scaling based on corruption ratio
    const nullRatio = window.filter(p => p === null).length / window.length;
    const currentSigma = this.baseSigma * (1.0 + 4.5 * nullRatio);

    // 4. Split-conformal prediction intervals
    const halfWidth = this.quantile * (currentSigma / this.baseSigma);
    const lower = Math.max(0, pointPrediction - halfWidth);
    const upper = Math.min(0.60, pointPrediction + halfWidth);

    return {
      mean: pointPrediction,
      lower,
      upper,
      sigma: currentSigma
    };
  }
}
```

The rest of the digital twin (uncertainty meters, actuator gates, and visualizers) will automatically function with the new model.

---

## Architecture & File Structure

```
digital twin/
├── index.html                   # HTML entrypoint
├── package.json                 # React 18, TypeScript, Recharts, Lucide, Tailwind
├── tailwind.config.js           # Custom agricultural and earthy palette
├── src/
│   ├── types/
│   │   └── index.ts             # Strongly typed domain definitions
│   ├── data/
│   │   ├── locations.ts         # 6 Indian presets (Kanpur, Pune, etc.)
│   │   ├── fetchWeather.ts      # Open-Meteo live hourly API client
│   │   ├── syntheticData.ts     # Realistic 90-day monsoon season generator
│   │   └── corruptionInjector.ts# Dropout, heat spike, drought shock injector
│   ├── model/
│   │   ├── surrogate.ts         # Ridge regression surrogate (λ=1.0) with lags
│   │   └── conformal.ts         # Split conformal prediction calibrator
│   ├── agronomy/
│   │   └── pestRisk.ts          # Phytophthora infestans late blight microclimate index
│   ├── decision/
│   │   └── rules.ts             # Rules 1-3 (Safety brake, conflict, safe action)
│   ├── sim/
│   │   └── seasonRunner.ts      # 90-day parallel twin experiment & sweep runner
│   ├── hooks/
│   │   ├── useTheme.ts          # Dark/light mode persistence
│   │   └── useWeatherData.ts    # Telemetry stream & corruption state
│   ├── components/
│   │   ├── Layout.tsx           # Responsive shell with sidebar/header/location modal
│   │   ├── GuidedDemo.tsx       # Interactive step-by-step walkthrough
│   │   ├── Dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SoilMoistureChart.tsx
│   │   │   ├── SensorNoisePanel.tsx
│   │   │   ├── UncertaintyMeter.tsx
│   │   │   ├── PestRiskGauge.tsx
│   │   │   └── ActuatorPanel.tsx
│   │   ├── DecisionLogic/
│   │   │   └── DecisionLogicPage.tsx
│   │   ├── SeasonSim/
│   │   │   └── SeasonSimPage.tsx
│   │   ├── ModelEval/
│   │   │   └── ModelEvalPage.tsx
│   │   └── About/
│   │       └── AboutPage.tsx
│   ├── App.tsx                  # Root state orchestration
│   ├── main.tsx                 # React DOM mount
│   └── index.css                # Tailwind base + custom card/badge components
```

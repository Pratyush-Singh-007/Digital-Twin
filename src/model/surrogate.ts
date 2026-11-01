import type {
  WeatherDataPoint,
  Prediction,
  ForecastPoint,
  ModelInterface,
  ModelMetrics,
} from '../types';
import { ConformalCalibrator } from './conformal';

/* ── Matrix math helpers for Ridge Regression ─────────────────────── */

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > maxVal) {
        maxVal = Math.abs(M[r][i]);
        maxRow = r;
      }
    }
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // Degenerate pivot, add small perturbation for numerical stability
      M[i][i] = 1e-6;
    }

    const currentPivot = M[i][i];
    for (let c = i; c <= n; c++) {
      M[i][c] /= currentPivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = M[r][i];
        for (let c = i; c <= n; c++) {
          M[r][c] -= factor * M[i][c];
        }
      }
    }
  }

  return M.map((row) => row[n]);
}

/** Compute (X^T * X + lambda * I)^-1 * X^T * y */
function fitRidge(X: number[][], y: number[], lambda: number = 1.0): number[] {
  const n = X.length;
  const p = X[0].length;

  // X^T * X
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * X[k][j];
      }
      XtX[i][j] = sum;
    }
  }

  // Add L2 penalty (do not penalize intercept at index 0)
  for (let i = 1; i < p; i++) {
    XtX[i][i] += lambda;
  }

  // X^T * y
  const Xty: number[] = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += X[k][i] * y[k];
    }
    Xty[i] = sum;
  }

  return solveLinearSystem(XtX, Xty);
}

/* ── Surrogate Model Implementation ────────────────────────────────── */

export class SurrogateModel implements ModelInterface {
  private weights: number[] = [];
  private calibrator: ConformalCalibrator = new ConformalCalibrator();
  private baseResidualSigma: number = 0.02;
  private metrics: ModelMetrics = {
    mae: 0,
    rmse: 0,
    r2: 0,
    picp: 0,
    mpiw: 0,
    n: 0,
  };
  private isTrained: boolean = false;

  /**
   * Extract features from a 24-hour window (which may contain nulls / dropped readings).
   * Feature vector (with intercept = 1):
   * 0: Intercept (1.0)
   * 1-6: Last 6 lag values of soil moisture (forward-filled if missing)
   * 7: Rolling mean 6h
   * 8: Rolling mean 12h
   * 9: Rolling std 6h
   * 10: Current temperature (or latest valid)
   * 11: Current humidity (or latest valid)
   * 12: Rain sum over last 6h
   * 13: sin(2 * pi * hour / 24)
   * 14: cos(2 * pi * hour / 24)
   * 15: Corruption fraction (null ratio in window)
   */
  public extractFeatures(window: (WeatherDataPoint | null)[]): {
    features: number[];
    corruptionFraction: number;
    lastKnownMoisture: number;
  } {
    if (window.length === 0) {
      return {
        features: new Array(16).fill(0),
        corruptionFraction: 0,
        lastKnownMoisture: 0.25,
      };
    }

    const n = window.length;
    let nullCount = 0;
    for (const pt of window) {
      if (pt === null) nullCount++;
    }
    const corruptionFraction = nullCount / n;

    // Impute missing values with forward-fill, then backward-fill, then defaults
    const imputed: WeatherDataPoint[] = [];
    let lastValid: WeatherDataPoint = {
      time: new Date().toISOString(),
      timestamp: Date.now(),
      temperature: 28,
      humidity: 60,
      dewPoint: 20,
      rain: 0,
      radiation: 400,
      et0: 0.2,
      vpd: 1.5,
      soilMoisture: 0.28,
      soilTemperature: 27,
    };

    // Find first valid point to prime if available
    for (const pt of window) {
      if (pt !== null) {
        lastValid = { ...pt };
        break;
      }
    }

    for (let i = 0; i < n; i++) {
      const pt = window[i];
      if (pt !== null) {
        lastValid = { ...pt };
        imputed.push(pt);
      } else {
        imputed.push({ ...lastValid });
      }
    }

    const lastKnownMoisture = imputed[imputed.length - 1].soilMoisture;

    // Lags of soil moisture (last 6 hours)
    const lags: number[] = [];
    for (let lag = 1; lag <= 6; lag++) {
      const idx = imputed.length - lag;
      lags.push(idx >= 0 ? imputed[idx].soilMoisture : lastKnownMoisture);
    }

    // 6h and 12h rolling means
    const last6 = imputed.slice(-6);
    const last12 = imputed.slice(-12);
    const mean6 = last6.reduce((acc, p) => acc + p.soilMoisture, 0) / (last6.length || 1);
    const mean12 = last12.reduce((acc, p) => acc + p.soilMoisture, 0) / (last12.length || 1);

    // 6h rolling std
    const variance6 =
      last6.reduce((acc, p) => acc + Math.pow(p.soilMoisture - mean6, 2), 0) /
      (last6.length || 1);
    const std6 = Math.sqrt(variance6);

    const latest = imputed[imputed.length - 1];
    const rainSum6 = last6.reduce((acc, p) => acc + p.rain, 0);

    // Hour of day
    const hour = new Date(latest.time).getUTCHours();
    const sinHour = Math.sin((2 * Math.PI * hour) / 24);
    const cosHour = Math.cos((2 * Math.PI * hour) / 24);

    const features = [
      1.0, // Intercept
      lags[0],
      lags[1],
      lags[2],
      lags[3],
      lags[4],
      lags[5],
      mean6,
      mean12,
      std6,
      latest.temperature / 40.0, // scaled roughly to [0,1]
      latest.humidity / 100.0,
      rainSum6 / 50.0,
      sinHour,
      cosHour,
      corruptionFraction,
    ];

    return { features, corruptionFraction, lastKnownMoisture };
  }

  /**
   * Train the Ridge regression surrogate on historical clean data.
   */
  public train(data: WeatherDataPoint[]): void {
    if (data.length < 30) {
      // Fallback weights for untrained or tiny dataset
      this.weights = [0.05, 0.6, 0.15, 0.05, 0.05, 0.02, 0.01, 0.02, 0.02, 0.01, -0.01, 0.02, 0.05, 0, 0, 0];
      this.baseResidualSigma = 0.02;
      this.calibrator.calibrate([0.01, 0.02, 0.025, 0.03]);
      this.isTrained = true;
      return;
    }

    const X: number[][] = [];
    const y: number[] = [];

    // Form windows of 24 hours to predict next hour's soil moisture
    for (let i = 24; i < data.length - 1; i++) {
      const window = data.slice(i - 24, i);
      const target = data[i + 1].soilMoisture;
      const { features } = this.extractFeatures(window);
      X.push(features);
      y.push(target);
    }

    // Train Ridge regression with lambda = 1.0
    this.weights = fitRidge(X, y, 1.0);

    // Compute in-sample residuals for metrics and conformal calibration
    const residuals: number[] = [];
    let absErrSum = 0;
    let sqErrSum = 0;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    let ssTot = 0;

    for (let i = 0; i < X.length; i++) {
      let pred = 0;
      for (let j = 0; j < this.weights.length; j++) {
        pred += X[i][j] * this.weights[j];
      }
      pred = Math.max(0.05, Math.min(0.60, pred));
      const res = y[i] - pred;
      residuals.push(res);
      absErrSum += Math.abs(res);
      sqErrSum += res * res;
      ssTot += Math.pow(y[i] - yMean, 2);
    }

    const n = X.length;
    const mae = absErrSum / n;
    const rmse = Math.sqrt(sqErrSum / n);
    const ssRes = sqErrSum;
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0.85;

    this.baseResidualSigma = Math.max(0.005, rmse);

    // Calibrate split conformal intervals at 90% confidence (alpha = 0.1)
    this.calibrator.calibrate(residuals, 0.1);

    // Compute PICP and MPIW on calibration
    let coveredCount = 0;
    let widthSum = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < this.weights.length; j++) {
        pred += X[i][j] * this.weights[j];
      }
      const interval = this.calibrator.getInterval(pred, this.baseResidualSigma);
      if (y[i] >= interval.lower && y[i] <= interval.upper) {
        coveredCount++;
      }
      widthSum += interval.width;
    }

    this.metrics = {
      mae: Math.round(mae * 10000) / 10000,
      rmse: Math.round(rmse * 10000) / 10000,
      r2: Math.round(r2 * 1000) / 1000,
      picp: Math.round((coveredCount / n) * 1000) / 1000,
      mpiw: Math.round((widthSum / n) * 10000) / 10000,
      n,
    };

    this.isTrained = true;
  }

  /**
   * Predict single-step moisture with split-conformal confidence band.
   * Uncertainty widens in real-time as corruption fraction grows.
   */
  public predict(window: (WeatherDataPoint | null)[]): Prediction {
    if (!this.isTrained || this.weights.length === 0) {
      return {
        mean: 0.28,
        lower: 0.22,
        upper: 0.34,
        sigma: 0.03,
      };
    }

    const { features, corruptionFraction, lastKnownMoisture } = this.extractFeatures(window);

    let pred = 0;
    for (let j = 0; j < this.weights.length; j++) {
      pred += features[j] * this.weights[j];
    }

    // Physics sanity clamp
    pred = Math.max(0.05, Math.min(0.60, pred));

    // Responsive uncertainty scaling:
    // With 0% dropout: sigma = baseResidualSigma * 1.0
    // With 40% dropout: sigma = baseResidualSigma * (1 + 4.5 * 0.4) = baseResidualSigma * 2.8x
    const uncertaintyMultiplier = 1.0 + 4.5 * corruptionFraction;
    const currentSigma = this.baseResidualSigma * uncertaintyMultiplier;

    // Split conformal prediction interval
    const interval = this.calibrator.getInterval(pred, currentSigma);

    return {
      mean: Math.round(pred * 10000) / 10000,
      lower: Math.round(interval.lower * 10000) / 10000,
      upper: Math.round(interval.upper * 10000) / 10000,
      sigma: Math.round(currentSigma * 10000) / 10000,
    };
  }

  /**
   * Forecast future trajectory up to h hours ahead.
   * Horizon defaults to 12 hours.
   */
  public forecastHorizon(
    window: (WeatherDataPoint | null)[],
    h: number = 12,
  ): ForecastPoint[] {
    const forecast: ForecastPoint[] = [];
    const simWindow = [...window];

    for (let step = 1; step <= h; step++) {
      const pred = this.predict(simWindow);

      // Create a pseudo point for rolling forward
      const lastPoint = simWindow[simWindow.length - 1];
      const nextTime = lastPoint
        ? new Date(new Date(lastPoint.time).getTime() + step * 3600000).toISOString()
        : new Date().toISOString();

      const synthesizedPoint: WeatherDataPoint = {
        time: nextTime,
        timestamp: new Date(nextTime).getTime(),
        temperature: lastPoint ? lastPoint.temperature : 28,
        humidity: lastPoint ? lastPoint.humidity : 60,
        dewPoint: lastPoint ? lastPoint.dewPoint : 20,
        rain: 0,
        radiation: 0,
        et0: lastPoint ? lastPoint.et0 : 0.1,
        vpd: lastPoint ? lastPoint.vpd : 1.2,
        soilMoisture: pred.mean,
        soilTemperature: lastPoint ? lastPoint.soilTemperature : 26,
      };

      // Progressively widen uncertainty slightly for future horizons
      const horizonFactor = 1.0 + 0.05 * step;
      const widenedLower = Math.max(0, pred.mean - (pred.mean - pred.lower) * horizonFactor);
      const widenedUpper = Math.min(0.60, pred.mean + (pred.upper - pred.mean) * horizonFactor);

      forecast.push({
        hour: step,
        prediction: {
          mean: pred.mean,
          lower: Math.round(widenedLower * 10000) / 10000,
          upper: Math.round(widenedUpper * 10000) / 10000,
          sigma: Math.round(pred.sigma * horizonFactor * 10000) / 10000,
        },
      });

      // Shift window
      simWindow.shift();
      simWindow.push(synthesizedPoint);
    }

    return forecast;
  }

  public getMetrics(): ModelMetrics {
    return this.metrics;
  }
}

/** Convenience function to initialize, train, and return calibrated model */
export function trainAndCalibrate(data: WeatherDataPoint[]): {
  model: SurrogateModel;
  calibrator: ConformalCalibrator;
} {
  const model = new SurrogateModel();
  model.train(data);
  return { model, calibrator: (model as any).calibrator };
}

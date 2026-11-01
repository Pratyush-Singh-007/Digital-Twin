import React, { useState } from 'react';
import { Database, CloudSun, Server, AlertTriangle, Upload, CheckCircle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [csvUploaded, setCsvUploaded] = useState<boolean>(false);
  const [uploadedRows, setUploadedRows] = useState<number>(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        setUploadedRows(Math.max(0, lines.length - 1));
        setCsvUploaded(true);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto font-mono">
      {/* Overview */}
      <div className="card space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          SYSTEM ARCHITECTURE & EPISTEMIC SAFETY RATIONALE
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
          Standard predictive models emit uncalibrated point estimates, failing silently when field sensors suffer packet loss, drift, or extreme out-of-distribution weather.
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
          This digital twin couples a lag-feature surrogate with <strong>split-conformal prediction</strong>. When telemetry degrades, the 90% confidence interval expands adaptively. If uncertainty exceeds the agronomic threshold ε, the system disengages automation and requests human review.
        </p>
      </div>

      {/* 3 Data Sources */}
      <div className="card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          DATA PROVENANCE & GROUNDING
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Open-Meteo */}
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-zinc-500" />
              <div className="font-bold text-xs">OPEN-METEO API</div>
            </div>
            <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
              Live hourly surface parameters: temperature, humidity, dew point, rainfall, radiation, reference ET0, and vapour pressure deficit.
            </p>
            <div className="text-[10px] text-zinc-400">
              ROLE: Live weather telemetry feed
            </div>
          </div>

          {/* ERA5-Land */}
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-zinc-500" />
              <div className="font-bold text-xs">ECMWF ERA5-LAND</div>
            </div>
            <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
              Atmospheric and land-surface reanalysis dataset used as training target for volumetric soil moisture (0–7 cm depth).
            </p>
            <div className="p-2 rounded border border-amber-300 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-400 font-sans">
              ⚠️ <strong>Honesty:</strong> ERA5-Land is a model reanalysis (~9km), not an in-situ probe.
            </div>
          </div>

          {/* ISMN */}
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-500" />
              <div className="font-bold text-xs">ISMN IIT KANPUR</div>
            </div>
            <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
              International Soil Moisture Network in-situ station at IIT Kanpur (26.51°N, 80.23°E) for ground-truth comparison.
            </p>

            <label className="btn btn-secondary btn-sm w-full cursor-pointer flex items-center justify-center gap-1.5 text-[10px]">
              <Upload className="w-3 h-3" />
              <span>UPLOAD ISMN CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            {csvUploaded && (
              <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Loaded {uploadedRows} points
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How to replace */}
      <div className="card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          REPLACING SURROGATE WITH TRAINED PYTHON LSTM / XGBOOST
        </h3>
        <p className="text-xs font-sans text-zinc-600 dark:text-zinc-400">
          The surrogate exposes `ModelInterface` in <code>src/types/index.ts</code>. To drop in a PyTorch LSTM or XGBoost model:
        </p>

        <div className="p-3 bg-zinc-950 text-zinc-100 rounded border border-zinc-800 text-[11px] font-mono overflow-x-auto space-y-1">
          <div className="text-zinc-500">// 1. Python: Export weights & conformal residuals to JSON</div>
          <pre>{`import json
export_payload = {
    "model_type": "lstm_uncertainty",
    "weights": model.state_dict_numpy(),
    "scaler": {"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()},
    "calibration_residuals": val_residuals.tolist()  # For conformal quantile
}
with open("model_checkpoint.json", "w") as f:
    json.dump(export_payload, f)`}</pre>

          <div className="text-zinc-500 pt-2">// 2. Frontend: Implement ModelInterface in src/model/surrogate.ts</div>
          <pre>{`import weights from './model_checkpoint.json';

export class ExportedLSTMModel implements ModelInterface {
  predict(window: (WeatherDataPoint | null)[]): Prediction {
    const tensor = this.vectorize(window);
    const mean = this.forwardPass(tensor, weights);
    const interval = this.calibrator.getInterval(mean, estimatedSigma);
    return { mean, lower: interval.lower, upper: interval.upper, sigma: estimatedSigma };
  }
}`}</pre>
        </div>
      </div>

      {/* Limitations */}
      <div className="card space-y-2 border-l-2 border-l-amber-500">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            LIMITATIONS & METHODOLOGICAL BOUNDARIES
          </h3>
        </div>

        <ul className="text-xs font-sans text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
          <li><strong>Surrogate Model:</strong> In-browser model is an honest linear ridge surrogate with lag features.</li>
          <li><strong>Pathogen Index:</strong> Focuses on Phytophthora infestans microclimate susceptibility (temperature, dew-point depression, continuous RH); real epidemiology involves spore trapping and canopy density.</li>
          <li><strong>Reanalysis Resolution:</strong> ERA5-Land gridded at ~9 km resolution.</li>
          <li><strong>Exchangeability:</strong> Conformal prediction assumes exchangeable validation residuals.</li>
          <li><strong>Software-Only:</strong> Digital twin prototype without physical IoT relay hardware.</li>
        </ul>
      </div>
    </div>
  );
};

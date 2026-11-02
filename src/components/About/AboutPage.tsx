import React, { useState } from 'react';
import { Database, CloudSun, Server, AlertTriangle, Upload, CheckCircle } from 'lucide-react';
import { HeadingNote } from '../HeadingNote';

export const AboutPage: React.FC = () => {
  const [csvUploaded, setCsvUploaded] = useState<boolean>(false);
  const [uploadedRows, setUploadedRows] = useState<number>(0);
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !file.name.toLowerCase().endsWith('.csv')) {
      setCsvUploaded(false);
      setCsvError('Choose a .csv file to count rows.');
      e.target.value = '';
      return;
    }
    if (file) {
      setCsvError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        setUploadedRows(Math.max(0, lines.length - 1));
        setCsvUploaded(true);
        setCsvError(null);
        e.target.value = '';
      };
      reader.onerror = () => {
        setCsvUploaded(false);
        setCsvError('The selected file could not be read. Try another CSV.');
        e.target.value = '';
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto font-mono">
      {/* Overview */}
      <div className="card space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          HOW THE PROTOTYPE WORKS
        </h2>
        <HeadingNote>Model design and safety</HeadingNote>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
          Standard predictive models emit uncalibrated point estimates, failing silently when field sensors suffer packet loss, drift, or extreme out-of-distribution weather.
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
          This prototype couples a lag-feature surrogate with a nominal 90% split-conformal interval, calibrated on a chronological holdout and evaluated on a later holdout. Its interval widening under dropout is a heuristic; time dependence and out-of-distribution weather mean coverage is measured empirically, not guaranteed. If interval width exceeds ε, the prototype locks the actuator and requests manual review.
        </p>
      </div>

      {/* 3 Data Sources */}
      <div className="card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          DATA SOURCES
        </h3>
        <HeadingNote>Inputs and reliability</HeadingNote>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Open-Meteo */}
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-zinc-500" />
              <div><div className="font-bold text-xs">OPEN-METEO API</div><HeadingNote>Live weather feed</HeadingNote></div>
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
              <div><div className="font-bold text-xs">ECMWF ERA5-LAND</div><HeadingNote>Candidate training data</HeadingNote></div>
            </div>
            <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
              Candidate reanalysis source for training targets; this prototype does not ingest ERA5-Land directly.
            </p>
            <div className="p-2 rounded border border-amber-300 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-400 font-sans">
              ⚠️ <strong>Honesty:</strong> ERA5-Land is a model reanalysis (~9km), not an in-situ probe.
            </div>
          </div>

          {/* ISMN */}
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-500" />
              <div><div className="font-bold text-xs">ISMN IIT KANPUR</div><HeadingNote>Ground station candidate</HeadingNote></div>
            </div>
            <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
              International Soil Moisture Network in-situ station at IIT Kanpur (26.51°N, 80.23°E), a candidate source for ground-truth evaluation.
            </p>

            <label className="btn btn-secondary btn-sm w-full cursor-pointer flex items-center justify-center gap-1.5 text-[10px]">
              <Upload className="w-3 h-3" />
              <span>COUNT CSV ROWS (NOT EVALUATED)</span>
              <input data-testid="csv-upload" aria-label="Choose CSV file" type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </label>
            {csvUploaded && (
              <div data-testid="csv-upload-status" role="status" className="text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Counted {uploadedRows} data rows. Not evaluated.
              </div>
            )}
            {csvError && <p role="alert" className="text-[10px] text-rose-700 dark:text-rose-300">{csvError}</p>}
          </div>
        </div>
      </div>

      {/* How to replace */}
      <div className="card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          REPLACING THE SURROGATE
        </h3>
        <HeadingNote>Model integration guide</HeadingNote>
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
            LIMITATIONS
          </h3>
          <HeadingNote>Known research boundaries</HeadingNote>
        </div>

        <ul className="text-xs font-sans text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
          <li><strong>Surrogate Model:</strong> In-browser model is an honest linear ridge surrogate with lag features.</li>
          <li><strong>Wetness Advisory:</strong> The temperature, humidity, and wetness proxy is a scouting cue only. It is not a diagnosis, is not crop-specific, and does not control irrigation.</li>
          <li><strong>Field Calibration:</strong> The scenario dry threshold is not calibrated to a crop stage, soil texture, root depth, field capacity, or permanent wilting point.</li>
          <li><strong>Spatial Coverage:</strong> The field-twin plots visualise one incoming time series; they are not twelve independently installed field sensors.</li>
          <li><strong>Reanalysis Resolution:</strong> ERA5-Land gridded at ~9 km resolution.</li>
          <li><strong>Exchangeability:</strong> Conformal prediction assumes exchangeable validation residuals.</li>
          <li><strong>Software-Only:</strong> Digital twin prototype without physical IoT relay hardware.</li>
        </ul>
      </div>
    </div>
  );
};

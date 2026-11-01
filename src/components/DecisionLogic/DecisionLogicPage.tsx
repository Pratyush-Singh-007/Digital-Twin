import React, { useMemo } from 'react';
import type { WeatherDataPoint, PestRiskParams } from '../../types';
import { SurrogateModel } from '../../model/surrogate';
import { computePestRisk } from '../../agronomy/pestRisk';
import { evaluateDecision } from '../../decision/rules';
import {
  GitBranch,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ArrowDown,
} from 'lucide-react';

interface Props {
  cleanData: WeatherDataPoint[];
  corruptedData: (WeatherDataPoint | null)[];
  corruptedIndices: Set<number>;
  epsilon: number;
  setEpsilon: (e: number) => void;
  dryThreshold: number;
  setDryThreshold: (t: number) => void;
  pestParams: PestRiskParams;
}

export const DecisionLogicPage: React.FC<Props> = ({
  cleanData,
  corruptedData,
  epsilon,
  setEpsilon,
  dryThreshold,
  setDryThreshold,
  pestParams,
}) => {
  const surrogate = useMemo(() => {
    const model = new SurrogateModel();
    if (cleanData.length > 24) {
      model.train(cleanData);
    }
    return model;
  }, [cleanData]);

  const currentWindow = useMemo(() => corruptedData.slice(-24), [corruptedData]);
  const currentPrediction = useMemo(() => surrogate.predict(currentWindow), [surrogate, currentWindow]);
  const currentPestRisk = useMemo(() => computePestRisk(currentWindow, pestParams), [currentWindow, pestParams]);

  const latestMoisture = useMemo(() => {
    for (let i = currentWindow.length - 1; i >= 0; i--) {
      const pt = currentWindow[i];
      if (pt !== null) return pt.soilMoisture;
    }
    return 0.28;
  }, [currentWindow]);

  const liveDecision = useMemo(() => {
    return evaluateDecision(latestMoisture, currentPrediction, currentPestRisk, {
      dryThreshold,
      epsilon,
      pestThreshold: 0.70,
    });
  }, [latestMoisture, currentPrediction, currentPestRisk, dryThreshold, epsilon]);

  const currentUncertainty = currentPrediction.upper - currentPrediction.lower;
  const isRule3Active = liveDecision.ruleFired === 3;
  const isRule2Active = liveDecision.ruleFired === 2;
  const isRule1Active = liveDecision.ruleFired === 1 && liveDecision.action === 'IRRIGATE';
  const isAdequateActive = liveDecision.ruleFired === 1 && liveDecision.action === 'SUSPENDED';

  const timelineHistory = useMemo(() => {
    if (corruptedData.length < 48) return [];
    const entries = [];
    const start = corruptedData.length - 48;

    for (let i = start; i < corruptedData.length; i++) {
      const window = corruptedData.slice(Math.max(0, i - 24), i + 1);
      const pred = surrogate.predict(window);
      const pest = computePestRisk(window, pestParams);

      let m = 0.28;
      for (let k = window.length - 1; k >= 0; k--) {
        if (window[k] !== null) {
          m = window[k]!.soilMoisture;
          break;
        }
      }

      const dec = evaluateDecision(m, pred, pest, {
        dryThreshold,
        epsilon,
        pestThreshold: 0.70,
      });

      const pt = cleanData[i] || { time: new Date().toISOString() };
      const date = new Date(pt.time);
      const timeLabel = `${date.getHours().toString().padStart(2, '0')}:00`;

      entries.push({
        hourIndex: i - start + 1,
        timeLabel,
        decision: dec,
      });
    }

    return entries;
  }, [corruptedData, cleanData, surrogate, pestParams, dryThreshold, epsilon]);

  return (
    <div className="space-y-5 font-mono">
      {/* Title */}
      <div className="card space-y-1">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-zinc-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            UNCERTAINTY-GATED DECISION PIPELINE
          </h2>
        </div>
        <p className="text-xs text-zinc-500 font-sans">
          Safety-first cascade: Rule 3 (Epistemic Safety Brake) is evaluated prior to agronomic moisture and pathogen checks.
        </p>
      </div>

      {/* Threshold controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">UNCERTAINTY LIMIT (ε):</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {(epsilon * 100).toFixed(1)}% m³/m³
            </span>
          </div>
          <input
            type="range"
            min="0.04"
            max="0.25"
            step="0.01"
            value={epsilon}
            onChange={(e) => setEpsilon(parseFloat(e.target.value))}
          />
          <p className="text-[10px] text-zinc-400 font-sans">
            Triggers Rule 3 (System Lock) whenever 90% confidence width exceeds ε.
          </p>
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">DRY THRESHOLD (θ):</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {(dryThreshold * 100).toFixed(1)}% m³/m³
            </span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.38"
            step="0.01"
            value={dryThreshold}
            onChange={(e) => setDryThreshold(parseFloat(e.target.value))}
          />
          <p className="text-[10px] text-zinc-400 font-sans">
            Moisture below this level is classified as soil moisture deficit.
          </p>
        </div>
      </div>

      {/* Flowchart */}
      <div className="card space-y-4">
        <div className="text-xs font-bold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          DECISION TREE EVALUATION (ACTIVE LIVE STATE MARKED)
        </div>

        <div className="max-w-xl mx-auto flex flex-col items-center space-y-3 py-2 text-xs">
          {/* Node 0 */}
          <div className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
            [INPUT] Telemetry Window (24h) + Split-Conformal Interval
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-400" />

          {/* Gate 1 */}
          <div className="w-full p-3 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-center">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">GATE 1: EPISTEMIC UNCERTAINTY</div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              IS INTERVAL WIDTH &gt;= ε ?
            </div>
            <div className="text-[10px] text-zinc-500">
              Current: {(currentUncertainty * 100).toFixed(1)}% vs Limit ε: {(epsilon * 100).toFixed(1)}%
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded border transition-colors ${
                isRule3Active
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                RULE 3 (YES): LOCKED
              </div>
              <p className="text-[10px] font-sans text-zinc-600 dark:text-zinc-400 mt-1">
                Disengage autonomous pump. Escalate to human supervisor.
              </p>
              {isRule3Active && (
                <div className="text-[10px] font-bold text-rose-600 mt-1">
                  ● LIVE ACTIVE STATE
                </div>
              )}
            </div>

            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] flex flex-col justify-center text-zinc-500">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">[NO: PROCEED]</span>
              <span className="font-sans mt-0.5">Telemetry uncertainty within acceptable bound.</span>
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-400" />

          {/* Gate 2 */}
          <div className="w-full p-3 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-center">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">GATE 2: AGRONOMIC MOISTURE</div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              IS SOIL MOISTURE &lt; DRY THRESHOLD?
            </div>
            <div className="text-[10px] text-zinc-500">
              Current: {(latestMoisture * 100).toFixed(1)}% vs Threshold: {(dryThreshold * 100).toFixed(1)}%
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded border transition-colors ${
                isAdequateActive
                  ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                HOLD: ADEQUATE
              </div>
              <p className="text-[10px] font-sans text-zinc-600 dark:text-zinc-400 mt-1">
                Moisture is sufficient. Conserve water.
              </p>
              {isAdequateActive && (
                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  ● LIVE ACTIVE STATE
                </div>
              )}
            </div>

            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] flex flex-col justify-center text-zinc-500">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">[YES: SOIL DRY]</span>
              <span className="font-sans mt-0.5">Water deficit detected. Check pathogen risk.</span>
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-400" />

          {/* Gate 3 */}
          <div className="w-full p-3 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-center">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">GATE 3: PATHOGEN CONFLICT</div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              IS LATE BLIGHT RISK &gt; 0.70?
            </div>
            <div className="text-[10px] text-zinc-500">
              Current Risk: {(currentPestRisk.score * 100).toFixed(0)}% vs Critical: 70%
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded border transition-colors ${
                isRule2Active
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                RULE 2 (YES): SUSPENDED
              </div>
              <p className="text-[10px] font-sans text-zinc-600 dark:text-zinc-400 mt-1">
                Soil is dry, but irrigation suspended to prevent blight outbreak.
              </p>
              {isRule2Active && (
                <div className="text-[10px] font-bold text-amber-600 mt-1">
                  ● LIVE ACTIVE STATE
                </div>
              )}
            </div>

            <div
              className={`p-3 rounded border transition-colors ${
                isRule1Active
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RULE 1 (NO): IRRIGATE
              </div>
              <p className="text-[10px] font-sans text-zinc-600 dark:text-zinc-400 mt-1">
                Confident, soil dry, pest danger clear. Safe to irrigate.
              </p>
              {isRule1Active && (
                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                  ● LIVE ACTIVE STATE
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 48-Hour Decision Timeline */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              48-HOUR DECISION AUDIT TIMELINE
            </h3>
            <p className="text-[10px] text-zinc-500">
              Hourly audit trail of rule triggers based on historical telemetry
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block" /> IRRIGATE (R1)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs inline-block" /> SUSPENDED (R2)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs inline-block" /> LOCKED (R3)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-zinc-300 dark:bg-zinc-700 rounded-xs inline-block" /> HOLD
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 sm:grid-cols-24 lg:grid-cols-48 gap-0.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
          {timelineHistory.map((entry, idx) => {
            const dec = entry.decision;
            let bgColor = 'bg-zinc-300 dark:bg-zinc-700';
            if (dec.action === 'LOCKED') bgColor = 'bg-rose-500';
            else if (dec.action === 'SUSPENDED' && dec.ruleFired === 2) bgColor = 'bg-amber-500';
            else if (dec.action === 'IRRIGATE') bgColor = 'bg-emerald-500';

            return (
              <div
                key={`timeline-${idx}`}
                title={`t=${entry.timeLabel}: ${dec.action} (Rule ${dec.ruleFired})`}
                className={`h-6 rounded-xs cursor-pointer ${bgColor}`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>T-48H</span>
          <span>CURRENT HOUR</span>
        </div>
      </div>
    </div>
  );
};

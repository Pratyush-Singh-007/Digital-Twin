import React, { useState } from 'react';
import type { WeatherDataPoint, SimulationResult, DropoutSweepPoint } from '../../types';
import { runSeasonSimulation, runDropoutSweep } from '../../sim/seasonRunner';
import { DEFAULT_DECISION_CONFIG } from '../../decision/rules';
import { DEFAULT_PEST_PARAMS } from '../../agronomy/pestRisk';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Play, RotateCw } from 'lucide-react';

interface Props {
  cleanData: WeatherDataPoint[];
}

export const SeasonSimPage: React.FC<Props> = ({ cleanData }) => {
  const [dropoutRate, setDropoutRate] = useState<number>(0.2);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepPoints, setSweepPoints] = useState<DropoutSweepPoint[] | null>(null);

  const handleRunSimulation = () => {
    setIsRunning(true);
    setProgress(20);

    setTimeout(() => {
      setProgress(60);
      setTimeout(() => {
        const res = runSeasonSimulation(cleanData, {
          days: 90,
          dropoutRate,
          decisionConfig: DEFAULT_DECISION_CONFIG,
          pestParams: DEFAULT_PEST_PARAMS,
        });
        setSimResult(res);
        setProgress(100);
        setIsRunning(false);
      }, 100);
    }, 100);
  };

  const handleRunSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      const sweep = runDropoutSweep(cleanData, {
        days: 90,
        decisionConfig: DEFAULT_DECISION_CONFIG,
        pestParams: DEFAULT_PEST_PARAMS,
      });
      setSweepPoints(sweep);
      setIsSweeping(false);
    }, 200);
  };

  const errorChartData = simResult
    ? [
        {
          name: 'Pest Vector Contamination',
          blind: simResult.blindFarm.pestIrrigationErrors,
          gated: simResult.gatedFarm.pestIrrigationErrors,
        },
        {
          name: 'False Wet Over-watering',
          blind: simResult.blindFarm.overwaterErrors,
          gated: simResult.gatedFarm.overwaterErrors,
        },
        {
          name: 'False Dry Under-watering',
          blind: simResult.blindFarm.underwaterErrors,
          gated: simResult.gatedFarm.underwaterErrors,
        },
      ]
    : [];

  return (
    <div className="space-y-5 font-mono">
      {/* Control Card */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              90-DAY PARALLEL TWIN SEASON EXPERIMENT
            </h2>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
              Identical weather & sensor corruption applied to Confidence-Blind vs Uncertainty-Gated Twin.
            </p>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={isRunning || isSweeping}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-3 h-3 animate-spin" />
                SIMULATING ({progress}%)...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                RUN SEASON SIMULATION
              </>
            )}
          </button>
        </div>

        {/* Dropout Slider */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">CORRUPTION LEVEL:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round(dropoutRate * 100)}% DROPOUT
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={dropoutRate}
              disabled={isRunning}
              onChange={(e) => setDropoutRate(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0% [CLEAN]</span>
              <span>20% [MODERATE]</span>
              <span>40% [SEVERE]</span>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>PROCESSING 2,160 HOURLY STEPS...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded overflow-hidden">
                <div
                  className="bg-zinc-900 dark:bg-white h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {simResult && (
        <div className="space-y-5">
          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blind Farm */}
            <div className="card border-l-2 border-l-rose-500 space-y-3">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                  [POLICY A] CONFIDENCE-BLIND FARM
                </span>
                <span className="text-[10px] text-zinc-400">STANDARD POINT ML</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 uppercase">CATASTROPHIC ERRORS</div>
                  <div className="text-2xl font-bold font-mono text-rose-600 mt-0.5">
                    {simResult.blindFarm.totalErrors}
                  </div>
                  <div className="text-[9px] text-zinc-500">Control failures</div>
                </div>

                <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 uppercase">WATER CONSUMED</div>
                  <div className="text-xl font-bold font-mono mt-0.5">
                    {(simResult.blindFarm.waterUsedLitresHa / 1000).toLocaleString()} kL
                  </div>
                  <div className="text-[9px] text-zinc-500">Per hectare</div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-sans border-t border-zinc-100 dark:border-zinc-800 pt-2">
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Blight Contaminations:</span>
                  <strong className="text-rose-600">{simResult.blindFarm.pestIrrigationErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Over-watering False Dry:</span>
                  <strong className="text-rose-600">{simResult.blindFarm.overwaterErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Under-watering Deficit:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{simResult.blindFarm.underwaterErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Human Escalations:</span>
                  <strong className="text-zinc-400">0 (Silent failures)</strong>
                </div>
              </div>
            </div>

            {/* Gated Farm */}
            <div className="card border-l-2 border-l-emerald-500 space-y-3">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  [POLICY B] UNCERTAINTY-GATED TWIN
                </span>
                <span className="text-[10px] text-zinc-400">RULES 1–3 ARCHITECTURE</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 uppercase">CATASTROPHIC ERRORS</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
                    {simResult.gatedFarm.totalErrors}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-bold">
                    {simResult.blindFarm.totalErrors > 0
                      ? `-${Math.round(
                          ((simResult.blindFarm.totalErrors - simResult.gatedFarm.totalErrors) /
                            simResult.blindFarm.totalErrors) *
                            100,
                        )}% ELIMINATED`
                      : '0 ERRORS'}
                  </div>
                </div>

                <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 uppercase">WATER CONSUMED</div>
                  <div className="text-xl font-bold font-mono mt-0.5">
                    {(simResult.gatedFarm.waterUsedLitresHa / 1000).toLocaleString()} kL
                  </div>
                  <div className="text-[9px] text-zinc-500">Per hectare</div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-sans border-t border-zinc-100 dark:border-zinc-800 pt-2">
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Blight Contaminations:</span>
                  <strong className="text-emerald-600">{simResult.gatedFarm.pestIrrigationErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Over-watering False Dry:</span>
                  <strong className="text-emerald-600">{simResult.gatedFarm.overwaterErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Under-watering Deficit:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{simResult.gatedFarm.underwaterErrors}</strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>• Human Escalations:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{simResult.gatedFarm.manualReviews} REVIEWS</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card space-y-3">
            <div className="text-xs font-bold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              ERROR TYPE DISTRIBUTION (SIDE-BY-SIDE)
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#71717a20" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '4px',
                      color: '#fafafa',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="blind" name="BLIND FARM" fill="#f43f5e" />
                  <Bar dataKey="gated" name="GATED TWIN" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">EVALUATION METRIC</th>
                  <th className="py-2.5 px-3 text-rose-600">CONFIDENCE-BLIND</th>
                  <th className="py-2.5 px-3 text-emerald-600">UNCERTAINTY-GATED</th>
                  <th className="py-2.5 px-3">DELTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 font-sans">Blight Contaminations (Risk &gt; 0.70)</td>
                  <td className="py-2 px-3 text-rose-600 font-bold">{simResult.blindFarm.pestIrrigationErrors}</td>
                  <td className="py-2 px-3 text-emerald-600 font-bold">{simResult.gatedFarm.pestIrrigationErrors}</td>
                  <td className="py-2 px-3 text-emerald-600">
                    -{simResult.blindFarm.pestIrrigationErrors - simResult.gatedFarm.pestIrrigationErrors} eliminated
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Over-watering on Corrupted False Dry</td>
                  <td className="py-2 px-3 text-rose-600 font-bold">{simResult.blindFarm.overwaterErrors}</td>
                  <td className="py-2 px-3 text-emerald-600 font-bold">{simResult.gatedFarm.overwaterErrors}</td>
                  <td className="py-2 px-3 text-emerald-600">
                    -{simResult.blindFarm.overwaterErrors - simResult.gatedFarm.overwaterErrors} eliminated
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Under-watering Parched Soil</td>
                  <td className="py-2 px-3">{simResult.blindFarm.underwaterErrors}</td>
                  <td className="py-2 px-3">{simResult.gatedFarm.underwaterErrors}</td>
                  <td className="py-2 px-3 text-zinc-500">
                    {simResult.blindFarm.underwaterErrors - simResult.gatedFarm.underwaterErrors}
                  </td>
                </tr>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 font-bold">
                  <td className="py-2 px-3 font-sans">TOTAL CONTROL FAILURES</td>
                  <td className="py-2 px-3 text-rose-600">{simResult.blindFarm.totalErrors}</td>
                  <td className="py-2 px-3 text-emerald-600">{simResult.gatedFarm.totalErrors}</td>
                  <td className="py-2 px-3 text-emerald-600">
                    -{simResult.blindFarm.totalErrors - simResult.gatedFarm.totalErrors} avoided
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Water Volume Used</td>
                  <td className="py-2 px-3">{(simResult.blindFarm.waterUsedLitresHa / 1000).toLocaleString()} kL/ha</td>
                  <td className="py-2 px-3">{(simResult.gatedFarm.waterUsedLitresHa / 1000).toLocaleString()} kL/ha</td>
                  <td className="py-2 px-3 text-zinc-500">
                    {Math.round(
                      ((simResult.blindFarm.waterUsedLitresHa - simResult.gatedFarm.waterUsedLitresHa) /
                        (simResult.blindFarm.waterUsedLitresHa || 1)) *
                        100,
                    )}% conserved
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Human Operator Reviews</td>
                  <td className="py-2 px-3 text-zinc-400">0</td>
                  <td className="py-2 px-3 font-bold text-zinc-900 dark:text-zinc-100">{simResult.gatedFarm.manualReviews}</td>
                  <td className="py-2 px-3 text-zinc-500">Safety escalation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sweep */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              DROPOUT SENSITIVITY SWEEP (10% TO 40%)
            </h3>
            <p className="text-[10px] text-zinc-500">
              Observe failure rate divergence as telemetry quality degrades
            </p>
          </div>

          <button
            onClick={handleRunSweep}
            disabled={isSweeping || isRunning}
            className="btn btn-secondary btn-sm text-[11px]"
          >
            {isSweeping ? 'SWEEPING...' : 'RUN DROPOUT SWEEP'}
          </button>
        </div>

        {sweepPoints ? (
          <div className="space-y-3">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sweepPoints} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#71717a20" vertical={false} />
                  <XAxis dataKey="dropoutRate" unit="%" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '4px',
                      color: '#fafafa',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="blindErrors" name="BLIND FARM" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gatedErrors" name="GATED TWIN" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 text-[11px] text-zinc-400">
            Click "RUN DROPOUT SWEEP" to evaluate error curves across 10%, 20%, 30%, and 40% noise levels.
          </div>
        )}
      </div>
    </div>
  );
};

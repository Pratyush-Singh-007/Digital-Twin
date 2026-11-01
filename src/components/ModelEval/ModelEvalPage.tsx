import React, { useMemo } from 'react';
import type { WeatherDataPoint } from '../../types';
import { SurrogateModel } from '../../model/surrogate';
import { applyCorruption } from '../../data/corruptionInjector';
import { runSeasonSimulation } from '../../sim/seasonRunner';
import { DEFAULT_DECISION_CONFIG } from '../../decision/rules';
import { DEFAULT_PEST_PARAMS } from '../../agronomy/pestRisk';
import { evaluateAgronomicRuleScenarios } from '../../agronomy/riskValidation';
import { HeadingNote } from '../HeadingNote';

interface Props {
  cleanData: WeatherDataPoint[];
}

export const ModelEvalPage: React.FC<Props> = ({ cleanData }) => {
  const surrogate = useMemo(() => {
    const model = new SurrogateModel();
    if (cleanData.length >= 64) {
      model.train(cleanData.slice(0, Math.max(32, Math.floor(cleanData.length * 0.5))));
    }
    return model;
  }, [cleanData]);

  const baselineMetrics = useMemo(() => {
    return surrogate.getMetrics();
  }, [surrogate]);

  const robustnessData = useMemo(() => {
    if (cleanData.length < 64) return [];
    const testSlice = cleanData.slice(Math.floor(cleanData.length * 0.5));
    const scenarios = [
      ...[0, 0.1, 0.2, 0.3, 0.4].map((rate) => ({ name: `${Math.round(rate * 100)}% dropout`, rate, heat: false, drought: false })),
      { name: 'Heat shock (+15°C)', rate: 0, heat: true, drought: false },
      { name: 'Drought shock (−60%)', rate: 0, heat: false, drought: true },
      { name: 'Combined 30% + heat + drought', rate: 0.3, heat: true, drought: true },
    ];
    return scenarios.map((scenario, scenarioIndex) => {
      const stressData = applyCorruption(testSlice, scenario.rate, scenario.heat, scenario.drought, 7400 + scenarioIndex);
      let covered = 0;
      let widthSum = 0;
      let absoluteError = 0;
      let count = 0;

      for (let i = 24; i < stressData.data.length; i++) {
        const affectedWindow = stressData.corruptedIndices.size === 0 ||
          Array.from(stressData.corruptedIndices).some((index) => index >= i - 24 && index <= i);
        if (!affectedWindow) continue;
        const window = stressData.data.slice(i - 24, i);
        const actual = testSlice[i].soilMoisture;
        const pred = surrogate.predict(window);

        if (actual >= pred.lower && actual <= pred.upper) {
          covered++;
        }
        widthSum += pred.upper - pred.lower;
        absoluteError += Math.abs(actual - pred.mean);
        count++;
      }
      return {
        name: scenario.name,
        picp: count ? Number((covered / count * 100).toFixed(1)) : 0,
        mpiw: count ? Number((widthSum / count * 100).toFixed(2)) : 0,
        mae: count ? Number((absoluteError / count * 100).toFixed(2)) : 0,
        count,
      };
    });
  }, [cleanData, surrogate]);

  const agronomicChecks = useMemo(() => evaluateAgronomicRuleScenarios(), []);

  const utilitySummary = useMemo(() => {
    if (cleanData.length < 108) return null;
    return runSeasonSimulation(cleanData, {
      days: 90,
      dropoutRate: 0.2,
      decisionConfig: DEFAULT_DECISION_CONFIG,
      pestParams: DEFAULT_PEST_PARAMS,
      seed: 2026,
    });
  }, [cleanData]);

  return (
    <div className="space-y-5 font-mono">
      <div className="card space-y-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          MODEL EVALUATION
        </h2>
        <HeadingNote>Accuracy and safety</HeadingNote>
        <p className="text-xs text-zinc-500 font-sans">
          Computed live from in-browser split-conformal calibration residuals and operational test episodes.
        </p>
      </div>

      {/* 3 Experiment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Exp 1 */}
        <div className="card space-y-3">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1.5 flex justify-between">
            <div><span className="font-bold text-xs uppercase">EXP 1: ACCURACY</span><HeadingNote>Prediction error</HeadingNote></div>
            <span className="text-[10px] text-zinc-400">CLEAN DATA</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="text-[9px] text-zinc-400">MAE</div>
              <div className="text-base font-bold mt-0.5">{(baselineMetrics.mae * 100).toFixed(2)}%</div>
            </div>
            <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="text-[9px] text-zinc-400">RMSE</div>
              <div className="text-base font-bold mt-0.5">{(baselineMetrics.rmse * 100).toFixed(2)}%</div>
            </div>
            <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="text-[9px] text-zinc-400">R²</div>
              <div className="text-base font-bold mt-0.5">{baselineMetrics.r2.toFixed(3)}</div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-2 font-mono">
            <div className="flex justify-between">
              <span>SAMPLES (N):</span>
              <span className="text-zinc-800 dark:text-zinc-200">{baselineMetrics.n}</span>
            </div>
            <div className="flex justify-between">
              <span>ALGORITHM:</span>
              <span className="text-zinc-800 dark:text-zinc-200">RIDGE L2 (λ=1.0)</span>
            </div>
          </div>
        </div>

        {/* Exp 2 */}
        <div className="card space-y-3">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1.5 flex justify-between">
            <div><span className="font-bold text-xs uppercase" title="Conformal prediction creates intervals calibrated against held-out residuals.">EXP 2: CONFORMAL</span><HeadingNote>Interval calibration</HeadingNote></div>
            <span className="text-[10px] text-zinc-400">ALPHA = 0.10</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="text-[9px] text-zinc-400">CLEAN COVERAGE</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">
                {(baselineMetrics.picp * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="text-[9px] text-zinc-400">MEAN WIDTH</div>
              <div className="text-base font-bold mt-0.5">
                {(baselineMetrics.mpiw * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-2 font-mono">
            <div className="flex justify-between">
              <span>TARGET COVERAGE:</span>
              <span className="text-zinc-800 dark:text-zinc-200">90.0% (1-α)</span>
            </div>
            <div className="flex justify-between">
              <span>SCORE TYPE:</span>
              <span className="text-zinc-800 dark:text-zinc-200">|y - ŷ|</span>
            </div>
          </div>
        </div>

        {/* Exp 3 */}
        <div className="card space-y-3">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1.5 flex justify-between">
            <div><span className="font-bold text-xs uppercase">EXP 3: UTILITY</span><HeadingNote>Farm outcomes</HeadingNote></div>
            <span className="text-[10px] text-zinc-400">20% CORRUPTION</span>
          </div>

          {utilitySummary && (
            <div className="space-y-2">
              <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="text-[9px] text-zinc-400 uppercase">FAILURE REDUCTION</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">
                  {utilitySummary.blindFarm.totalErrors > 0
                    ? `${Math.round(
                        ((utilitySummary.blindFarm.totalErrors - utilitySummary.gatedFarm.totalErrors) /
                          utilitySummary.blindFarm.totalErrors) *
                          100,
                      )}% REDUCTION`
                    : '100%'}
                </div>
                <div className="text-[9px] text-zinc-500 font-sans">
                  {utilitySummary.blindFarm.totalErrors} errors (blind) → {utilitySummary.gatedFarm.totalErrors} (gated)
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 space-y-1 pt-1 font-mono">
                <div className="flex justify-between">
                  <span>WATER DELTA:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {Math.round(
                      ((utilitySummary.blindFarm.waterUsedLitresHa - utilitySummary.gatedFarm.waterUsedLitresHa) /
                        (utilitySummary.blindFarm.waterUsedLitresHa || 1)) *
                        100,
                    )}% conserved
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>OPERATOR ESCALATIONS:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{utilitySummary.gatedFarm.manualReviews}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Robustness scenarios */}
      <div className="card space-y-3">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            ROBUSTNESS EXPERIMENTS · HELD-OUT TEST PERIOD
          </h3>
          <HeadingNote>Stress test results</HeadingNote>
          <p className="text-[11px] text-zinc-500 font-sans">
            One fixed seed per scenario; reports only windows touched by injected corruption. PICP is empirical test coverage, not a guarantee under distribution shift.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[11px]">
            <thead className="text-zinc-500"><tr><th className="py-2">SCENARIO</th><th>WINDOWS</th><th>PICP</th><th>MPIW</th><th>MAE</th></tr></thead>
            <tbody>{robustnessData.map((row) => <tr key={row.name} data-testid="robustness-row" className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="py-2 font-semibold">{row.name}</td><td>{row.count}</td><td>{row.picp.toFixed(1)}%</td><td>{row.mpiw.toFixed(2)} pp</td><td>{row.mae.toFixed(2)} pp</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-3" data-testid="agronomic-validation">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider">AGRONOMIC RULE CHECKS</h3>
          <HeadingNote title="Constructed profiles test expected rule behavior, not disease prediction accuracy.">Expected safety behavior</HeadingNote>
          <p className="text-[11px] text-zinc-500 font-sans">Constructed hourly profiles check expected behavior of the encoded thresholds. This is a logic check, not field or disease-prediction validation.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {agronomicChecks.map((check) => <div key={check.name} className="flex items-center justify-between gap-3 rounded border border-zinc-100 dark:border-zinc-800 p-2 text-[11px]">
            <div><div className="font-semibold">{check.name}</div><div className="text-zinc-500">{check.explanation}</div><div className="mt-1 text-zinc-400">Expected {check.expectedActive ? 'active' : 'inactive'} · score {(check.score * 100).toFixed(0)}%</div></div>
            <span className={check.passed ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>{check.passed ? 'PASS' : 'FAIL'}</span>
          </div>)}
        </div>
        <div className="text-[10px] text-zinc-500">{agronomicChecks.filter((check) => check.passed).length}/{agronomicChecks.length} constructed scenarios match the configured rule expectations.</div>
      </div>
    </div>
  );
};

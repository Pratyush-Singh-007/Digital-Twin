import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import type { WeatherDataPoint } from '../../types';

interface Props {
  dropoutRate: number;
  setDropoutRate: (rate: number) => void;
  heatSpike: boolean;
  setHeatSpike: (val: boolean | ((prev: boolean) => boolean)) => void;
  droughtShock: boolean;
  setDroughtShock: (val: boolean | ((prev: boolean) => boolean)) => void;
  onReset: () => void;
  corruptedData: (WeatherDataPoint | null)[];
  corruptedIndices: Set<number>;
  totalCount: number;
}

export const SensorNoisePanel: React.FC<Props> = ({
  dropoutRate,
  setDropoutRate,
  heatSpike,
  setHeatSpike,
  droughtShock,
  setDroughtShock,
  onReset,
  corruptedData,
  corruptedIndices,
  totalCount,
}) => {
  const stripLength = 48;
  const startIndex = Math.max(0, corruptedData.length - stripLength);
  const telemetryWindow = corruptedData.slice(startIndex);

  const corruptedInWindow = telemetryWindow.filter(
    (pt, i) => pt === null || corruptedIndices.has(startIndex + i),
  ).length;

  const corruptionPercent = Math.round((corruptedInWindow / stripLength) * 100);

  return (
    <div className="card space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            SENSOR TELEMETRY INJECTOR
          </h3>
          <p className="text-[10px] text-zinc-500">
            Inject packet drops & synthetic anomalies into input stream
          </p>
        </div>

        <button
          onClick={onReset}
          className="btn btn-secondary btn-sm text-[10px] flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> RESET
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <label className="text-zinc-600 dark:text-zinc-400">
            DROPOUT PROBABILITY:
          </label>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {Math.round(dropoutRate * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="0.4"
          step="0.02"
          value={dropoutRate}
          onChange={(e) => setDropoutRate(parseFloat(e.target.value))}
        />

        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>0% [CLEAN]</span>
          <span>10%</span>
          <span>20%</span>
          <span>30%</span>
          <span>40% [SEVERE]</span>
        </div>
      </div>

      {/* Extreme Event Toggles */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => setHeatSpike((prev) => !prev)}
          className={`btn btn-sm text-[11px] justify-between border ${
            heatSpike
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
              : 'btn-secondary'
          }`}
        >
          <span>HEAT SPIKE (+15°C)</span>
          <span className={`w-1.5 h-1.5 rounded-full ${heatSpike ? 'bg-amber-400' : 'bg-zinc-400'}`} />
        </button>

        <button
          onClick={() => setDroughtShock((prev) => !prev)}
          className={`btn btn-sm text-[11px] justify-between border ${
            droughtShock
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
              : 'btn-secondary'
          }`}
        >
          <span>DROUGHT SHOCK (-60%)</span>
          <span className={`w-1.5 h-1.5 rounded-full ${droughtShock ? 'bg-rose-500' : 'bg-zinc-400'}`} />
        </button>
      </div>

      {/* Hardware Telemetry Strip */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>TELEMETRY PACKET MAP (LAST 48H)</span>
          <span>{corruptedInWindow}/48 DROPPED ({corruptionPercent}%)</span>
        </div>

        <div className="grid grid-cols-24 sm:grid-cols-48 gap-0.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
          {telemetryWindow.map((pt, i) => {
            const isDropped = pt === null || corruptedIndices.has(startIndex + i);
            return (
              <div
                key={`telemetry-${i}`}
                title={`t-${stripLength - i}h: ${isDropped ? 'PACKET CORRUPTED/DROPPED' : 'VALID'}`}
                className={`h-3 rounded-xs transition-colors ${
                  isDropped
                    ? 'bg-rose-500 hover:bg-rose-400'
                    : 'bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-600 dark:hover:bg-zinc-400'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-zinc-800 dark:bg-zinc-200 inline-block" /> VALID TELEMETRY
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" /> DROPPED / FAULT
          </span>
        </div>
      </div>
    </div>
  );
};

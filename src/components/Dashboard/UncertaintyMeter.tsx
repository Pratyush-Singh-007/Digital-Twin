import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { HeadingNote } from '../HeadingNote';

interface Props {
  intervalWidth: number;
  epsilon: number;
  setEpsilon: (val: number) => void;
}

export const UncertaintyMeter: React.FC<Props> = ({
  intervalWidth,
  epsilon,
  setEpsilon,
}) => {
  const isOverThreshold = intervalWidth >= epsilon;
  const ratio = Math.min(1.5, intervalWidth / epsilon);
  const barPercent = Math.min(100, (intervalWidth / 0.30) * 100);
  const epsilonPercent = Math.min(100, (epsilon / 0.30) * 100);

  return (
    <div className="card space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            UNCERTAINTY SAFETY BRAKE (ε)
          </h3>
          <HeadingNote title="ε is the maximum permitted prediction interval width.">Prediction range vs limit</HeadingNote>
          <p className="text-[10px] text-zinc-500">
            Split-conformal prediction interval width vs threshold
          </p>
        </div>

        {isOverThreshold ? (
          <span className="badge badge-red flex items-center gap-1 text-[10px]">
            <ShieldAlert className="w-3 h-3" /> BRAKE ENGAGED
          </span>
        ) : (
          <span className="badge badge-green flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> SAFE RANGE
          </span>
        )}
      </div>

      {/* Main Readout */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="text-[10px] uppercase text-zinc-400">NOMINAL 90% INTERVAL WIDTH</div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${isOverThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {(intervalWidth * 100).toFixed(1)}%
            <span className="text-xs font-normal text-zinc-400 ml-1.5 font-sans">
              (±{((intervalWidth / 2) * 100).toFixed(1)}% m³/m³)
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase text-zinc-400">LIMIT THRESHOLD (ε)</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {(epsilon * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1">
        <div className="relative w-full h-3 bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <div
            className={`h-full transition-all duration-200 ${
              isOverThreshold
                ? 'bg-rose-500'
                : intervalWidth > epsilon * 0.8
                ? 'bg-amber-500'
                : 'bg-zinc-800 dark:bg-zinc-200'
            }`}
            style={{ width: `${barPercent}%` }}
          />

          {/* Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-white z-10"
            style={{ left: `${epsilonPercent}%` }}
            title={`Threshold: ${(epsilon * 100).toFixed(1)}%`}
          />
        </div>

        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>0.0%</span>
          <span>CAPACITY RATIO: {(ratio * 100).toFixed(0)}%</span>
          <span>MAX SCALE: 30.0%</span>
        </div>
      </div>

      {/* Threshold Slider */}
      <div className="space-y-1 pt-1 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center text-xs">
          <label className="text-zinc-600 dark:text-zinc-400">ADJUST THRESHOLD ε:</label>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {(epsilon * 100).toFixed(1)}%
          </span>
        </div>

        <input
          data-testid="dashboard-uncertainty-limit"
          aria-label="Dashboard uncertainty limit"
          type="range"
          min="0.04"
          max="0.25"
          step="0.01"
          value={epsilon}
          onChange={(e) => setEpsilon(parseFloat(e.target.value))}
        />

        <p className="text-[10px] text-zinc-500 pt-0.5 font-sans">
          {isOverThreshold
            ? 'Actuators LOCKED by the uncertainty threshold. Manual review is required.'
            : 'Interval width is below the configured threshold. Soil and pathogen rules still gate irrigation.'}
        </p>
      </div>
    </div>
  );
};

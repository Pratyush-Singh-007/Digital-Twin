import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X, Check } from 'lucide-react';
import type { PestRiskResult, PestRiskParams } from '../../types';
import { HeadingNote } from '../HeadingNote';

interface Props {
  pestRisk: PestRiskResult;
  params: PestRiskParams;
  onParamsChange: (params: PestRiskParams) => void;
  compact?: boolean;
}

export const PestRiskGauge: React.FC<Props> = ({
  pestRisk,
  params,
  onParamsChange,
  compact = false,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [localParams, setLocalParams] = useState<PestRiskParams>(params);
  const [parameterError, setParameterError] = useState<string | null>(null);
  const formulaButtonRef = useRef<HTMLButtonElement>(null);
  const firstParameterRef = useRef<HTMLInputElement>(null);

  const closeSettings = () => {
    setShowModal(false);
    window.requestAnimationFrame(() => formulaButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!showModal) return;
    firstParameterRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSettings();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const score = Math.max(0, Math.min(1, pestRisk.score));
  const isDangerous = score >= 0.70;

  // Arc calculation for half-circle SVG (radius = 75, center = (100, 90))
  const angle = 180 - score * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = 100 + 60 * Math.cos(rad);
  const needleY = 90 - 60 * Math.sin(rad);

  // 0.70 threshold tick angle (54°)
  const tAngle = (54 * Math.PI) / 180;
  const tX1 = 100 + 68 * Math.cos(tAngle);
  const tY1 = 90 - 68 * Math.sin(tAngle);
  const tX2 = 100 + 82 * Math.cos(tAngle);
  const tY2 = 90 - 82 * Math.sin(tAngle);

  const handleSaveParams = () => {
    const values = Object.values(localParams);
    if (!values.every(Number.isFinite) || localParams.tempLow >= localParams.tempHigh || localParams.rhThreshold < 0 || localParams.rhThreshold > 100 || localParams.leafWetHours < 0 || localParams.leafWetHours > 24) {
      setParameterError('Use an ordered temperature range, humidity 0–100%, and wetness hours 0–24.');
      return;
    }
    setParameterError(null);
    onParamsChange(localParams);
    closeSettings();
  };

  const settingsDialog = showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div role="dialog" aria-modal="true" aria-labelledby="pest-dialog-title" className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-5 border border-zinc-300 dark:border-zinc-800 shadow-2xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div>
            <h3 id="pest-dialog-title" className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Microclimate advisory settings</h3>
            <HeadingNote>Wetness proxy inputs</HeadingNote>
          </div>
          <button aria-label="Close microclimate advisory settings" onClick={closeSettings} className="text-zinc-400 hover:text-zinc-900">
            [ESC]
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 font-sans">Score = 0.30 × TempWindow + 0.35 × HumidityWindow + 0.35 × LeafWetDuration.</p>
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Research wetness proxy only—not a diagnosis or crop-specific disease model. It does not control irrigation.</p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div><label className="text-[10px] text-zinc-400 block mb-0.5">TEMP MIN (°C)</label><input aria-label="Minimum temperature" data-testid="pest-temp-low" ref={firstParameterRef} type="number" value={localParams.tempLow} onChange={(e) => setLocalParams({ ...localParams, tempLow: Number(e.target.value) })} className="input-field" /></div>
          <div><label className="text-[10px] text-zinc-400 block mb-0.5">TEMP MAX (°C)</label><input aria-label="Maximum temperature" data-testid="pest-temp-high" type="number" value={localParams.tempHigh} onChange={(e) => setLocalParams({ ...localParams, tempHigh: Number(e.target.value) })} className="input-field" /></div>
          <div><label className="text-[10px] text-zinc-400 block mb-0.5">RH THRESHOLD (%)</label><input aria-label="Humidity threshold" data-testid="pest-rh-threshold" type="number" value={localParams.rhThreshold} onChange={(e) => setLocalParams({ ...localParams, rhThreshold: Number(e.target.value) })} className="input-field" /></div>
          <div><label className="text-[10px] text-zinc-400 block mb-0.5">CRITICAL HOURS (h)</label><input aria-label="Leaf wetness hours" data-testid="pest-leaf-wet-hours" type="number" value={localParams.leafWetHours} onChange={(e) => setLocalParams({ ...localParams, leafWetHours: Number(e.target.value) })} className="input-field" /></div>
        </div>

        {parameterError && <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-300">{parameterError}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800"><button onClick={closeSettings} className="btn btn-secondary btn-sm">CANCEL</button><button onClick={handleSaveParams} className="btn btn-primary btn-sm flex items-center gap-1"><Check className="w-3 h-3" /> APPLY</button></div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 font-mono">
        <div><div className="text-[9px] uppercase tracking-wider text-zinc-500">Microclimate wetness advisory</div><div className="mt-0.5 text-xs font-semibold text-zinc-100">{(score * 100).toFixed(0)}% <span className="font-normal text-zinc-400">· scout cue only</span></div></div>
        <button ref={formulaButtonRef} aria-haspopup="dialog" aria-expanded={showModal} onClick={() => { setLocalParams(params); setParameterError(null); setShowModal(true); }} className="rounded border border-white/15 px-2 py-1 text-[10px] text-zinc-200 hover:bg-zinc-800"><HelpCircle className="mr-1 inline h-3 w-3" /> FORMULA</button>
        {settingsDialog}
      </div>
    );
  }

  return (
    <div className="card space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            MICROCLIMATE WETNESS ADVISORY
          </h3>
          <HeadingNote title="A weather-only wetness proxy; it is not a crop-specific disease diagnosis.">Scouting cue</HeadingNote>
          <p className="text-[10px] text-zinc-500">
            Temperature, humidity, and leaf-wetness proxy for field scouting
          </p>
        </div>

        <button
          ref={formulaButtonRef}
          aria-haspopup="dialog"
          aria-expanded={showModal}
          onClick={() => {
            setLocalParams(params);
            setParameterError(null);
            setShowModal(true);
          }}
          className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3" /> FORMULA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Technical Vector Half-Circle Gauge */}
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 200 110" className="w-40 h-24 overflow-visible">
            {/* Background Track */}
            <path
              d="M 25 90 A 75 75 0 0 1 175 90"
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
              strokeLinecap="square"
            />

            {/* Value Track */}
            <path
              d="M 25 90 A 75 75 0 0 1 175 90"
              fill="none"
              stroke={isDangerous ? '#DC2626' : score >= 0.45 ? '#D97706' : 'var(--series-b)'}
              strokeWidth="10"
              strokeLinecap="square"
              strokeDasharray="235.6"
              strokeDashoffset={235.6 * (1 - score)}
              className="transition-all duration-300"
            />

            {/* 0.70 Critical Marker */}
            <line
              x1={tX1}
              y1={tY1}
              x2={tX2}
              y2={tY2}
              stroke="#71717A"
              strokeWidth="2.5"
            />

            {/* Needle */}
            <line
              x1="100"
              y1="90"
              x2={needleX}
              y2={needleY}
              stroke="currentColor"
              className="text-zinc-900 dark:text-white"
              strokeWidth="2"
            />
            <circle cx="100" cy="90" r="3.5" fill="currentColor" className="text-zinc-900 dark:text-white" />
          </svg>

          <div className="text-center mt-[-8px]">
            <div className={`text-xl font-bold font-mono ${isDangerous ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {(score * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-zinc-400">
              SCOUTING FLAG: 70% {isDangerous && <span className="text-rose-600 dark:text-rose-400 font-bold">• REVIEW CANOPY</span>}
            </div>
          </div>
        </div>

        {/* 3 Sub-scores */}
        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-zinc-500">TEMP WINDOW [{params.tempLow}–{params.tempHigh}°C]:</span>
              <span className="text-zinc-800 dark:text-zinc-200">{pestRisk.hoursInTempWindow}/24h</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded overflow-hidden">
              <div
                className="bg-zinc-800 dark:bg-zinc-200 h-full"
                style={{ width: `${pestRisk.tempScore * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-zinc-500">SUSTAINED RH &gt; {params.rhThreshold}%:</span>
              <span className="text-zinc-800 dark:text-zinc-200">{pestRisk.hoursHighHumidity}h</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded overflow-hidden">
              <div
                className="bg-zinc-800 dark:bg-zinc-200 h-full"
                style={{ width: `${pestRisk.humidityScore * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-zinc-500">LEAF WETNESS (DEW/RAIN):</span>
              <span className="text-zinc-800 dark:text-zinc-200">{pestRisk.hoursLeafWet}h</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded overflow-hidden">
              <div
                className="bg-zinc-800 dark:bg-zinc-200 h-full"
                style={{ width: `${pestRisk.leafWetnessScore * 100}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 pt-0.5">
            Advisory only: a high score prompts scouting; it does not gate irrigation.
          </div>
        </div>
      </div>

      {settingsDialog}
    </div>
  );
};

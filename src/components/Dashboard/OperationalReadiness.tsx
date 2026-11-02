import React from 'react';
import { AlertTriangle, CheckCircle2, Database, MapPinned, ShieldAlert } from 'lucide-react';
import type { DataSourceStatus, LocationPreset, WeatherDataPoint } from '../../types';

interface Props {
  dataSource: DataSourceStatus;
  location: LocationPreset;
  currentWindow: (WeatherDataPoint | null)[];
}

/** Makes the difference between an explanatory twin and field-ready control explicit. */
export const OperationalReadiness: React.FC<Props> = ({ dataSource, location, currentWindow }) => {
  const availableSamples = currentWindow.filter((point) => point !== null).length;
  const sourceText = dataSource === 'live'
    ? 'Open-Meteo weather and modelled 0–7 cm soil moisture'
    : dataSource === 'offline'
      ? 'Synthetic demonstration season'
      : 'Refreshing source data';

  return (
    <section data-testid="operational-readiness" className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-900 dark:text-zinc-100"><ShieldAlert className="h-4 w-4" /> Field-readiness check</div>
          <p className="mt-1 text-xs text-zinc-500">Useful for scenario review and supervisor training. It is not connected to field hardware or authorised to irrigate.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> Prototype only</span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <Database className="h-4 w-4 text-zinc-500" />
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Current input</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{sourceText}. This is not an installed in-field probe network.</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <MapPinned className="h-4 w-4 text-zinc-500" />
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Spatial confidence</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{availableSamples}/{currentWindow.length || 24} recent samples available. The displayed sensor zones are illustrative positions inferred from one time series, not independent probes at {location.name}.</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <CheckCircle2 className="h-4 w-4 text-zinc-500" />
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Before deployment</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">Calibrate field capacity and wilting point; install root-zone probes across management zones; set crop-stage thresholds; verify flow, uniformity, and actuator feedback.</p>
        </div>
      </div>

      <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-[11px] leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"><strong className="text-zinc-800 dark:text-zinc-200">Wetness signal:</strong> a scouting cue only. No crop-specific disease model is loaded, so it never triggers an irrigation command.</p>
    </section>
  );
};

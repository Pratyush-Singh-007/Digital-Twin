import React, { useMemo } from 'react';
import type { PestRiskResult, WeatherDataPoint } from '../../types';
import { HeadingNote } from '../HeadingNote';

interface Props {
  data: (WeatherDataPoint | null)[];
  moisture: number;
  uncertainty: number;
  pestRisk: PestRiskResult;
  dropoutRate: number;
}

/** Isometric, data-driven field view. Geometry and crop color respond to telemetry. */
export const FieldTwin3D: React.FC<Props> = ({ data, moisture, uncertainty, pestRisk, dropoutRate }) => {
  const cells = useMemo(() => {
    const valid = data.filter((point): point is WeatherDataPoint => point !== null).slice(-24);
    const cols = 7;
    const rows = 5;
    return Array.from({ length: cols * rows }, (_, index) => {
      const point = valid[index % Math.max(1, valid.length)];
      const value = point?.soilMoisture ?? moisture;
      const variation = Math.sin(index * 2.17) * 0.018;
      const cellMoisture = Math.max(0.05, Math.min(0.6, value + variation));
      const height = 8 + cellMoisture * 42;
      const stress = Math.max(pestRisk.score, uncertainty > 0.12 ? 0.72 : 0);
      const telemetryGap = data.length > 0 && data[index % data.length] === null;
      const color = cellMoisture < 0.2 ? '#FDE68A' : cellMoisture < 0.3 ? '#D9F99D' : '#86EFAC';
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = 205 + (col - row) * 30;
      const y = 52 + (col + row) * 15;
      return { index, x, y, height, color, cellMoisture, stress, telemetryGap };
    });
  }, [data, moisture, uncertainty, pestRisk.score, dropoutRate]);

  const validData = data.filter((point): point is WeatherDataPoint => point !== null);
  const latest = validData[validData.length - 1];
  const temp = latest?.temperature ?? 0;
  const depth = Math.round(Math.max(0.05, moisture) * 100);

  return (
    <section className="card overflow-hidden" aria-label="Interactive 3D field twin">
      <div className="flex items-start justify-between gap-4 px-4 pt-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100" title="The map summarizes recent sensor readings across the field.">FIELD OVERVIEW</h2>
          <HeadingNote>Moisture and crop stress</HeadingNote>
        </div>
        <span data-testid="field-status" className={`rounded px-2 py-1 text-[10px] font-bold ${uncertainty >= 0.12 || pestRisk.score > 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {uncertainty >= 0.12 ? 'SAFETY BRAKE' : pestRisk.score > 0.7 ? 'DISEASE ALERT' : 'MONITORING'}
        </span>
      </div>
      <div className="px-2 pb-2 pt-1">
        <svg data-testid="field-3d" viewBox="0 0 440 250" role="img" aria-label={`Isometric field visualization. Soil moisture ${depth} percent, pest risk ${Math.round(pestRisk.score * 100)} percent, sensor dropout ${Math.round(dropoutRate * 100)} percent.`} className="h-auto w-full">
          <defs>
            <linearGradient id="soil-side" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A1A1AA"/><stop offset="1" stopColor="#27272A"/></linearGradient>
            <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F4F4F5"/><stop offset="1" stopColor="#FFFFFF"/></linearGradient>
          </defs>
          <rect x="0" y="0" width="440" height="250" rx="10" fill="url(#sky)" />
          <path d="M205 40 L380 128 L205 216 L30 128 Z" fill="#A1A1AA" stroke="#52525B" strokeWidth="2" />
          <path d="M30 128 L205 216 L205 232 L30 145 Z" fill="url(#soil-side)" />
          <path d="M205 216 L380 128 L380 144 L205 232 Z" fill="#27272A" />
          {cells.map((cell) => {
            const y = cell.y - cell.height;
            const cx = cell.x;
            const cy = y;
            return <g key={cell.index}>
              <path data-testid="field-cell" data-sensor-gap={cell.telemetryGap ? 'true' : 'false'} d={`M${cx} ${cy} l30 15 -30 15 -30 -15 Z`} fill={cell.color} stroke={cell.telemetryGap ? '#52525B' : '#FAFAFA'} strokeDasharray={cell.telemetryGap ? '2 2' : undefined} strokeOpacity=".9" strokeWidth={cell.telemetryGap ? '1.8' : '.7'} />
              <path d={`M${cx - 30} ${cy + 15} l30 15 0 4 -30 -15 Z`} fill="#71717A" opacity=".9" />
              <path d={`M${cx} ${cy + 30} l30 -15 0 4 -30 15 Z`} fill="#27272A" opacity=".72" />
              <g transform={`translate(${cx} ${cy - 4})`} opacity={cell.stress > .7 ? .55 : .9}>
                <path d="M0 0 C-1 -8 1 -15 0 -22 M0 -13 C-8 -20 -12 -18 -13 -17 C-9 -11 -5 -10 0 -11 M0 -17 C6 -24 11 -22 13 -21 C10 -15 5 -13 0 -14" fill="none" stroke={cell.stress > .7 ? '#991B1B' : '#166534'} strokeWidth="2" strokeLinecap="round" />
                <circle cx="0" cy="-24" r="2" fill={cell.stress > .7 ? '#DC2626' : '#22C55E'} />
              </g>
            </g>;
          })}
          {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${55 + i * 30} ${128 + i * 15} L${205 + i * 30} ${53 + i * 15}`} stroke="#FAFAFA" strokeOpacity=".65" strokeDasharray="3 4" />)}
          <g transform="translate(22 18)">
            <circle cx="8" cy="8" r="8" fill={dropoutRate > .2 ? '#52525B' : '#71717A'} />
            <text x="22" y="11" fontSize="9" fill="#18181B" fontFamily="monospace">{Math.round(dropoutRate * 100)}% SENSOR DROPOUT</text>
          </g>
          <g transform="translate(312 18)">
            <text x="0" y="10" fontSize="9" fill="#18181B" fontFamily="monospace">{Math.round(temp)}°C · {depth}% VWC</text>
          </g>
          <text x="15" y="236" fontSize="9" fill="#52525B" fontFamily="monospace">SURFACE SHADE: MOISTURE + CROP STRESS · SOIL RELIEF: SOIL MOISTURE</text>
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-[10px] text-zinc-500" aria-label="Field visualization legend">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300"/>Dry</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-lime-300"/>Adequate</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400"/>Moist</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400"/>Crop stress / risk</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full border border-dashed border-sky-600"/>Sensor dropout</span>
        </div>
      </div>
    </section>
  );
};

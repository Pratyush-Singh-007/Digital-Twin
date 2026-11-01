import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import type { WeatherDataPoint, ForecastPoint, Prediction } from '../../types';
import { AlertCircle } from 'lucide-react';
import { HeadingNote } from '../HeadingNote';

interface Props {
  cleanData: WeatherDataPoint[];
  corruptedData: (WeatherDataPoint | null)[];
  corruptedIndices: Set<number>;
  currentPrediction: Prediction;
  forecastPoints: ForecastPoint[];
}

export const SoilMoistureChart: React.FC<Props> = ({
  cleanData,
  corruptedData,
  corruptedIndices,
  currentPrediction,
  forecastPoints,
}) => {
  const chartData = useMemo(() => {
    if (cleanData.length === 0) return [];

    const historyLength = Math.min(48, cleanData.length);
    const startIdx = cleanData.length - historyLength;
    const items = [];

    for (let i = startIdx; i < cleanData.length; i++) {
      const pt = cleanData[i];
      const isCorrupted = corruptedIndices.has(i);
      const isNull = corruptedData[i] === null;
      const date = new Date(pt.time);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:00`;

      items.push({
        time: timeStr,
        timestamp: pt.timestamp,
        actual: Number((pt.soilMoisture * 100).toFixed(1)),
        predicted: null as number | null,
        lower: null as number | null,
        upper: null as number | null,
        isCorrupted: isCorrupted || isNull,
        isForecast: false,
      });
    }

    const lastHistory = items[items.length - 1];
    if (lastHistory) {
      lastHistory.predicted = Number((currentPrediction.mean * 100).toFixed(1));
      lastHistory.lower = Number((currentPrediction.lower * 100).toFixed(1));
      lastHistory.upper = Number((currentPrediction.upper * 100).toFixed(1));
    }

    const lastTime = cleanData[cleanData.length - 1]
      ? new Date(cleanData[cleanData.length - 1].time)
      : new Date();

    forecastPoints.forEach((fp) => {
      const fDate = new Date(lastTime.getTime() + fp.hour * 3600000);
      const timeStr = `+${fp.hour}h`;
      const lowerPct = Number((fp.prediction.lower * 100).toFixed(1));
      const upperPct = Number((fp.prediction.upper * 100).toFixed(1));
      const predPct = Number((fp.prediction.mean * 100).toFixed(1));

      items.push({
        time: timeStr,
        timestamp: fDate.getTime(),
        actual: null,
        predicted: predPct,
        lower: lowerPct,
        upper: upperPct,
        isCorrupted: false,
        isForecast: true,
      });
    });

    return items;
  }, [cleanData, corruptedData, corruptedIndices, currentPrediction, forecastPoints]);

  const corruptedRanges = useMemo(() => {
    const ranges: { start: string; end: string }[] = [];
    let currentStart: string | null = null;

    for (let i = 0; i < chartData.length; i++) {
      const item = chartData[i];
      if (item.isCorrupted) {
        if (!currentStart) currentStart = item.time;
      } else {
        if (currentStart) {
          ranges.push({ start: currentStart, end: chartData[i - 1].time });
          currentStart = null;
        }
      }
    }
    if (currentStart && chartData.length > 0) {
      ranges.push({ start: currentStart, end: chartData[chartData.length - 1].time });
    }
    return ranges;
  }, [chartData]);

  const latestActual = cleanData[cleanData.length - 1]?.soilMoisture ?? 0.28;
  const currentSpread = (currentPrediction.upper - currentPrediction.lower) * 100;

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Soil moisture trajectory · nominal 90% interval
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500">
              12H HORIZON
            </span>
          </div>
          <HeadingNote title="The shaded band is a nominal interval, not a coverage guarantee.">Observed and predicted moisture</HeadingNote>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            48h sensor window + 12h split-conformal uncertainty rollout
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-zinc-900 dark:bg-white inline-block" />
            <span>GROUND TRUTH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-sky-600 dark:bg-sky-400 inline-block border-t border-dashed border-sky-600 dark:border-sky-400" />
            <span>PREDICTION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-100 dark:bg-sky-950 border border-sky-400 dark:border-sky-700 inline-block" />
            <span>90% INTERVAL</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-68 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="monoBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--prediction)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--prediction)" stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 3" stroke="var(--border)" strokeOpacity={0.8} vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--ink-muted)', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval="preserveStartEnd"
              minTickGap={25}
            />

            <YAxis
              domain={[0, 60]}
              tick={{ fontSize: 10, fill: 'var(--ink-muted)', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              unit="%"
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="custom-tooltip font-mono text-[11px] space-y-1">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-1 font-bold">
                      <span>T: {label}</span>
                      {d.isCorrupted && (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> DROPOUT
                        </span>
                      )}
                    </div>
                    {d.actual !== null && (
                      <div className="flex justify-between gap-4 text-zinc-900 dark:text-zinc-100">
                        <span>ACTUAL:</span>
                        <span className="font-bold">{d.actual}%</span>
                      </div>
                    )}
                    {d.predicted !== null && (
                      <div className="flex justify-between gap-4 text-zinc-600 dark:text-zinc-400">
                        <span>SURROGATE:</span>
                        <span className="font-bold">{d.predicted}%</span>
                      </div>
                    )}
                    {d.lower !== null && d.upper !== null && (
                      <div className="flex justify-between gap-4 text-zinc-500">
                        <span>90% BAND:</span>
                        <span>[{d.lower}% – {d.upper}%]</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Corrupted ranges */}
            {corruptedRanges.map((rng, idx) => (
              <ReferenceArea
                key={`corrupt-${idx}`}
                x1={rng.start}
                x2={rng.end}
                y1={0}
                y2={60}
                fill="#F43F5E"
                fillOpacity={0.08}
                stroke="#F43F5E"
                strokeOpacity={0.2}
              />
            ))}

            {/* Confidence band */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="var(--prediction)"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="2 2"
              fill="url(#monoBand)"
              isAnimationActive={true}
              animationDuration={250}
            />

            <Line
              type="monotone"
              dataKey="lower"
              stroke="var(--prediction)"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={true}
              animationDuration={250}
            />

            {/* Ground truth line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--ink)"
              className="text-zinc-900 dark:text-white"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={250}
            />

            {/* Predicted line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--prediction)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={{ r: 2, fill: 'var(--prediction)' }}
              connectNulls={true}
              isAnimationActive={true}
              animationDuration={250}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Strip */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span>
            OBSERVED: <strong className="text-zinc-900 dark:text-zinc-100">{(latestActual * 100).toFixed(1)}%</strong>
          </span>
          <span>•</span>
          <span>
            PREDICTED (+1H): <strong className="text-zinc-900 dark:text-zinc-100">{(currentPrediction.mean * 100).toFixed(1)}%</strong> ± {((currentSpread / 2)).toFixed(1)}%
          </span>
          <span>•</span>
          <span>
            INTERVAL WIDTH:{' '}
            <strong className={currentSpread > 12 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {currentSpread.toFixed(1)}%
            </strong>
          </span>
        </div>
        <div className="text-[10px] text-zinc-400">
          CONFORMAL α=0.10 | DRY THRESHOLD=25%
        </div>
      </div>
    </div>
  );
};

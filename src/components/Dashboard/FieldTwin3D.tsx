import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Crosshair,
  Eye,
  Layers3,
  Map,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
} from 'lucide-react';
import type { Decision, PestRiskParams, PestRiskResult, WeatherDataPoint } from '../../types';
import { SensorNoisePanel } from './SensorNoisePanel';
import { UncertaintyMeter } from './UncertaintyMeter';
import { PestRiskGauge } from './PestRiskGauge';
import { ActuatorPanel } from './ActuatorPanel';

type CameraMode = 'isometric' | 'top' | 'sensors';
type LayerMode = 'crop' | 'moisture' | 'health';
type DrawerId = 'simulator' | 'safeguards' | null;
type Selection = { kind: 'plot' | 'sensor'; index: number } | null;

interface Props {
  data: (WeatherDataPoint | null)[];
  moisture: number;
  uncertainty: number;
  pestRisk: PestRiskResult;
  dropoutRate: number;
  decision: Decision;
  epsilon: number;
  setEpsilon: (value: number) => void;
  pestParams: PestRiskParams;
  setPestParams: (params: PestRiskParams) => void;
  setDropoutRate: (rate: number) => void;
  heatSpike: boolean;
  setHeatSpike: (value: boolean | ((prev: boolean) => boolean)) => void;
  droughtShock: boolean;
  setDroughtShock: (value: boolean | ((prev: boolean) => boolean)) => void;
  onReset: () => void;
  corruptedIndices: Set<number>;
  totalCount: number;
}

const layerHelp: Record<LayerMode, string> = {
  crop: 'Crop condition shows planting rows and relative canopy density from the latest moisture readings.',
  moisture: 'Soil moisture darkens wet plots and lightens dry plots. Select a plot for its exact value.',
  health: 'Sensor health suppresses crop detail and makes missing telemetry easy to locate on the field.',
};

const cameraHelp: Record<CameraMode, string> = {
  isometric: 'Isometric view shows field elevation, irrigation paths, crops, and sensor masts together.',
  top: 'Top view makes plot boundaries and the sensor network easier to compare.',
  sensors: 'Sensor view preserves depth while prioritising masts and their telemetry status.',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Data-linked spatial field twin with accessible, inspectable SVG geometry. */
export const FieldTwin3D: React.FC<Props> = ({
  data,
  moisture,
  uncertainty,
  pestRisk,
  dropoutRate,
  decision,
  epsilon,
  setEpsilon,
  pestParams,
  setPestParams,
  setDropoutRate,
  heatSpike,
  setHeatSpike,
  droughtShock,
  setDroughtShock,
  onReset,
  corruptedIndices,
  totalCount,
}) => {
  const [camera, setCamera] = useState<CameraMode>('isometric');
  const [layer, setLayer] = useState<LayerMode>('crop');
  const [drawer, setDrawer] = useState<DrawerId>('simulator');
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  const [viewCenter, setViewCenter] = useState({ x: 380, y: 250 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; centerX: number; centerY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const sensors = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const sampleIndex = data.length ? (index * 2 + 1) % data.length : 0;
    const reading = data[sampleIndex] ?? null;
    const fallback = moisture + Math.sin(index * 1.73) * 0.025;
    return {
      index,
      plot: index,
      reading,
      value: reading?.soilMoisture ?? clamp(fallback, 0.08, 0.55),
      isDropped: reading === null,
      age: reading ? new Date(reading.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No sample',
    };
  }), [data, moisture]);

  const missingCount = sensors.filter((sensor) => sensor.isDropped).length;
  const isLocked = decision.action === 'LOCKED';
  const statusText = isLocked ? 'SAFETY BRAKE' : pestRisk.score > 0.7 ? 'DISEASE ALERT' : decision.action === 'IRRIGATE' ? 'IRRIGATION READY' : 'MONITORING';
  const viewportWidth = 760 / zoom;
  const viewportHeight = 500 / zoom;
  const fieldViewBox = `${viewCenter.x - viewportWidth / 2} ${viewCenter.y - viewportHeight / 2} ${viewportWidth} ${viewportHeight}`;

  const setBoundedZoom = (nextZoom: number) => setZoom(clamp(Number(nextZoom.toFixed(2)), 0.1, 10));
  const resetView = () => {
    setZoom(1);
    setViewCenter({ x: 380, y: 250 });
  };

  const beginPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, centerX: viewCenter.x, centerY: viewCenter.y, moved: false };
    setIsPanning(true);
  };

  const movePan = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - pan.startX) * (viewportWidth / bounds.width);
    const offsetY = (event.clientY - pan.startY) * (viewportHeight / bounds.height);
    if (Math.abs(offsetX) > 1 || Math.abs(offsetY) > 1) pan.moved = true;
    setViewCenter({ x: pan.centerX - offsetX, y: pan.centerY - offsetY });
  };

  const endPan = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClickRef.current = pan.moved;
    panRef.current = null;
    setIsPanning(false);
  };

  const point = (col: number, row: number) => {
    if (camera === 'top') return { x: 148 + col * 128, y: 96 + row * 98 };
    return { x: 360 + (col - row) * 86, y: 104 + (col + row) * 42 };
  };

  const plotPath = (index: number) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const a = point(col - 0.46, row - 0.46);
    const b = point(col + 0.46, row - 0.46);
    const c = point(col + 0.46, row + 0.46);
    const d = point(col - 0.46, row + 0.46);
    return {
      col,
      row,
      top: `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`,
      side: camera === 'top' ? null : `${d.x},${d.y} ${c.x},${c.y} ${c.x},${c.y + 20} ${d.x},${d.y + 20}`,
    };
  };

  const onKeyActivate = (event: React.KeyboardEvent<SVGGElement>, next: Selection) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelection(next);
    }
  };

  const selectedSensor = selection ? sensors[selection.index] : null;
  const selectedLabel = selectedSensor
    ? selectedSensor.isDropped
      ? `Sensor ${selectedSensor.index + 1}: no signal. The twin uses the last known moisture estimate for this plot.`
      : `Sensor ${selectedSensor.index + 1}: ${(selectedSensor.value * 100).toFixed(1)}% volumetric water content, sampled ${selectedSensor.age}.`
    : null;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-300 bg-zinc-950 shadow-sm dark:border-zinc-800" aria-label="Interactive 3D field twin">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]"><Sprout className="h-4 w-4" /> Field twin viewport</div>
          <p className="mt-1 text-[11px] text-zinc-400">Inspect plot conditions, telemetry health, and the current safety decision in one place.</p>
        </div>
        <span data-testid="field-status" className="rounded border border-white/20 bg-zinc-800 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-zinc-100">{statusText}</span>
      </div>

      <div className="relative min-h-[760px] overflow-hidden bg-zinc-950 sm:min-h-[620px] lg:min-h-[680px]">
        <svg
          data-testid="field-3d"
          viewBox={fieldViewBox}
          role="img"
          aria-label={`Interactive field visualization. Soil moisture ${Math.round(moisture * 100)} percent, pest risk ${Math.round(pestRisk.score * 100)} percent, sensor dropout ${Math.round(dropoutRate * 100)} percent, ${missingCount} unavailable field sensors.`}
          className={`absolute inset-0 h-full w-full touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={beginPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onClickCapture={(event) => {
            if (suppressClickRef.current) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = false;
            }
          }}
          onWheel={(event) => {
            event.preventDefault();
            setBoundedZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.88));
          }}
        >
          <defs>
            <pattern id="field-grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#3f3f46" opacity=".55" /></pattern>
            <pattern id="dropout-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#27272a" /><line x1="0" y1="0" x2="0" y2="8" stroke="#a1a1aa" strokeWidth="2" opacity=".75" /></pattern>
            <filter id="plot-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="4" floodColor="#000" floodOpacity=".42" /></filter>
          </defs>
          <rect width="760" height="500" fill="#09090b" />
          <rect width="760" height="500" fill="url(#field-grid)" />
          <path d="M52 418 L350 266 L712 398 L405 490 Z" fill="#18181b" stroke="#52525b" strokeWidth="1.2" />
          <path d="M56 411 L351 263 L705 389" fill="none" stroke="#71717a" strokeDasharray="5 7" strokeOpacity=".55" />

          {sensors.map((sensor) => {
            const { col, row, top, side } = plotPath(sensor.plot);
            const isSelected = selection?.index === sensor.index;
            const shade = clamp(28 + sensor.value * 110, 34, 82);
            const fill = sensor.isDropped ? 'url(#dropout-hatch)' : layer === 'health' ? '#3f3f46' : `rgb(${shade}, ${shade}, ${shade})`;
            const position = point(col, row);
            return (
              <g key={`plot-${sensor.index}`} role="button" tabIndex={0} aria-label={`Plot ${sensor.index + 1}, ${sensor.isDropped ? 'sensor data unavailable' : `${(sensor.value * 100).toFixed(1)} percent soil moisture`}`} onClick={() => setSelection({ kind: 'plot', index: sensor.index })} onKeyDown={(event) => onKeyActivate(event, { kind: 'plot', index: sensor.index })} className="cursor-pointer outline-none">
                {side && <polygon points={side} fill="#18181b" stroke="#52525b" strokeWidth="1" />}
                <polygon data-testid="field-cell" data-sensor-gap={sensor.isDropped ? 'true' : 'false'} points={top} fill={fill} stroke={isSelected ? '#fafafa' : '#71717a'} strokeWidth={isSelected ? '2.5' : '1'} filter="url(#plot-shadow)" />
                {layer !== 'health' && Array.from({ length: 5 }, (_, crop) => {
                  const cropX = position.x + (crop - 2) * 13;
                  const cropY = position.y + (crop % 2 ? 6 : -4);
                  const cropHeight = 10 + sensor.value * 32;
                  return <path key={crop} d={`M${cropX} ${cropY + 7} L${cropX - 5} ${cropY - cropHeight / 2} L${cropX} ${cropY - cropHeight} L${cropX + 5} ${cropY - cropHeight / 2} Z`} fill={layer === 'moisture' ? '#d4d4d8' : '#a1a1aa'} opacity={sensor.isDropped ? .25 : .8} />;
                })}
                {layer === 'moisture' && <text x={position.x} y={position.y + 5} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#fafafa">{sensor.isDropped ? '—' : `${Math.round(sensor.value * 100)}%`}</text>}
              </g>
            );
          })}

          <path d="M110 345 C220 274 272 295 349 253 S520 218 642 146" fill="none" stroke="#d4d4d8" strokeWidth="3" strokeDasharray="8 7" strokeOpacity=".62" />
          <text x="620" y="136" textAnchor="end" fontSize="10" fontFamily="monospace" fill="#a1a1aa">IRRIGATION LINE</text>

          {sensors.map((sensor) => {
            const { col, row } = plotPath(sensor.plot);
            const base = point(col, row);
            const mastHeight = camera === 'top' ? 7 : 34;
            const mastY = base.y - mastHeight;
            const isSelected = selection?.kind === 'sensor' && selection.index === sensor.index;
            return (
              <g key={`sensor-${sensor.index}`} role="button" tabIndex={0} aria-label={`Sensor ${sensor.index + 1}, ${sensor.isDropped ? 'unavailable' : 'reporting'}`} onClick={() => setSelection({ kind: 'sensor', index: sensor.index })} onKeyDown={(event) => onKeyActivate(event, { kind: 'sensor', index: sensor.index })} className="cursor-pointer outline-none">
                {camera !== 'top' && <line x1={base.x} y1={base.y} x2={base.x} y2={mastY} stroke="#d4d4d8" strokeWidth="3" />}
                <circle data-testid={sensor.isDropped ? 'offline-sensor' : undefined} data-sensor-gap={sensor.isDropped ? 'true' : 'false'} cx={base.x} cy={mastY} r={sensor.isDropped ? 8 : 7} fill={sensor.isDropped ? 'url(#dropout-hatch)' : '#f4f4f5'} stroke={isSelected ? '#ffffff' : '#18181b'} strokeWidth={isSelected ? '4' : '2'} />
                {sensor.isDropped && <path d={`M${base.x - 4} ${mastY - 4} L${base.x + 4} ${mastY + 4} M${base.x + 4} ${mastY - 4} L${base.x - 4} ${mastY + 4}`} stroke="#18181b" strokeWidth="1.4" />}
              </g>
            );
          })}
        </svg>

        <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] space-y-2">
          <div className="rounded-md border border-white/10 bg-zinc-900/95 p-1.5 shadow-lg backdrop-blur">
            <div className="mb-1 px-1 font-mono text-[9px] uppercase tracking-wider text-zinc-500">Camera · {cameraHelp[camera]}</div>
            <div className="flex flex-wrap gap-1">
              {([['isometric', Crosshair, 'Iso'], ['top', Map, 'Top'], ['sensors', Radio, 'Sensors']] as const).map(([mode, Icon, label]) => <button key={mode} type="button" data-testid={`camera-${mode}`} aria-pressed={camera === mode} onClick={() => setCamera(mode)} className={`inline-flex min-h-8 items-center gap-1 rounded px-2 text-[10px] font-medium ${camera === mode ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}><Icon className="h-3 w-3" />{label}</button>)}
              <span className="mx-0.5 h-6 w-px self-center bg-white/10" />
              <button type="button" data-testid="zoom-out" aria-label="Zoom out field view" disabled={zoom <= 0.1} onClick={() => setZoom((current) => clamp(Number((current - 0.25).toFixed(2)), 0.1, 10))} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"><Minus className="h-3.5 w-3.5" /></button>
              <span aria-live="polite" className="inline-flex min-h-8 items-center px-1 font-mono text-[10px] text-zinc-300">{Math.round(zoom * 100)}%</span>
              <button type="button" data-testid="zoom-in" aria-label="Zoom in field view" disabled={zoom >= 10} onClick={() => setZoom((current) => clamp(Number((current + 0.25).toFixed(2)), 0.1, 10))} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"><Plus className="h-3.5 w-3.5" /></button>
              <button type="button" data-testid="reset-field-view" aria-label="Reset field view" onClick={resetView} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mt-1 px-1 text-[9px] leading-snug text-zinc-500">Drag the field to pan. Use the wheel or zoom buttons for 10–1000% magnification.</p>
          </div>
          <div className="rounded-md border border-white/10 bg-zinc-900/95 p-1.5 shadow-lg backdrop-blur">
            <div className="mb-1 px-1 font-mono text-[9px] uppercase tracking-wider text-zinc-500">Layer · {layerHelp[layer]}</div>
            <div className="flex flex-wrap gap-1">
              {([['crop', Sprout, 'Crop'], ['moisture', Layers3, 'Moisture'], ['health', Radio, 'Sensor health']] as const).map(([mode, Icon, label]) => <button key={mode} type="button" data-testid={`layer-${mode}`} aria-pressed={layer === mode} onClick={() => setLayer(mode)} className={`inline-flex min-h-8 items-center gap-1 rounded px-2 text-[10px] font-medium ${layer === mode ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}><Icon className="h-3 w-3" />{label}</button>)}
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-zinc-900/95 px-3 py-2 text-zinc-100 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-zinc-100" /><span className="font-mono text-[10px] font-semibold">{missingCount ? `${missingCount} / ${sensors.length} SENSOR ZONES OFFLINE` : `${sensors.length} / ${sensors.length} SENSOR ZONES REPORTING`}</span></div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400"><span>VWC <strong className="font-mono text-zinc-100">{(moisture * 100).toFixed(1)}%</strong></span><span>UNCERTAINTY <strong className="font-mono text-zinc-100">±{((uncertainty / 2) * 100).toFixed(1)}%</strong></span><span>RISK <strong className="font-mono text-zinc-100">{(pestRisk.score * 100).toFixed(0)}%</strong></span></div>
        </div>

        {selectedSensor && <div data-testid="selected-field-item" className="absolute bottom-16 left-3 max-w-xs rounded-md border border-white/15 bg-zinc-900/95 p-3 text-zinc-100 shadow-xl backdrop-blur"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{selection?.kind} {selectedSensor.index + 1}</span><button type="button" className="text-zinc-400 hover:text-white" aria-label="Close field detail" onClick={() => setSelection(null)}>×</button></div><p className="mt-1 text-xs leading-relaxed">{selectedLabel}</p><p className="mt-2 text-[10px] text-zinc-400">{layerHelp[layer]}</p></div>}

        <div aria-label="Resizable operations HUD" className="absolute left-3 right-3 top-[146px] max-h-[calc(100%-10rem)] min-h-[13rem] overflow-auto rounded-md sm:left-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:min-w-[18rem] sm:max-w-[calc(100%-1.5rem)] sm:w-[22rem]" style={{ resize: 'both' }}>
          <div className="sticky top-0 z-10 rounded-md border border-white/10 bg-zinc-900/95 p-2 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-2"><div><div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Operations HUD</div><div className="mt-0.5 text-[11px] text-zinc-300">Controls change simulated input and safety limits.</div></div><Eye className="h-4 w-4 text-zinc-400" /></div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button type="button" onClick={() => setDrawer(drawer === 'simulator' ? null : 'simulator')} aria-expanded={drawer === 'simulator'} className={`flex min-h-9 items-center justify-between rounded px-2 text-left text-[10px] font-medium ${drawer === 'simulator' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}><span className="flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Simulator</span><ChevronDown className={`h-3 w-3 transition-transform ${drawer === 'simulator' ? 'rotate-180' : ''}`} /></button>
              <button type="button" onClick={() => setDrawer(drawer === 'safeguards' ? null : 'safeguards')} aria-expanded={drawer === 'safeguards'} className={`flex min-h-9 items-center justify-between rounded px-2 text-left text-[10px] font-medium ${drawer === 'safeguards' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}><span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Safeguards</span><ChevronDown className={`h-3 w-3 transition-transform ${drawer === 'safeguards' ? 'rotate-180' : ''}`} /></button>
            </div>
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2"><PestRiskGauge compact pestRisk={pestRisk} params={pestParams} onParamsChange={setPestParams} /><div className="border-t border-white/10 pt-2"><UncertaintyMeter compact intervalWidth={uncertainty} epsilon={epsilon} setEpsilon={setEpsilon} /></div><p className="border-t border-white/10 pt-2 text-[9px] text-zinc-500">Drag the lower-right corner to resize this panel. The navigation stays pinned while content scrolls.</p></div>
          </div>
          {isLocked && <div className="mt-2 rounded-md border border-white/10 bg-zinc-950/95 p-2 shadow-xl backdrop-blur"><div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] text-zinc-400"><ShieldCheck className="h-3 w-3" /> Safety brake active: manual review is required before this prototype can continue.</div><ActuatorPanel decision={decision} /></div>}
          {drawer && <div className="mt-2 rounded-md border border-white/10 bg-zinc-950/95 p-2 shadow-xl backdrop-blur"><div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] text-zinc-400">{drawer === 'simulator' ? <><AlertTriangle className="h-3 w-3" /> Fault injection affects incoming telemetry, never a physical device.</> : <><ShieldCheck className="h-3 w-3" /> Safeguards stop automated irrigation when confidence is insufficient.</>}</div>{drawer === 'simulator' ? <SensorNoisePanel dropoutRate={dropoutRate} setDropoutRate={setDropoutRate} heatSpike={heatSpike} setHeatSpike={setHeatSpike} droughtShock={droughtShock} setDroughtShock={setDroughtShock} onReset={onReset} corruptedData={data} corruptedIndices={corruptedIndices} totalCount={totalCount} /> : <ActuatorPanel decision={decision} />}</div>}
        </div>
      </div>
    </section>
  );
};

import type { WeatherDataPoint, CorruptedDataset } from '../types';

/* ── helpers ─────────────────────────────────────────────────────── */

function deepCopyPoint(p: WeatherDataPoint): WeatherDataPoint {
  return { ...p };
}

function deepCopyArray(data: WeatherDataPoint[]): WeatherDataPoint[] {
  return data.map(deepCopyPoint);
}

/* ── Dropout ─────────────────────────────────────────────────────── */

/**
 * Randomly null-out data points at the given rate (0 – 0.4).
 * Returns a CorruptedDataset with the corrupted view and a clean copy.
 */
export function injectDropout(
  data: WeatherDataPoint[],
  rate: number,
  seed?: number,
): CorruptedDataset {
  const clampedRate = Math.max(0, Math.min(0.4, rate));
  const clean = deepCopyArray(data);
  const corrupted: (WeatherDataPoint | null)[] = data.map(deepCopyPoint);
  const indices = new Set<number>();

  const random = seededRandom(seed);
  for (let i = 0; i < corrupted.length; i++) {
    if (random() < clampedRate) {
      corrupted[i] = null;
      indices.add(i);
    }
  }

  return {
    data: corrupted,
    clean,
    corruptedIndices: indices,
    dropoutRate: clampedRate,
  };
}

/* ── Heat Spike ──────────────────────────────────────────────────── */

/**
 * Inject an out-of-distribution heat spike: +15 °C for 12 hours.
 * Also bumps soil temperature proportionally.
 */
export function injectHeatSpike(
  data: WeatherDataPoint[],
  startIdx?: number,
): CorruptedDataset {
  const clean = deepCopyArray(data);
  const corrupted: (WeatherDataPoint | null)[] = data.map(deepCopyPoint);
  const indices = new Set<number>();

  const start = startIdx ?? Math.max(0, Math.floor(data.length / 2));
  const end = Math.min(data.length, start + 12);

  for (let i = start; i < end; i++) {
    const p = corrupted[i];
    if (p !== null) {
      p.temperature += 15;
      p.soilTemperature += 8; // soil reacts slower
      indices.add(i);
    }
  }

  return {
    data: corrupted,
    clean,
    corruptedIndices: indices,
    dropoutRate: 0,
  };
}

/* ── Drought Shock ───────────────────────────────────────────────── */

/**
 * Suddenly drop soil moisture by 60 % for 24 hours.
 * Simulates sensor malfunction or a sudden drought event.
 */
export function injectDroughtShock(
  data: WeatherDataPoint[],
  startIdx?: number,
): CorruptedDataset {
  const clean = deepCopyArray(data);
  const corrupted: (WeatherDataPoint | null)[] = data.map(deepCopyPoint);
  const indices = new Set<number>();

  const start = startIdx ?? Math.max(0, Math.floor(data.length / 2));
  const end = Math.min(data.length, start + 24);

  for (let i = start; i < end; i++) {
    const p = corrupted[i];
    if (p !== null) {
      p.soilMoisture *= 0.4; // drop by 60 %
      indices.add(i);
    }
  }

  return {
    data: corrupted,
    clean,
    corruptedIndices: indices,
    dropoutRate: 0,
  };
}

/* ── Combined ────────────────────────────────────────────────────── */

/**
 * Apply all requested corruptions sequentially.
 * Returns a single CorruptedDataset with the union of corrupted indices.
 */
export function applyCorruption(
  data: WeatherDataPoint[],
  dropoutRate: number,
  heatSpike: boolean,
  droughtShock: boolean,
  seed?: number,
): CorruptedDataset {
  if (data.length === 0) {
    return {
      data: [],
      clean: [],
      corruptedIndices: new Set<number>(),
      dropoutRate,
    };
  }

  const clean = deepCopyArray(data);
  let working: (WeatherDataPoint | null)[] = data.map(deepCopyPoint);
  const allIndices = new Set<number>();

  // 1. Heat spike (applied before dropout so some spikes may get dropped)
  if (heatSpike) {
    const start = Math.max(0, Math.floor(data.length / 2));
    const end = Math.min(working.length, start + 12);
    for (let i = start; i < end; i++) {
      const p = working[i];
      if (p !== null) {
        p.temperature += 15;
        p.soilTemperature += 8;
        allIndices.add(i);
      }
    }
  }

  // 2. Drought shock
  if (droughtShock) {
    const start = Math.max(0, Math.floor(data.length / 2) + 24);
    const end = Math.min(working.length, start + 24);
    for (let i = start; i < end; i++) {
      const p = working[i];
      if (p !== null) {
        p.soilMoisture *= 0.4;
        allIndices.add(i);
      }
    }
  }

  // 3. Dropout (last, so it can null any point including spiked ones)
  if (dropoutRate > 0) {
    const clamped = Math.max(0, Math.min(0.4, dropoutRate));
    const random = seededRandom(seed);
    for (let i = 0; i < working.length; i++) {
      if (random() < clamped) {
        working[i] = null;
        allIndices.add(i);
      }
    }
  }

  return {
    data: working,
    clean,
    corruptedIndices: allIndices,
    dropoutRate,
  };
}

function seededRandom(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

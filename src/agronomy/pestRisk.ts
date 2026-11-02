import type { PestRiskParams, PestRiskResult, WeatherDataPoint } from '../types';

/* ── Default microclimate wetness proxy ─────────────────────────── */

export const DEFAULT_PEST_PARAMS: PestRiskParams = {
  tempLow: 10,
  tempHigh: 25,
  rhThreshold: 90,
  leafWetHours: 6,
  dewPointDepression: 2,
};

/* ── Pest risk computation ────────────────────────────────────────── */

/**
 * Compute a composite microclimate wetness score from the most recent data window
 * (typically last 24 hours).
 *
 * The model retains a research-style late-blight environmental proxy, combining:
 *   • temperature window favourability
 *   • sustained high humidity
 *   • leaf-wetness proxy (dew-point depression or rain)
 *
 * It is deliberately not a diagnosis and is not crop-specific. Consumers must
 * present this as a scouting advisory unless a validated crop model is supplied.
 */
export function computePestRisk(
  data: (WeatherDataPoint | null)[],
  params?: Partial<PestRiskParams>,
): PestRiskResult {
  const p: PestRiskParams = { ...DEFAULT_PEST_PARAMS, ...params };

  // Use up to the last 24 non-null points
  const window = data.slice(-24);

  if (window.length === 0) {
    return emptyResult(p);
  }

  // ── Temperature score ──────────────────────────────────────────
  let hoursInTempWindow = 0;
  let validTempHours = 0;
  for (const pt of window) {
    if (pt === null) continue;
    validTempHours++;
    if (pt.temperature >= p.tempLow && pt.temperature <= p.tempHigh) {
      hoursInTempWindow++;
    }
  }
  const tempScore = validTempHours > 0 ? hoursInTempWindow / validTempHours : 0;

  // ── Humidity score (consecutive hours above threshold) ─────────
  let hoursHighHumidity = 0;
  let maxConsecutiveHumid = 0;
  let currentRun = 0;
  for (const pt of window) {
    if (pt === null) {
      currentRun = 0;
      continue;
    }
    if (pt.humidity > p.rhThreshold) {
      currentRun++;
      hoursHighHumidity++;
      maxConsecutiveHumid = Math.max(maxConsecutiveHumid, currentRun);
    } else {
      currentRun = 0;
    }
  }
  const humidityScore = Math.min(maxConsecutiveHumid / p.leafWetHours, 1);

  // ── Leaf-wetness score ─────────────────────────────────────────
  let hoursLeafWet = 0;
  for (const pt of window) {
    if (pt === null) continue;
    const dewDepress = pt.temperature - pt.dewPoint;
    if (dewDepress < p.dewPointDepression || pt.rain > 0) {
      hoursLeafWet++;
    }
  }
  const leafWetnessScore = Math.min(hoursLeafWet / p.leafWetHours, 1);

  // ── Composite ──────────────────────────────────────────────────
  const score = 0.3 * tempScore + 0.35 * humidityScore + 0.35 * leafWetnessScore;

  return {
    score,
    tempScore,
    humidityScore,
    leafWetnessScore,
    hoursInTempWindow,
    hoursHighHumidity,
    hoursLeafWet,
    params: p,
  };
}

/* ── helper ───────────────────────────────────────────────────────── */

function emptyResult(params: PestRiskParams): PestRiskResult {
  return {
    score: 0,
    tempScore: 0,
    humidityScore: 0,
    leafWetnessScore: 0,
    hoursInTempWindow: 0,
    hoursHighHumidity: 0,
    hoursLeafWet: 0,
    params,
  };
}

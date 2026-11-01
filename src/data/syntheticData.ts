import type { WeatherDataPoint } from '../types';

/* ── helpers ─────────────────────────────────────────────────────── */

/** Pseudo-random seeded with index for reproducibility while still looking noisy. */
function noise(seed: number, amp: number): number {
  // simple deterministic-ish noise using sin
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amp;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Magnus formula: approximate dew point from temperature (°C) and RH (%).
 */
function magnusDewPoint(tempC: number, rh: number): number {
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(Math.max(rh, 1) / 100);
  return (b * gamma) / (a - gamma);
}

/**
 * Saturation vapour pressure (kPa) from temperature (°C).
 */
function satVP(t: number): number {
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

/* ── main generator ─────────────────────────────────────────────── */

/**
 * Generate a realistic synthetic season of hourly weather data
 * for an Indian farm starting from 2024-06-01 (monsoon onset).
 *
 * @param days Number of days to generate (default 90).
 */
export function generateSyntheticSeason(days: number = 90): WeatherDataPoint[] {
  const totalHours = days * 24;
  const start = new Date('2024-06-01T00:00:00Z');
  const points: WeatherDataPoint[] = [];

  // State variables for soil moisture (carry-over between hours)
  let soilMoisture = 0.30;
  let soilTemp = 28;

  // Rain event state
  let remainingRainHours = 0;
  let rainIntensity = 0;

  for (let h = 0; h < totalHours; h++) {
    const date = new Date(start.getTime() + h * 3600_000);
    const hour = date.getUTCHours();
    const dayOfYear = Math.floor(h / 24);
    const month = date.getUTCMonth(); // 0-indexed: 5=Jun, 6=Jul … 8=Sep

    // ── Season & diurnal phase ──────────────────────────────────
    // Seasonal trend: hotter in May-June, cooling toward Sep
    const seasonalOffset = 4 * Math.sin(((dayOfYear - 30) / 180) * Math.PI); // peaks ~mid-season
    // Diurnal cycle: coldest at 5 AM, hottest at 14:00
    const diurnal = Math.sin(((hour - 5) / 24) * 2 * Math.PI);

    // ── Temperature ─────────────────────────────────────────────
    const baseTemp = 29 + seasonalOffset;
    const temperature = clamp(
      baseTemp + 7 * diurnal + noise(h, 2),
      20,
      42,
    );

    // ── Humidity ────────────────────────────────────────────────
    // Inversely correlated with temperature; higher at night, during monsoon
    const isMonsoon = month >= 5 && month <= 8; // Jun–Sep
    const monsoonBoost = isMonsoon ? 15 : 0;
    const baseHumidity = 65 + monsoonBoost - 20 * diurnal;
    const humidity = clamp(baseHumidity + noise(h + 1000, 8), 30, 98);

    // ── Dew point ───────────────────────────────────────────────
    const dewPoint = magnusDewPoint(temperature, humidity);

    // ── Rain ────────────────────────────────────────────────────
    let rain = 0;
    if (remainingRainHours > 0) {
      rain = clamp(rainIntensity + noise(h + 3000, rainIntensity * 0.4), 0, 40);
      remainingRainHours--;
    } else {
      // Probability of new rain event
      const rainProb = isMonsoon ? 0.04 : 0.005;
      if (Math.abs(noise(h + 5000, 1)) < rainProb) {
        remainingRainHours = Math.floor(3 + Math.abs(noise(h + 6000, 5)));
        rainIntensity = 1 + Math.abs(noise(h + 7000, 6));
        rain = clamp(rainIntensity + noise(h + 3000, 1), 0, 30);
      }
    }

    // ── Radiation ───────────────────────────────────────────────
    // Solar cycle: zero at night, peaks near noon
    let radiation = 0;
    if (hour >= 6 && hour <= 18) {
      const solarAngle = Math.sin(((hour - 6) / 12) * Math.PI);
      const cloudFactor = rain > 0 ? 0.2 : 1.0;
      radiation = clamp(
        900 * solarAngle * cloudFactor + noise(h + 2000, 60),
        0,
        1100,
      );
    }

    // ── ET0 (simplified Hargreaves) ─────────────────────────────
    // ET0 ≈ 0.0023 * Ra * (T + 17.8) * √ΔT , simplified per-hour
    const raMJ = Math.max(radiation, 0) * 0.0036; // W/m² → MJ/m²/h approx
    const et0 = clamp(
      0.0023 * raMJ * (temperature + 17.8) * Math.sqrt(Math.max(temperature - dewPoint, 0.1)) * 0.5,
      0,
      1.2,
    );

    // ── VPD ─────────────────────────────────────────────────────
    const es = satVP(temperature);
    const ea = satVP(dewPoint);
    const vpd = clamp(es - ea, 0, 6);

    // ── Soil Moisture ───────────────────────────────────────────
    // Simple bucket model: gains from rain, loses from ET0
    const infiltration = rain * 0.003; // mm rain → rough Δ m³/m³
    const evapLoss = et0 * 0.005;      // mm ET0 → rough Δ m³/m³
    soilMoisture = clamp(
      soilMoisture + infiltration - evapLoss + noise(h + 4000, 0.002),
      0.10,
      0.55,
    );

    // ── Soil Temperature ────────────────────────────────────────
    // Follows air temp with damping factor and 3-hour lag
    const targetSoilTemp = temperature * 0.6 + soilTemp * 0.4;
    soilTemp = targetSoilTemp + noise(h + 8000, 0.3);
    const soilTemperature = clamp(soilTemp, 15, 45);

    points.push({
      time: date.toISOString(),
      timestamp: date.getTime(),
      temperature: Math.round(temperature * 100) / 100,
      humidity: Math.round(humidity * 100) / 100,
      dewPoint: Math.round(dewPoint * 100) / 100,
      rain: Math.round(rain * 100) / 100,
      radiation: Math.round(radiation * 100) / 100,
      et0: Math.round(et0 * 10000) / 10000,
      vpd: Math.round(vpd * 1000) / 1000,
      soilMoisture: Math.round(soilMoisture * 10000) / 10000,
      soilTemperature: Math.round(soilTemperature * 100) / 100,
    });
  }

  return points;
}

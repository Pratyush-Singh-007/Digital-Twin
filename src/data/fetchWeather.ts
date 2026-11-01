import type { WeatherDataPoint } from '../types';

const HOURLY_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'dew_point_2m',
  'rain',
  'shortwave_radiation',
  'et0_fao_evapotranspiration',
  'vapour_pressure_deficit',
  'soil_moisture_0_to_7cm',
  'soil_temperature_0_to_7cm',
].join(',');

/**
 * Fetch live hourly weather data from the Open-Meteo free API.
 * Includes 2 past days of historical data.
 * Returns null on any error so the caller can fall back to synthetic data.
 */
export async function fetchWeatherData(
  lat: number,
  lon: number,
): Promise<WeatherDataPoint[] | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&hourly=${HOURLY_VARS}` +
      `&past_days=2` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Open-Meteo HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const h = json?.hourly;
    if (!h || !Array.isArray(h.time) || h.time.length === 0) {
      console.error('Open-Meteo response missing hourly data');
      return null;
    }

    const points: WeatherDataPoint[] = [];

    for (let i = 0; i < h.time.length; i++) {
      const isoTime: string = h.time[i];
      const temperature   = h.temperature_2m?.[i]                  ?? 0;
      const humidity       = h.relative_humidity_2m?.[i]            ?? 0;
      const dewPoint       = h.dew_point_2m?.[i]                   ?? 0;
      const rain           = h.rain?.[i]                            ?? 0;
      const radiation      = h.shortwave_radiation?.[i]             ?? 0;
      const et0            = h.et0_fao_evapotranspiration?.[i]      ?? 0;
      const vpd            = h.vapour_pressure_deficit?.[i]         ?? 0;
      const soilMoisture   = h.soil_moisture_0_to_7cm?.[i]         ?? 0;
      const soilTemperature = h.soil_temperature_0_to_7cm?.[i]     ?? 0;

      points.push({
        time: isoTime,
        timestamp: new Date(isoTime).getTime(),
        temperature,
        humidity,
        dewPoint,
        rain,
        radiation,
        et0,
        vpd,
        soilMoisture,
        soilTemperature,
      });
    }

    return points;
  } catch (err) {
    console.error('fetchWeatherData failed:', err);
    return null;
  }
}

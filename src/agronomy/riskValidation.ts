import type { PestRiskParams, WeatherDataPoint } from '../types';
import { computePestRisk, DEFAULT_PEST_PARAMS } from './pestRisk';

export interface RiskValidationCase {
  name: string;
  expectedActive: boolean;
  explanation: string;
  score: number;
  predictedActive: boolean;
  passed: boolean;
}

function hourlyProfile(temp: number, humidity: number, dewPoint: number, rain: number): WeatherDataPoint[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    time: new Date(Date.UTC(2025, 6, 1, hour)).toISOString(),
    timestamp: Date.UTC(2025, 6, 1, hour),
    temperature: temp,
    humidity,
    dewPoint,
    rain,
    radiation: 0,
    et0: 0,
    vpd: 0,
    soilMoisture: 0.25,
    soilTemperature: temp,
  }));
}

/** Transparent rule-consistency checks using constructed profiles; not field validation. */
export function evaluateAgronomicRuleScenarios(params: PestRiskParams = DEFAULT_PEST_PARAMS): RiskValidationCase[] {
  const scenarios = [
    { name: 'Favorable + wet', active: true, explanation: '24 h in temperature window, sustained RH > threshold, leaves wet', data: hourlyProfile(18, 95, 17, 0.2) },
    { name: 'Cool + dry', active: false, explanation: 'Below pathogen temperature window with low humidity and no wetness', data: hourlyProfile(7, 45, 2, 0) },
    { name: 'Warm + dry', active: false, explanation: 'Above pathogen temperature window with low humidity and no wetness', data: hourlyProfile(30, 45, 15, 0) },
    { name: 'Humid but leaf-dry', active: false, explanation: 'Favorable temperature and humidity, but dew gap is too large and no rain', data: hourlyProfile(18, 90, 12, 0) },
  ];
  return scenarios.map((scenario) => {
    const risk = computePestRisk(scenario.data, params);
    const predictedActive = risk.score > 0.7;
    return {
      name: scenario.name,
      expectedActive: scenario.active,
      explanation: scenario.explanation,
      score: risk.score,
      predictedActive,
      passed: predictedActive === scenario.active,
    };
  });
}

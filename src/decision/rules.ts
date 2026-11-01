import type {
  ActuatorAction,
  Decision,
  DecisionConfig,
  PestRiskResult,
  Prediction,
} from '../types';

/* ── Default thresholds ──────────────────────────────────────────── */

export const DEFAULT_DECISION_CONFIG: DecisionConfig = {
  dryThreshold: 0.25,   // m³/m³ – below this the soil is "dry"
  epsilon: 0.12,         // uncertainty interval width that triggers LOCKED
  pestThreshold: 0.70,   // pest risk score that triggers SUSPENDED
};

/* ── Full gated decision engine ──────────────────────────────────── */

/**
 * Evaluate the irrigation decision using three priority-ordered rules:
 *
 *  Rule 3 (Safety)   – uncertainty too high → LOCKED
 *  Rule 2 (Conflict) – soil dry but pest risk high → SUSPENDED
 *  Rule 1 (Safe)     – soil dry, safe to irrigate → IRRIGATE
 *  Default           – soil moisture adequate, no action
 */
export function evaluateDecision(
  currentMoisture: number,
  prediction: Prediction,
  pestRisk: PestRiskResult,
  config: DecisionConfig,
): Decision {
  const intervalWidth = prediction.upper - prediction.lower;
  const ts = Date.now();

  const base = {
    soilMoisture: currentMoisture,
    predictedMoisture: prediction.mean,
    uncertainty: intervalWidth,
    pestRisk: pestRisk.score,
    timestamp: ts,
  };

  // Rule 3 – Safety: interval too wide
  if (intervalWidth >= config.epsilon) {
    return {
      ...base,
      action: 'LOCKED' as ActuatorAction,
      ruleFired: 3,
      reason: `Uncertainty too high (±${(intervalWidth * 100).toFixed(1)}%), manual review required`,
    };
  }

  // Rule 2 – Conflict: dry soil AND high pest risk
  if (
    currentMoisture < config.dryThreshold &&
    pestRisk.score > config.pestThreshold
  ) {
    return {
      ...base,
      action: 'SUSPENDED' as ActuatorAction,
      ruleFired: 2,
      reason:
        `Soil is dry but pest risk is high (${(pestRisk.score * 100).toFixed(1)}%), ` +
        `irrigation suspended to prevent blight spread`,
    };
  }

  // Rule 1 – Safe: soil is dry, safe to irrigate
  if (currentMoisture < config.dryThreshold) {
    return {
      ...base,
      action: 'IRRIGATE' as ActuatorAction,
      ruleFired: 1,
      reason: `Soil moisture below threshold (${(currentMoisture * 100).toFixed(1)}%), safe to irrigate`,
    };
  }

  // Default – no action needed (return a Decision with no irrigation)
  // We re-use ruleFired: 1 to signify the basic moisture check passed (adequate).
  // Action is not IRRIGATE/SUSPENDED/LOCKED — we represent "no action" via
  // the reason string; the simulation uses action !== 'IRRIGATE' to skip watering.
  return {
    ...base,
    // ActuatorAction type only has IRRIGATE | SUSPENDED | LOCKED,
    // so we use SUSPENDED as "hold / do nothing" since moisture is fine.
    action: 'SUSPENDED' as ActuatorAction,
    ruleFired: 1,
    reason: `Soil moisture adequate (${(currentMoisture * 100).toFixed(1)}%)`,
  };
}

/* ── Blind (naïve) decision ──────────────────────────────────────── */

/**
 * Simple threshold-only decision with no uncertainty or pest check.
 * Used as a baseline comparison farm.
 */
export function evaluateBlindDecision(
  currentMoisture: number,
  predictedMoisture: number,
  dryThreshold: number,
): Decision {
  const shouldIrrigate = currentMoisture < dryThreshold;
  return {
    action: shouldIrrigate ? 'IRRIGATE' : ('SUSPENDED' as ActuatorAction),
    ruleFired: 1,
    reason: shouldIrrigate
      ? `Soil moisture below threshold (${(currentMoisture * 100).toFixed(1)}%), irrigating`
      : `Soil moisture adequate (${(currentMoisture * 100).toFixed(1)}%)`,
    soilMoisture: currentMoisture,
    predictedMoisture,
    uncertainty: 0,
    pestRisk: 0,
    timestamp: Date.now(),
  };
}

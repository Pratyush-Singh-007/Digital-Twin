import type {
  WeatherDataPoint,
  SimulationConfig,
  SimulationResult,
  FarmResult,
  CatastrophicError,
  DropoutSweepPoint,
  Decision,
} from '../types';
import { SurrogateModel } from '../model/surrogate';
import { computePestRisk } from '../agronomy/pestRisk';
import { evaluateDecision, evaluateBlindDecision } from '../decision/rules';
import { applyCorruption } from '../data/corruptionInjector';

/**
 * Execute a full seasonal simulation comparing the Confidence-Blind farm
 * and the Uncertainty-Gated farm on identical microclimate data and corruption.
 */
export function runSeasonSimulation(
  data: WeatherDataPoint[],
  config: SimulationConfig,
): SimulationResult {
  if (data.length < 48) {
    const emptyFarm: FarmResult = {
      name: 'Empty',
      decisions: [],
      errors: [],
      pestIrrigationErrors: 0,
      overwaterErrors: 0,
      underwaterErrors: 0,
      totalErrors: 0,
      waterUsedLitresHa: 0,
      manualReviews: 0,
    };
    return {
      blindFarm: { ...emptyFarm, name: 'Confidence-Blind Farm' },
      gatedFarm: { ...emptyFarm, name: 'Uncertainty-Gated Farm' },
      groundTruth: data,
      totalHours: 0,
    };
  }

  // 1. Split into training (first 30%) and simulation test season (remaining 70%)
  const trainSplit = Math.max(30, Math.floor(data.length * 0.3));
  const trainData = data.slice(0, trainSplit);
  const testSeason = data.slice(trainSplit);

  // Train surrogate model once on clean training data
  const model = new SurrogateModel();
  model.train(trainData);

  // 2. Corrupt test season using configured dropout rate
  const corruptedDataset = applyCorruption(
    testSeason,
    config.dropoutRate,
    config.heatSpike ?? false,
    config.droughtShock ?? false,
    config.seed,
  );
  const corruptedView = corruptedDataset.data;

  // Farm accumulators
  const blindDecisions: Decision[] = [];
  const gatedDecisions: Decision[] = [];
  const blindErrors: CatastrophicError[] = [];
  const gatedErrors: CatastrophicError[] = [];

  let blindWater = 0;
  let gatedWater = 0;
  let gatedManualReviews = 0;

  // Water per irrigation event: 5 mm = 5 litres/m² = 50,000 litres/hectare
  const WATER_PER_IRRIGATION = 50000;

  // 3. Step hour by hour through test season
  // Start from index 24 to have adequate rolling window
  for (let i = 24; i < testSeason.length; i++) {
    const cleanGroundTruth = testSeason[i];
    const cleanWindow = testSeason.slice(i - 24, i);
    const windowWithCorruption = corruptedView.slice(i - 24, i);

    // Latest observed moisture from corrupted telemetry (imputed/last-known)
    let observedMoisture = 0.25;
    for (let k = windowWithCorruption.length - 1; k >= 0; k--) {
      const pt = windowWithCorruption[k];
      if (pt !== null) {
        observedMoisture = pt.soilMoisture;
        break;
      }
    }

    // Model prediction with conformal uncertainty band
    const prediction = model.predict(windowWithCorruption);

    // Agronomic risk scored from telemetry
    const pestRisk = computePestRisk(windowWithCorruption, config.pestParams);

    // Ground truth pest risk scored from CLEAN data
    const truePestRisk = computePestRisk(cleanWindow, config.pestParams);

    // Decision: Blind Farm (ignores uncertainty & pest conflict)
    const blindDecision = evaluateBlindDecision(
      observedMoisture,
      prediction.mean,
      config.decisionConfig.dryThreshold,
    );
    blindDecisions.push(blindDecision);

    // Decision: Uncertainty-Gated Farm (Rules 1-3)
    const gatedDecision = evaluateDecision(
      observedMoisture,
      prediction,
      pestRisk,
      config.decisionConfig,
    );
    gatedDecisions.push(gatedDecision);

    if (gatedDecision.action === 'LOCKED') {
      gatedManualReviews++;
    }

    // Water usage accounting
    if (blindDecision.action === 'IRRIGATE') {
      blindWater += WATER_PER_IRRIGATION;
    }
    if (gatedDecision.action === 'IRRIGATE') {
      gatedWater += WATER_PER_IRRIGATION;
    }

    // ── Evaluate Catastrophic Errors against Ground Truth ──
    const trueMoisture = cleanGroundTruth.soilMoisture;
    const isActuallyDry = trueMoisture < config.decisionConfig.dryThreshold - 0.05;
    const isActuallyWet = trueMoisture > config.decisionConfig.dryThreshold + 0.05;
    const truePestCrisis = truePestRisk.score > config.decisionConfig.pestThreshold;

    // Check Blind Farm
    if (blindDecision.action === 'IRRIGATE') {
      if (truePestCrisis) {
        blindErrors.push({
          type: 'pest_irrigation',
          hour: i,
          detail: `Irrigated during active blight condition (Pest risk: ${(truePestRisk.score * 100).toFixed(0)}%)`,
        });
      } else if (isActuallyWet) {
        blindErrors.push({
          type: 'overwater',
          hour: i,
          detail: `Irrigated on corrupted sensor reading when soil was saturated (${(trueMoisture * 100).toFixed(1)}%)`,
        });
      }
    } else {
      if (isActuallyDry) {
        blindErrors.push({
          type: 'underwater',
          hour: i,
          detail: `Failed to irrigate parched soil (${(trueMoisture * 100).toFixed(1)}%)`,
        });
      }
    }

    // Check Gated Farm
    if (gatedDecision.action === 'IRRIGATE') {
      if (truePestCrisis) {
        gatedErrors.push({
          type: 'pest_irrigation',
          hour: i,
          detail: `Irrigated during high pest danger window`,
        });
      } else if (isActuallyWet) {
        gatedErrors.push({
          type: 'overwater',
          hour: i,
          detail: `Over-watered soil that was already wet`,
        });
      }
    } else if (gatedDecision.action === 'SUSPENDED' && gatedDecision.ruleFired === 1) {
      // Decided adequate when actually parched
      if (isActuallyDry) {
        gatedErrors.push({
          type: 'underwater',
          hour: i,
          detail: `Missed irrigation while soil moisture was deficit`,
        });
      }
    }
    // If LOCKED or SUSPENDED by Rule 2/3, it is safe abstention, NOT an autonomous control error!
  }

  const countErrors = (errs: CatastrophicError[]) => ({
    pest: errs.filter((e) => e.type === 'pest_irrigation').length,
    over: errs.filter((e) => e.type === 'overwater').length,
    under: errs.filter((e) => e.type === 'underwater').length,
  });

  const blindCounts = countErrors(blindErrors);
  const gatedCounts = countErrors(gatedErrors);

  const blindFarm: FarmResult = {
    name: 'Confidence-Blind Farm',
    decisions: blindDecisions,
    errors: blindErrors,
    pestIrrigationErrors: blindCounts.pest,
    overwaterErrors: blindCounts.over,
    underwaterErrors: blindCounts.under,
    totalErrors: blindErrors.length,
    waterUsedLitresHa: blindWater,
    manualReviews: 0,
  };

  const gatedFarm: FarmResult = {
    name: 'Uncertainty-Gated Farm',
    decisions: gatedDecisions,
    errors: gatedErrors,
    pestIrrigationErrors: gatedCounts.pest,
    overwaterErrors: gatedCounts.over,
    underwaterErrors: gatedCounts.under,
    totalErrors: gatedErrors.length,
    waterUsedLitresHa: gatedWater,
    manualReviews: gatedManualReviews,
  };

  return {
    blindFarm,
    gatedFarm,
    groundTruth: testSeason.slice(24),
    totalHours: testSeason.length - 24,
  };
}

/**
 * Run dropout sweep at 10%, 20%, 30%, and 40% dropout rates.
 * Generates live data points for error rates and water usage.
 */
export function runDropoutSweep(
  data: WeatherDataPoint[],
  config: Omit<SimulationConfig, 'dropoutRate'>,
  rates: number[] = [0.1, 0.2, 0.3, 0.4],
): DropoutSweepPoint[] {
  const points: DropoutSweepPoint[] = [];

  for (const rate of rates) {
    const res = runSeasonSimulation(data, {
      ...config,
      dropoutRate: rate,
      seed: Math.round(rate * 10000) + 2026,
    });
    points.push({
      dropoutRate: Math.round(rate * 100),
      blindErrors: res.blindFarm.totalErrors,
      gatedErrors: res.gatedFarm.totalErrors,
      blindWater: res.blindFarm.waterUsedLitresHa,
      gatedWater: res.gatedFarm.waterUsedLitresHa,
    });
  }

  return points;
}

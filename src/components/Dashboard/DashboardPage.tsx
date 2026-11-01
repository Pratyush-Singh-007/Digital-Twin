import React, { useMemo } from 'react';
import type { WeatherDataPoint, PestRiskParams, LocationPreset } from '../../types';
import { SurrogateModel } from '../../model/surrogate';
import { computePestRisk } from '../../agronomy/pestRisk';
import { evaluateDecision } from '../../decision/rules';
import { SoilMoistureChart } from './SoilMoistureChart';
import { SensorNoisePanel } from './SensorNoisePanel';
import { UncertaintyMeter } from './UncertaintyMeter';
import { PestRiskGauge } from './PestRiskGauge';
import { ActuatorPanel } from './ActuatorPanel';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
  cleanData: WeatherDataPoint[];
  corruptedData: (WeatherDataPoint | null)[];
  corruptedIndices: Set<number>;
  isLoading: boolean;
  error: string | null;
  location: LocationPreset;
  dropoutRate: number;
  setDropoutRate: (r: number) => void;
  heatSpike: boolean;
  setHeatSpike: (val: boolean | ((prev: boolean) => boolean)) => void;
  droughtShock: boolean;
  setDroughtShock: (val: boolean | ((prev: boolean) => boolean)) => void;
  resetCorruption: () => void;
  epsilon: number;
  setEpsilon: (e: number) => void;
  dryThreshold: number;
  pestParams: PestRiskParams;
  setPestParams: (params: PestRiskParams) => void;
}

export const DashboardPage: React.FC<Props> = ({
  cleanData,
  corruptedData,
  corruptedIndices,
  isLoading,
  error,
  location,
  dropoutRate,
  setDropoutRate,
  heatSpike,
  setHeatSpike,
  droughtShock,
  setDroughtShock,
  resetCorruption,
  epsilon,
  setEpsilon,
  dryThreshold,
  pestParams,
  setPestParams,
}) => {
  // 1. Train surrogate model once on clean dataset
  const surrogate = useMemo(() => {
    const model = new SurrogateModel();
    if (cleanData.length > 24) {
      model.train(cleanData);
    }
    return model;
  }, [cleanData]);

  // 2. Compute current 24-hour telemetry window with applied noise/corruption
  const currentWindow = useMemo(() => {
    if (corruptedData.length === 0) return [];
    return corruptedData.slice(-24);
  }, [corruptedData]);

  // 3. Single-step prediction with conformal uncertainty band
  const prediction = useMemo(() => {
    return surrogate.predict(currentWindow);
  }, [surrogate, currentWindow]);

  // 4. Multi-step forward horizon (12 hours ahead)
  const forecastPoints = useMemo(() => {
    return surrogate.forecastHorizon(currentWindow, 12);
  }, [surrogate, currentWindow]);

  // 5. Agronomic pest risk from latest telemetry
  const pestRisk = useMemo(() => {
    return computePestRisk(currentWindow, pestParams);
  }, [currentWindow, pestParams]);

  // 6. Latest observed soil moisture
  const latestMoisture = useMemo(() => {
    for (let i = currentWindow.length - 1; i >= 0; i--) {
      const pt = currentWindow[i];
      if (pt !== null) return pt.soilMoisture;
    }
    return 0.28;
  }, [currentWindow]);

  // 7. Decision rule evaluation
  const decision = useMemo(() => {
    return evaluateDecision(latestMoisture, prediction, pestRisk, {
      dryThreshold,
      epsilon,
      pestThreshold: 0.70,
    });
  }, [latestMoisture, prediction, pestRisk, dryThreshold, epsilon]);

  if (isLoading && cleanData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <Loader2 className="w-8 h-8 text-agri-600 animate-spin" />
        <p className="text-sm text-gray-500">Connecting to telemetry stream for {location.name}...</p>
      </div>
    );
  }

  if (error && cleanData.length === 0) {
    return (
      <div className="card max-w-lg mx-auto text-center space-y-3 p-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Telemetry Error</h3>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  const intervalWidth = prediction.upper - prediction.lower;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actuator Status Card on Top for Immediate Operational Clarity */}
      <ActuatorPanel decision={decision} />

      {/* Main Forecast Chart */}
      <SoilMoistureChart
        cleanData={cleanData}
        corruptedData={corruptedData}
        corruptedIndices={corruptedIndices}
        currentPrediction={prediction}
        forecastPoints={forecastPoints}
      />

      {/* Controls & Meters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SensorNoisePanel
          dropoutRate={dropoutRate}
          setDropoutRate={setDropoutRate}
          heatSpike={heatSpike}
          setHeatSpike={setHeatSpike}
          droughtShock={droughtShock}
          setDroughtShock={setDroughtShock}
          onReset={resetCorruption}
          corruptedData={corruptedData}
          corruptedIndices={corruptedIndices}
          totalCount={cleanData.length}
        />

        <UncertaintyMeter
          intervalWidth={intervalWidth}
          epsilon={epsilon}
          setEpsilon={setEpsilon}
        />
      </div>

      {/* Agronomic Risk Section */}
      <PestRiskGauge
        pestRisk={pestRisk}
        params={pestParams}
        onParamsChange={setPestParams}
      />
    </div>
  );
};

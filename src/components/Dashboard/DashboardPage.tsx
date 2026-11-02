import React, { useMemo } from 'react';
import type { DataSourceStatus, WeatherDataPoint, PestRiskParams, LocationPreset } from '../../types';
import { SurrogateModel } from '../../model/surrogate';
import { computePestRisk } from '../../agronomy/pestRisk';
import { evaluateDecision } from '../../decision/rules';
import { FieldTwin3D } from './FieldTwin3D';
import { Loader2, AlertCircle } from 'lucide-react';
import { HeadingNote } from '../HeadingNote';
import { OperationalReadiness } from './OperationalReadiness';

interface Props {
  cleanData: WeatherDataPoint[];
  corruptedData: (WeatherDataPoint | null)[];
  corruptedIndices: Set<number>;
  isLoading: boolean;
  error: string | null;
  location: LocationPreset;
  dataSource: DataSourceStatus;
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
  dataSource,
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

  // 4. Agronomic pest risk from latest telemetry
  const pestRisk = useMemo(() => {
    return computePestRisk(currentWindow, pestParams);
  }, [currentWindow, pestParams]);

  // 5. Latest observed soil moisture
  const latestMoisture = useMemo(() => {
    for (let i = currentWindow.length - 1; i >= 0; i--) {
      const pt = currentWindow[i];
      if (pt !== null) return pt.soilMoisture;
    }
    return 0.28;
  }, [currentWindow]);

  // 6. Decision rule evaluation
  const decision = useMemo(() => {
    return evaluateDecision(latestMoisture, prediction, pestRisk, {
      dryThreshold,
      epsilon,
      pestThreshold: 0.70,
      pathogenGateEnabled: false,
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
        <HeadingNote>Live data unavailable</HeadingNote>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  const intervalWidth = prediction.upper - prediction.lower;

  return (
    <div className="space-y-5 animate-fade-in">
      <FieldTwin3D
        data={currentWindow}
        moisture={latestMoisture}
        uncertainty={intervalWidth}
        pestRisk={pestRisk}
        dropoutRate={dropoutRate}
        decision={decision}
        epsilon={epsilon}
        setEpsilon={setEpsilon}
        pestParams={pestParams}
        setPestParams={setPestParams}
        setDropoutRate={setDropoutRate}
        heatSpike={heatSpike}
        setHeatSpike={setHeatSpike}
        droughtShock={droughtShock}
        setDroughtShock={setDroughtShock}
        onReset={resetCorruption}
        corruptedIndices={corruptedIndices}
        totalCount={cleanData.length}
      />
      <OperationalReadiness dataSource={dataSource} location={location} currentWindow={currentWindow} />
    </div>
  );
};

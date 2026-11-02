import React, { useState } from 'react';
import type { TabId, LocationPreset, PestRiskParams } from './types';
import { LOCATIONS } from './data/locations';
import { DEFAULT_PEST_PARAMS } from './agronomy/pestRisk';
import { useWeatherData } from './hooks/useWeatherData';
import { useTheme } from './hooks/useTheme';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { DecisionLogicPage } from './components/DecisionLogic/DecisionLogicPage';
import { SeasonSimPage } from './components/SeasonSim/SeasonSimPage';
import { AboutPage } from './components/About/AboutPage';
import { GuidedDemo } from './components/GuidedDemo';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [location, setLocation] = useState<LocationPreset>(LOCATIONS[0]); // Default: Kanpur, UP
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<number>(26.45);
  const [customLon, setCustomLon] = useState<number>(80.35);

  // Agronomic and uncertainty parameters
  const [epsilon, setEpsilon] = useState<number>(0.12); // Uncertainty bound (12%)
  const [dryThreshold, setDryThreshold] = useState<number>(0.25); // 25% volumetric moisture
  const [pestParams, setPestParams] = useState<PestRiskParams>(DEFAULT_PEST_PARAMS);

  // Guided demo modal visibility
  const [showDemo, setShowDemo] = useState<boolean>(false);

  // Theme hook (light/dark)
  const { isDark, toggle: toggleTheme } = useTheme();

  // Telemetry stream and sensor noise simulator
  const {
    cleanData,
    corruptedData,
    corruptedIndices,
    isLoading,
    error,
    dataSource,
    lastUpdated,
    refetch,
    dropoutRate,
    setDropoutRate,
    heatSpike,
    setHeatSpike,
    droughtShock,
    setDroughtShock,
    resetCorruption,
  } = useWeatherData(location, useCustom, customLat, customLon);

  const handleSetCustomCoords = (lat: number, lon: number) => {
    setCustomLat(lat);
    setCustomLon(lon);
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isDark={isDark}
      toggleTheme={toggleTheme}
      dataSource={dataSource}
      lastUpdated={lastUpdated}
      location={location}
      onSelectLocation={setLocation}
      customLat={customLat}
      customLon={customLon}
      useCustom={useCustom}
      onSetCustomCoords={handleSetCustomCoords}
      onToggleCustom={setUseCustom}
      onStartDemo={() => setShowDemo(true)}
      onRefreshData={refetch}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          cleanData={cleanData}
          corruptedData={corruptedData}
          corruptedIndices={corruptedIndices}
          isLoading={isLoading}
          error={error}
          location={location}
          dataSource={dataSource}
          dropoutRate={dropoutRate}
          setDropoutRate={setDropoutRate}
          heatSpike={heatSpike}
          setHeatSpike={setHeatSpike}
          droughtShock={droughtShock}
          setDroughtShock={setDroughtShock}
          resetCorruption={resetCorruption}
          epsilon={epsilon}
          setEpsilon={setEpsilon}
          dryThreshold={dryThreshold}
          pestParams={pestParams}
          setPestParams={setPestParams}
        />
      )}

      {activeTab === 'decision' && (
        <DecisionLogicPage
          cleanData={cleanData}
          corruptedData={corruptedData}
          corruptedIndices={corruptedIndices}
          epsilon={epsilon}
          setEpsilon={setEpsilon}
          dryThreshold={dryThreshold}
          setDryThreshold={setDryThreshold}
          pestParams={pestParams}
        />
      )}

      {activeTab === 'simulation' && <SeasonSimPage cleanData={cleanData} />}

      {activeTab === 'about' && <AboutPage />}

      {/* Guided Walkthrough overlay */}
      <GuidedDemo
        isOpen={showDemo}
        onClose={() => setShowDemo(false)}
        onSetDropout={setDropoutRate}
        onSetHeatSpike={(val) => setHeatSpike(val)}
        onSetDroughtShock={(val) => setDroughtShock(val)}
        onSetEpsilon={setEpsilon}
        onReset={resetCorruption}
        onSetTab={setActiveTab}
      />
    </Layout>
  );
}

export default App;

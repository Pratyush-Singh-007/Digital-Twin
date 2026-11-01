import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WeatherDataPoint, LocationPreset, DataSourceStatus } from '../types';
import { fetchWeatherData } from '../data/fetchWeather';
import { generateSyntheticSeason } from '../data/syntheticData';
import { applyCorruption } from '../data/corruptionInjector';

export function useWeatherData(
  location: LocationPreset,
  useCustom: boolean = false,
  customLat: number = 26.45,
  customLon: number = 80.35,
) {
  const [cleanData, setCleanData] = useState<WeatherDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Noise simulation state
  const [dropoutRate, setDropoutRate] = useState<number>(0);
  const [heatSpike, setHeatSpike] = useState<boolean>(false);
  const [droughtShock, setDroughtShock] = useState<boolean>(false);

  const effectiveLat = useCustom ? customLat : location.lat;
  const effectiveLon = useCustom ? customLon : location.lon;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDataSource('loading');
    setError(null);

    try {
      const livePoints = await fetchWeatherData(effectiveLat, effectiveLon);
      if (livePoints && livePoints.length > 24) {
        setCleanData(livePoints);
        setDataSource('live');
        setLastUpdated(new Date());
      } else {
        // Fallback to rich synthetic season (90 days of realistic Indian farm microclimate)
        console.warn('Live API unavailable or insufficient data. Using synthetic season fallback.');
        const synthetic = generateSyntheticSeason(90);
        setCleanData(synthetic);
        setDataSource('offline');
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('API error, falling back to synthetic dataset:', err);
      const synthetic = generateSyntheticSeason(90);
      setCleanData(synthetic);
      setDataSource('offline');
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [effectiveLat, effectiveLon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply corruption reactively whenever cleanData, dropoutRate, heatSpike, or droughtShock changes
  const corruptedDataset = useMemo(() => {
    return applyCorruption(cleanData, dropoutRate, heatSpike, droughtShock);
  }, [cleanData, dropoutRate, heatSpike, droughtShock]);

  const resetCorruption = useCallback(() => {
    setDropoutRate(0);
    setHeatSpike(false);
    setDroughtShock(false);
  }, []);

  return {
    cleanData,
    corruptedData: corruptedDataset.data,
    corruptedIndices: corruptedDataset.corruptedIndices,
    isLoading,
    error,
    dataSource,
    lastUpdated,
    refetch: loadData,
    dropoutRate,
    setDropoutRate,
    heatSpike,
    setHeatSpike,
    droughtShock,
    setDroughtShock,
    resetCorruption,
  };
}

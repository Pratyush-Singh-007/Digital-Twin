// ─── Location ──────────────────────────────────────────────────────
export interface LocationPreset {
  name: string;
  lat: number;
  lon: number;
  state: string;
  crop: string;
}

// ─── Weather / Telemetry ───────────────────────────────────────────
export interface WeatherDataPoint {
  time: string;               // ISO 8601
  timestamp: number;          // Unix ms
  temperature: number;        // °C
  humidity: number;           // % RH
  dewPoint: number;           // °C
  rain: number;               // mm in preceding hour
  radiation: number;          // W/m²  (shortwave downward)
  et0: number;                // mm/h  reference evapotranspiration
  vpd: number;                // kPa   vapour-pressure deficit
  soilMoisture: number;       // m³/m³ volumetric (0 – 0.60)
  soilTemperature: number;    // °C
}

// ─── Corruption ────────────────────────────────────────────────────
export interface CorruptedDataset {
  data: (WeatherDataPoint | null)[];   // null = dropped sensor reading
  clean: WeatherDataPoint[];           // original uncorrupted copy
  corruptedIndices: Set<number>;
  dropoutRate: number;
}

export type CorruptionType = 'dropout' | 'heat_spike' | 'drought_shock';

// ─── Model ─────────────────────────────────────────────────────────
export interface Prediction {
  mean: number;
  lower: number;
  upper: number;
  sigma: number;              // estimated standard deviation
}

export interface ForecastPoint {
  hour: number;               // horizon offset (1 … H)
  prediction: Prediction;
  actual?: number;            // if ground truth is available
}

export interface ModelInterface {
  train(data: WeatherDataPoint[]): void;
  predict(window: (WeatherDataPoint | null)[]): Prediction;
  forecastHorizon(window: (WeatherDataPoint | null)[], h: number): ForecastPoint[];
  getMetrics(): ModelMetrics;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  picp: number;               // prediction interval coverage probability
  mpiw: number;               // mean prediction interval width
  n: number;                  // sample count
}

// ─── Agronomy / Pest Risk ──────────────────────────────────────────
export interface PestRiskParams {
  tempLow: number;            // °C lower bound of pathogen window
  tempHigh: number;           // °C upper bound
  rhThreshold: number;        // % sustained humidity threshold
  leafWetHours: number;       // hours needed for infection
  dewPointDepression: number; // °C threshold for leaf wetness proxy
}

export interface PestRiskResult {
  score: number;              // 0 – 1 composite
  tempScore: number;          // 0 – 1
  humidityScore: number;      // 0 – 1  (sustained hours / required hours)
  leafWetnessScore: number;   // 0 – 1
  hoursInTempWindow: number;
  hoursHighHumidity: number;
  hoursLeafWet: number;
  params: PestRiskParams;
}

// ─── Decision Engine ───────────────────────────────────────────────
export type ActuatorAction = 'IRRIGATE' | 'SUSPENDED' | 'LOCKED';

export interface DecisionConfig {
  dryThreshold: number;       // m³/m³  below this = "dry"
  epsilon: number;            // uncertainty threshold (interval width)
  pestThreshold: number;      // wetness-proxy threshold (default 0.70)
  /** Research-only. Kept off until a crop-specific disease model is validated. */
  pathogenGateEnabled?: boolean;
}

export interface Decision {
  action: ActuatorAction;
  ruleFired: 1 | 2 | 3;
  reason: string;
  soilMoisture: number;
  predictedMoisture: number;
  uncertainty: number;        // interval width
  pestRisk: number;
  /** Context for a human scout; never an irrigation command on its own. */
  advisory?: string;
  timestamp: number;
}

export interface DecisionHistoryEntry extends Decision {
  hour: number;
}

// ─── Season Simulation ─────────────────────────────────────────────
export interface SimulationConfig {
  days: number;
  dropoutRate: number;
  decisionConfig: DecisionConfig;
  pestParams: PestRiskParams;
  heatSpike?: boolean;
  droughtShock?: boolean;
  seed?: number;
}

export interface CatastrophicError {
  type: 'pest_irrigation' | 'overwater' | 'underwater';
  hour: number;
  detail: string;
}

export interface FarmResult {
  name: string;
  decisions: Decision[];
  errors: CatastrophicError[];
  pestIrrigationErrors: number;
  overwaterErrors: number;
  underwaterErrors: number;
  totalErrors: number;
  waterUsedLitresHa: number;
  manualReviews: number;
}

export interface SimulationResult {
  blindFarm: FarmResult;
  gatedFarm: FarmResult;
  groundTruth: WeatherDataPoint[];
  totalHours: number;
}

export interface DropoutSweepPoint {
  dropoutRate: number;
  blindErrors: number;
  gatedErrors: number;
  blindWater: number;
  gatedWater: number;
}

// ─── UI State ──────────────────────────────────────────────────────
export type TabId = 'dashboard' | 'decision' | 'simulation' | 'about';

export type DataSourceStatus = 'live' | 'offline' | 'loading' | 'error';

export interface AppState {
  location: LocationPreset;
  customLat: number;
  customLon: number;
  useCustom: boolean;
  dataSource: DataSourceStatus;
  dropoutRate: number;
  epsilon: number;
  dryThreshold: number;
  pestParams: PestRiskParams;
  lastUpdated: Date | null;
}

// ─── Guided Demo ───────────────────────────────────────────────────
export interface GuidedDemoStep {
  id: string;
  title: string;
  description: string;
  action: () => void;
  highlight?: string;         // CSS selector to highlight
}

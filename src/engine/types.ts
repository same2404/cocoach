export interface PlayerAnalytics {
  playerId: string;
  playerName: string;
  position: string;

  acwr: ACWRResult;
  weeklyLoad: WeeklyLoadResult;
  gpsBaseline: GPSBaseline;
  sprintDeficit: DeficitResult;
  accelDecelDeficit: DeficitResult;
  metabolicPower: MetabolicPowerResult;
  distanceZones: DistanceZones;
  rsaScore: RSAResult;
  highSpeedDistance: number;
  hrRecovery: HRRecoveryResult;
  loadAmpel: 'Grun' | 'Gelb' | 'Rot';
  loadAmpelReason: string;

  status: PlayerStatusResult;
  rtpRiskScore: number;
  rtpPhase: string;
  rtpClearance: RTPClearance;

  trainerRecommendation: string;
  riskAnalysis: string;
}

export interface ACWRResult {
  ratio: number;
  acuteLoad: number;
  chronicLoad: number;
  trend: 'steigend' | 'stabil' | 'fallend';
  status: 'optimal' | 'vorsicht' | 'gefahr' | 'keine_daten';
  text: string;
}

export interface WeeklyLoadResult {
  currentWeek: number;
  last7d: number;
  last14d: number;
  last28d: number;
  avgPerSession: number;
  sessionsCount: number;
  trend: 'steigend' | 'stabil' | 'fallend';
}

export interface GPSBaseline {
  avgDistanceKm: number;
  avgHighSpeedM: number;
  avgSprintM: number;
  avgMaxSpeed: number;
  avgSprintCount: number;
  sampleCount: number;
  positionBenchmark: PositionBenchmark;
}

export interface PositionBenchmark {
  position: string;
  expectedDistanceKm: number;
  expectedHighSpeedM: number;
  expectedSprintM: number;
  expectedMaxSpeed: number;
  expectedSprintCount: number;
}

export interface DeficitResult {
  current: number;
  benchmark: number;
  deficit: number;
  percent: number;
  status: 'ueber_durchschnitt' | 'durchschnitt' | 'unter_durchschnitt' | 'keine_daten';
}

export interface MetabolicPowerResult {
  avgPowerW: number;
  peakPowerW: number;
  totalEnergyKJ: number;
  classification: 'hoch' | 'mittel' | 'niedrig' | 'keine_daten';
}

export interface DistanceZones {
  z1Walking: number;
  z2Jogging: number;
  z3Laufen: number;
  z4Schnelllauf: number;
  z5Sprint: number;
  z6MaxSprint: number;
  totalKm: number;
}

export interface RSAResult {
  score: number;
  dropoffPercent: number;
  status: 'stabil' | 'abfallend' | 'kritisch' | 'keine_daten';
  text: string;
}

export interface HRRecoveryResult {
  avgRecoveryBpm: number;
  status: 'gut' | 'mittel' | 'schlecht' | 'keine_daten';
  restingHR: number;
  maxHR: number;
}

export interface PlayerStatusResult {
  isInjured: boolean;
  injuryType: string;
  fitness: string;
  loadAmpel: 'Grun' | 'Gelb' | 'Rot';
  physioStatus: string;
  lastPhysioDate: string;
  daysSinceLastUpload: number;
  availability: 'verfuegbar' | 'teilweise' | 'ausfall';
}

export interface RTPClearance {
  medical: boolean;
  physio: boolean;
  trainer: boolean;
  overallCleared: boolean;
  phase: string;
  estimatedReturn: string;
}

export interface TeamAnalytics {
  teamAverage: TeamAverages;
  positionBaselines: Record<string, PositionBenchmark>;
  availability: TeamAvailability;
  intensitySuggestion: IntensitySuggestion;
  dailyGoal: string;
  weeklyGoal: string;
  riskAlerts: RiskAlert[];
  teamRecommendation: string;
}

export interface TeamAverages {
  avgDistanceKm: number;
  avgHighSpeedM: number;
  avgSprintM: number;
  avgMaxSpeed: number;
  avgSprintCount: number;
  avgWorkloadIndex: number;
  avgHR: number;
  squadSize: number;
  fitCount: number;
  partialCount: number;
  outCount: number;
}

export interface TeamAvailability {
  total: number;
  fit: number;
  partial: number;
  out: number;
  rate: number;
  unavailablePlayers: string[];
}

export interface IntensitySuggestion {
  level: 'niedrig' | 'mittel' | 'hoch' | 'regeneration';
  reason: string;
  focus: string;
  warnings: string[];
}

export interface RiskAlert {
  playerId: string;
  playerName: string;
  level: 'hoch' | 'mittel' | 'niedrig';
  type: 'verletzung' | 'ueberlastung' | 'formabfall' | 'ermuedung';
  message: string;
  action: string;
}

export interface EngineUpdate {
  timestamp: string;
  players: PlayerAnalytics[];
  team: TeamAnalytics;
}

export type TabId = 'dashboard' | 'personnel' | 'attendance' | 'trainer_view' | 'yearly' | 'cards' | 
                   'scouting' | 'budget_finance' | 'meetings_calendar' | 'tacticboard' | 'profi_3d_taktiktafel' | 'individual_control' | 'runs_sw' | 'physio_plan' | 'summer_prep' | 'winter_prep' | 'team_list' | 'developer_tasks' | 'training_planning' | 'competitive_planning' | 'test_planning' | 'u23_planning' | 'match_report' | 'access_control' | 'player_portal' | 'academy_analysis' | 'champions_cup' | 'video_analysis' | 'tracker_academy_report' | 'license_admin' | 'match_analysis_pro' | 'standards_registry' | 'analytics_charts' | 'player_report_pro';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  fbTeamId?: string;
  fbClubId?: string;
  league?: string;
  region?: string;
  isDemo: boolean;
  createdAt: number;
  createdBy?: string;
  status: 'active' | 'setup' | 'archived';
}

export interface ClubConfig {
  clubs: Club[];
  activeClubId: string;
}

export interface PerformanceCategoryScore {
  score: number; // 0-100
  analysisText: string;
}

export interface TrackerAcademyReport {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  age?: number;
  analysisDate: string;
  createdAt: number;
  rawFileName?: string;
  
  // Telemetry raw metrics
  metrics: {
    totalDistanceKm: number;
    maxSpeedKmh: number;
    avgSpeedKmh: number;
    sprintCount: number;
    highSpeedDistanceMeters: number;
    accelerationsCount: number;
    decelerationsCount: number;
    avgHeartRateBpm: number;
    maxHeartRateBpm: number;
    hrRecoveryDropBpm: number;
    workloadScore: number;
    repeatSprintDropoffPercent: number;
  };

  // 5 Performance Domains
  categories: {
    ausdauer: PerformanceCategoryScore;
    belastungsstruktur: PerformanceCategoryScore;
    gesamtfitness: PerformanceCategoryScore;
    endgeschwindigkeit: PerformanceCategoryScore;
    repeatSprintAbility: PerformanceCategoryScore;
  };

  // Overall Score & Comparison
  overallScore: number; // 0-100
  teamAverageOverall: number;
  classification: string; // e.g. "Überdurchschnittlich (Top-Performer)"

  // Strengths & Improvement
  strengths: string[];
  improvementAreas: string[];

  // Trainer Recommendations
  trainerRecommendations: {
    measures: string[];
    focusAreasNextWeeks: string;
    loadControlNotes: string;
  };

  // Raw analysis summary / notes
  rawAnalysisNotes?: string;
}

export interface AcademyPlayerEvaluation {
  spieler: string;
  note: number;
  begründung: string;
  fokus: string;
  kognitiveFaehigkeiten?: string[];
}

export interface AcademySessionEvaluation {
  id?: string;
  datum: string;
  bezeichnung?: string;
  typ: 'Training' | 'Spiel' | string;
  bewertungen: AcademyPlayerEvaluation[];
  createdAt?: number;
  weekNumber?: number;
  rawInputNotes?: string;
}

export interface AcademyPlayerWeeklySummary {
  spieler: string;
  durchschnitt: number;
  entwicklung: 'positiv' | 'neutral' | 'negativ' | string;
  fokus_naechste_woche: string;
}

export interface AcademyWeeklyReport {
  id?: string;
  kwLabel?: string;
  createdAt?: number;
  wochenbericht: AcademyPlayerWeeklySummary[];
  top_spieler: string[];
  kritisch: string[];
  empfehlungen: string;
}

export interface TrackedPerson {
  id: string; // e.g. "P-01"
  team: 'FC Auggen' | 'Gegner' | 'Schiedsrichter';
  jerseyNumber?: string;
  mappedPlayerId?: string; // Linked FC Auggen squad player ID
  mappedPlayerName?: string;
  xPercent: number; // 0-100% position on pitch
  yPercent: number; // 0-100% position on pitch
  intensity: 'Gehen' | 'Trab' | 'Sprint';
  speedKmh: number;
}

export interface TrackedBall {
  xPercent: number;
  yPercent: number;
  heightLevel: 'Boden' | 'Halbhoch' | 'Hochball';
  speedKmh: number;
}

export interface PitchZoneDetection {
  currentZone: 'Auggen Abwehr' | 'Mittelfeld' | 'Angriffszone' | 'Flügel Links' | 'Flügel Rechts' | 'Strafraum';
  ballPossessionTeam: 'FC Auggen' | 'Gegner' | 'Neutral / Zweikampf';
  pressingDensityIndex: number; // 0 to 100
}

export interface TimelineEvent {
  id: string;
  timestampSeconds: number; // exact second in video e.g. 15, 64, 128
  timestampFormatted: string; // "00:15"
  type: 'POSSESSION_CHANGE' | 'HIGH_INTENSITY_SPRINT' | 'ZONE_TRANSITION' | 'BALL_TRACKED' | 'HIGH_DENSITY_PRESSING';
  title: string;
  description: string;
  pitchZone: string;
  importance: 'Hoch' | 'Normal' | 'Info';
  trackedPlayersCount: number;
  ballCoordinates?: { x: number; y: number };
}

export interface SceneClip {
  id: string;
  category: 'TORE' | 'CHANCEN' | 'STANDARDS' | 'PRESSING' | 'AUFBAU' | 'UMSCHALTMOMENTE' | 'LAUFWEGE' | 'FEHLERANALYSE' | 'BALLBESITZ';
  subcategory: string;
  title: string;
  startTimeSeconds: number; // 6s before event
  endTimeSeconds: number; // 6s after event
  timestampFormatted: string; // e.g. "04:15"
  aiCommentary: string; // 1-2 sentence tactical commentary
  participatingPlayerNames: string[];
  participatingPlayerIds?: string[];
  pitchZone: 'Abwehr' | 'Mittelfeld' | 'Angriff' | 'Strafraum' | 'Flügel' | 'Halbraum';
  teamInvolved: 'FC Auggen' | 'Gegner' | 'Beide';
  thumbnailUrl?: string;
  tacticalRating?: string;
  improvementSuggestions?: string;
}

export interface AiVideoAnalysisRecord {
  id: string;
  videoTitle: string;
  videoUrl: string;
  videoFileName?: string;
  uploadDate: string;
  durationSeconds: number;
  fps: number;
  status: 'UPLOADED' | 'PROCESSING' | 'ANALYZED' | 'ERROR';
  progressPercent: number;
  summary: string;
  trackedPersons: TrackedPerson[];
  trackedBall?: TrackedBall;
  pitchDetection?: PitchZoneDetection;
  timelineEvents: TimelineEvent[];
  sceneClips?: SceneClip[];
  rawAiData?: any;
  mappedPlayerIds?: string[];
}

export interface SubstitutionRecord {
  minute: number | string;
  playerIn: string;
  playerOut: string;
  note?: string;
}

export interface GoalRecord {
  minute: number | string;
  scorer: string;
  assist?: string;
  type?: 'Goal' | 'Penalty' | 'OwnGoal' | string;
}

export interface CardDetail {
  minute: number | string;
  player: string;
  cardType: 'Yellow' | 'YellowRed' | 'Red';
  reason?: string;
}

export interface VideoClip {
  id: string;
  title: string;
  category: 'Spiel-Analyse' | 'Gegner-Analyse' | 'Spieler-Momente' | 'Training' | 'Taktik' | 'Sonstiges';
  url: string; // Video URL or data/blob URL
  description?: string;
  playerNames?: string[]; // Tagged players
  timestamp?: string; // e.g. "Minute 34:12"
  createdAt?: string;
}

export interface MatchAnalysis {
  id: string; // analysis id
  matchId?: string | number;
  opponent?: string;
  date?: string;
  kickOff?: string;
  location?: string;
  category?: 'Pflichtspiel' | 'Testspiel' | 'Pokalspiel' | string;
  isHome?: boolean;
  result?: string;

  // Imported Pflichtspiel Base Data
  startingLineup?: string[] | string;
  substitutes?: string[] | string;
  substitutions?: SubstitutionRecord[] | string;
  scorers?: GoalRecord[] | string;
  cards?: CardDetail[] | string;
  matchNotes?: string;
  isAutoImported?: boolean;
  importedMatchTimestamp?: string;

  // Manual Ergänzungen (Match Report / Spielbericht)
  berichtText?: string; // Detaillierter Spielbericht Fließtext
  teamRating?: string | number; // Teamnote (1-10)
  lineupImage?: string;
  lineupImages?: string[];
  openingPlay?: string;
  openingPlayImages?: string[];
  transitionOffensive?: string;
  transitionOffensiveImages?: string[];
  transitionDefensive?: string;
  transitionDefensiveImages?: string[];
  goalChancesOwn?: string;
  goalChancesOwnImages?: string[];
  goalChancesOpponent?: string;
  goalChancesOpponentImages?: string[];
  goalsOwn?: string;
  goalsOpponent?: string;
  goodActions?: string;
  badActions?: string;
  specialMoments?: string;
  standardsOwn?: string;
  standardsOwnImages?: string[];
  standardsOpponent?: string;
  standardsOpponentImages?: string[];
  trainerGood?: string;
  trainerGoodImages?: string[];
  trainerBad?: string;
  trainerBadImages?: string[];
  trainerTactical?: string;
  trainerFazit?: string;
  trainerFazitImages?: string[];
  playerOfTheMatch?: string;
  matchRating?: string; // e.g. "7/10"
  presentations?: string; // Links or notes about game presentations
  presentationImages?: string[]; // Array of image URLs for presentations
  gameVideoUrl?: string; // Single game analysis video URL
  opponentVideoUrl?: string; // Opponent analysis video URL
  playerMomentsVideoUrl?: string; // Player moments video URL
  videoClips?: VideoClip[]; // Array of structured video clips
}

export interface LogEntry {
  id: string;
  timestamp: string;
  dateStr: string;
  timeStr: string;
  tabName: string;
  message: string;
}

export interface Training {
  id: string;
  datum: string;
  wochentag: string;
  uhrzeit: string;
  ort: string;
  inhalte: string;
  teilnehmer: string[]; // IDs or names
  fehlend: string[];    // IDs or names
}

export interface Vorbereitung {
  id: string;
  date: string;
  time: string;
  type: string;
  content: string;
  inhalt?: string; // Alias for content
  intensity: string;
  location: string;
  status?: string; // Added status field
  notes?: string; // Added notes field
  color?: string; // Added color field
  // Detailed session fields to match DayPlan
  athletik?: { start: string; end: string; notes: string };
  vormittag?: { start: string; end: string; notes: string };
  individual?: { start: string; end: string; notes: string };
  video?: { start: string; end: string; notes: string };
  training?: { start: string; end: string; notes: string };
  // Additional fields for PreparationView
  kw?: number;
  day?: string;
  start?: string;
  end?: string;
  opponent?: string;
  remarks?: string;
  te?: number;
  treffpunkt?: string;
  ergebnis?: string;
  // Compatibility with older fields
  datum?: string;
  wochentag?: string;
  gegner?: string;
  ort?: string;
  thema?: string;
  intensität?: string;
}

export type SummerPrepUnit = Vorbereitung;
export type WinterPrepUnit = Vorbereitung;

export interface Spiel {
  id: string;
  datum: string;
  wochentag: string;
  gegner: string;
  heim_auswärts: 'Heim' | 'Auswärts';
  uhrzeit?: string;
  treffpunkt?: string;
  ort?: string;
  ergebnis: string;
  tore: string[];
  karten: string[];
  analyse: string;
}

export interface Finanz {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  pos: string;
  baseSalary: number;
  bonusPerMatch: number;
  seasonExtra: number;
  individualBonus: number;
  sideAgreements: string;
  ist: number;
  nr?: number;
  // Compatibility with older fields
  aktuelles_budget?: number;
  einnahmen?: number;
  ausgaben?: number;
  kategorie?: string;
  datum?: string;
  wochentag?: string;
  notiz?: string;
}

export type FinanceEntry = Finanz;

export interface DayPlan {
  date: string; // ISO string
  athletik: { start: string; end: string; notes: string };
  vormittag: { start: string; end: string; notes: string };
  individual: { start: string; end: string; notes: string };
  video: { start: string; end: string; notes: string };
  training: { start: string; end: string; notes: string };
  activity: string; // Haupt-Aktivität
  time: string; // Uhrzeit for activity
  location: string; // Ort for activity
  treffpunkt?: string; // Added treffpunkt
  opponent?: string; // Added opponent
  ergebnis?: string; // Added ergebnis
  type: 'training' | 'competitive' | 'test' | 'off' | 'Testspiel' | 'Pflichtspiel' | 'Event';
  isHome?: boolean;
  phase: 'summer' | 'winter' | 'season';
  kw?: number;
  te?: number;
  status?: string;
  notes?: string;
}

export interface YearlyPlan {
  [date: string]: DayPlan;
}

export interface CardRecord {
  playerId: string;
  cards: Record<string | number, 'G' | 'GR' | 'R' | ''>; // match id -> card type
}

export interface Opponent {
  id: string;
  name: string;
  logo?: string;
  notes?: string;
}

export interface Match {
  id: number | string;
  index?: number;
  opponent: string;
  location: string;
  isHome: boolean;
  kickOff: string;
  meetingTime: string;
  meetingPoint?: string;
  result?: string;
  endTime?: string;
  date?: string;
  competition?: string;
  trainerNote?: string;
  notes?: string;
  scorers?: string;
  cards?: string;
  
  // Extended Pflichtspiel Data
  startingLineup?: string[];
  substitutes?: string[];
  substitutions?: SubstitutionRecord[];
  goalRecords?: GoalRecord[];
  cardDetails?: CardDetail[];
}

export interface MatchPlanningEntry {
  id: string;
  playerId: string;
  matchId: string;
  date?: string;
  opponent?: string;
  location?: string;
  meeting?: string;
  start?: string;
  end?: string;
  result?: string;
  playtime?: string;
  trainerNote?: string;
  notes?: string;
}

export interface MatchMinuteRecord {
  playerId: string;
  minutes: Record<string | number, number>; // match id -> minutes
  matchMinutes?: Record<string | number, number>; // for backward compatibility
  matchAvailability?: Record<string | number, 'Anwesend' | 'Verletzt' | 'Entschuldigt' | ''>;
  details?: Record<string | number, { start: string, end: string, notes: string }>; // match id -> details
  /** U23: manuell gepflegte Anzahl Einsätze (leer = automatisch aus Minuten gezählt) */
  manualPlayedGames?: number | null;
  /** U23: manuell gepflegte Anzahl Spiele gesamt (leer = automatisch gezählt) */
  manualTotalGames?: number | null;
  /** U23: nur aus der U23-Liste ausblenden (Spieler bleibt im Kader erhalten) */
  u23Hidden?: boolean;
}

export interface AttendanceRecord {
  id: string;
  playerId: string;
  sessions: Record<number, string>; // session number (1-120) -> status code
}

export interface RunRecord {
  id: string;
  playerId: string;
  runs: Record<number, string>;
}

export interface RunMeta {
  id: string;
  name: string;
  date: string;
  content?: string;
}

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  position: string;
  category: 'player' | 'coach' | 'staff' | 'medical';
  image?: string;
  additionalImages?: string[];
  geburtsdatum?: string;
  age?: number;
  wochentag?: string;
  status?: string;
  notizen?: string;
  adresse?: string;
  telefon?: string;
  email?: string;
  oberteil?: string;
  kurze_hose?: string;
  lange_hose?: string;
  schuhe?: string;
  injuryHistory?: string;
  isInjured?: boolean;
  injuryType?: string;
  recoveryForecast?: string;
  professionalStatus?: 'Student' | 'Schüler' | 'Arbeitslos' | 'Angestellter' | string;
  education?: string;
  employer?: string;
  secondaryPositions?: string[];
  rückennummer?: number | string;
  fitness?: string;
  verletzung?: string;
  tore?: number;
  marketValue?: string;
  potential?: number;
  einsatzzeitenGesamt?: number;
  testEinsatzzeitenGesamt?: number;
  loadAmpel?: 'Grün' | 'Gelb' | 'Rot';
  /** Manuell überschriebene Anzahl Individual-Einheiten (leer/null = automatisch gezählt) */
  individualUnitsCount?: number | null;
  /** Manuell überschriebene Gesamt-Einheiten (leer/null = automatische Summe) */
  individualUnitsTotal?: number | null;
  physioDurationOverrideDays?: number;
  physioMissingOverrideDays?: number;
  physical?: {
    height?: number;
    weight?: number;
    bodyFat?: number;
    strongFoot?: 'Rechts' | 'Links' | 'Beidfüßig';
  };
  diagnostics?: {
    ift?: string;
    sprint30m?: string;
    sprintwert?: string;
    yoyotest?: string;
    jumpHeight?: string;
  };
  finance?: {
    baseSalary: number;
    bonusPerMatch: number;
    months?: number;
    transferFeeIn?: number;
    transferFeeOut?: number;
    seasonExtra?: number;
    individualBonus?: number;
    sideAgreements?: string;
    sideAgreementAmount?: number;
    ist: number;
  };
  analysis?: {
    strengths?: string;
    weaknesses?: string;
    development?: string;
    seasonGoals?: string;
  };
  datenblattReport?: {
    verein?: string;
    saison?: string;
    playerStatus?: string;
    analysedatum?: string;
    kpi10m?: string;
    kpi10mBenchmark?: string;
    kpi10mStatus?: string;
    kpi30m?: string;
    kpi30mBenchmark?: string;
    kpi30mStatus?: string;
    kpiYoyo?: string;
    kpiYoyoBenchmark?: string;
    kpiYoyoStatus?: string;
    kpiJump?: string;
    kpiJumpBenchmark?: string;
    kpiJumpStatus?: string;
    sheetMinutes?: string;
    sheetGoalsAssists?: string;
    sheetPassAccuracy?: string;
    sheetTackleRate?: string;
    taktischeKernkompetenz?: string;
    optimierungsPotenzial?: string;
    naechsteMassnahmen?: string;
    sheetLogs?: {
      id?: string;
      title?: string;
      focus?: string;
      duration?: string;
      rpe?: string;
    }[];
  };
  trackerAnalysis?: {
    fileName?: string;
    fileUrl?: string;
    datum?: string;
    uhrzeit?: string;
    sessionDate?: string;
    recordingDate?: string;
    time?: string;
    uploadDate?: string;
    totalDistanceKm?: number;
    highSpeedDistanceM?: number;
    sprintDistanceM?: number;
    maxSpeedKmh?: number;
    sprintCount?: number;
    accelerations?: number;
    decelerations?: number;
    avgHeartRateBpm?: number;
    maxHeartRateBpm?: number;
    workloadIndex?: number;
    heatMapZone?: string;
    tacticalSummary?: string;
    recommendations?: string;
    matchName?: string;
    rawText?: string;
  };
  trackerHistory?: {
    id: string;
    fileName: string;
    fileUrl?: string;
    matchName?: string;
    datum?: string;
    uhrzeit?: string;
    sessionDate?: string;
    recordingDate?: string;
    uploadDate?: string;
    uploadedAt?: string;
    totalDistanceKm?: number;
    highSpeedDistanceM?: number;
    sprintDistanceM?: number;
    maxSpeedKmh?: number;
    sprintCount?: number;
    tacticalSummary?: string;
    [key: string]: any;
  }[];
  movementPoints?: {
    id: string;
    matchId: string | number;
    minute: number;
    x: number;
    y: number;
    actionType?: 'sprint' | 'run' | 'walk' | 'defensive';
    label?: string;
  }[];
  videoHighlights?: VideoClip[];
}

export interface Spieler extends Player {
  name: string; // Full name for compatibility
  nummer: number; // Alias for number
  geburtsdatum: string;
  wochentag: string;
  status: string;
  notizen: string;
}

export interface MeetingEntry {
  id: string;
  date: string;
  time: string;
  playerName: string;
  manualName?: string;
  location: string;
  notes: string;
  reason?: string;
  status?: 'Offen' | 'Zusage' | 'Absage';
  isScout?: boolean;
}

export interface ExternalPerson {
  id: string;
  name: string;
  role: string;
  category: 'coach' | 'staff' | 'medical';
}

export interface TrainingDocumentGlobal {
  id: string;
  name: string;
  url?: string; // Optional to allow metadata-only fetching
  uploadedAt: string;
  mimeType: string;
}

export interface TrainingDocumentContent {
  id: string;
  base64: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  weekday: string;
  group: string;
  load: string;
  loadLevel?: number;
  duration: string;
  weeklyFocus: string;
  sessionFocus: string;
  trainer: string;
  intensity: string;
  status?: string;
  opponent?: string;
  location?: string;
  trainingDocumentId?: string | null;
  players: { name: string; position: string; status: 'Aktiv' | 'Verletzt' | 'Abwesend' | 'U23' | 'U19' | '1' | 'A' | 'B'; category?: string }[];
  content: { 
    warmup: string; 
    warmupDuration?: string;
    warmupImages?: string[];
    main1: string; 
    main1Duration?: string;
    main1Images?: string[];
    main2: string; 
    main2Duration?: string;
    main2Images?: string[];
    closing: string; 
    closingDuration?: string;
    closingImages?: string[];
  };
  importantInfo: string;
  importantInfoImages?: string[];
  remarks: string;
  remarksImages?: string[];
  videoUrl?: string;
  videoClips?: VideoClip[];
}

export interface IndividualTrainingRecord {
  id?: string;
  date: string;
  playerId: string;
  focus: string;
  goals: string;
  status: string;
  load: string;
  loadAmpel?: 'Grün' | 'Gelb' | 'Rot';
  targetDate: string;
  ek: string;
  o: string;
  t: string;
  p: string;
  s: string;
  a: string;
  w: string;
  hs: string;
  notes: string;
}

export interface DepthChartEntry {
  position: string;
  slots: string[]; // 3 slots
}

export interface ScoutingEntry {
  id: string;
  name: string;
  age: number;
  position: string;
  club: string;
  marketValue: string;
  recommendation: 'Verpflichten' | 'Beobachten' | 'Kein Interesse' | 'Absage';
  category: 'Abwehr' | 'Mittelfeld' | 'Flügel' | 'Sturm' | 'Sonstige';
  date: string; // Added date
  createdAt?: number; // Added for sorting
  conversationNotes?: string;
  waitingTime?: string;
  status?: string;
}

export interface TransferNeed {
  position: string;
  currentCount: number;
  targetCount: number;
  priority: 'Hoch' | 'Mittel' | 'Gering';
}

export interface TransferMarketEntry {
  id: string;
  name: string;
  club: string;
  fee: string;
  salary: string;
  contractDuration: string;
  role: string;
  status: string;
}

export interface PlayerPerformance {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  totalDistance: number;
  lowIntensityDistance: number;
  mediumIntensityDistance: number;
  highIntensityDistance: number;
  highIntensityRuns: number;
  sprintCount: number;
  sprintDuration: number;
  topSpeed: number;
  accelerations: number;
  decelerations: number;
  playerLoad: number;
  stressZones?: { low: number; medium: number; high: number };
  heatmap?: { x: number; y: number }[];
  sprintmap?: { x: number; y: number }[];
  movementPattern?: string;
  formCurve?: number[];
  technique: number;
  tactics: number;
  mentality: number;
  decisionMaking: number;
  pressureBehavior: number;
  rating: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  trend?: 'positiv' | 'stagnierend' | 'rückläufig';
  nlzAnalysis?: string;
  jahrgang?: number;
}

export interface DecodedTrackerData {
  id?: string;
  filename?: string;
  date?: string;
  totalDistance?: number;
  highSpeedDistance?: number;
  sprintDistance?: number;
  maxSpeed?: number;
  sprintsCount?: number;
  accelerationsCount?: number;
  decelerationsCount?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  workloadScore?: number;
  heatmapDescription?: string;
  tacticalNotes?: string;
  recommendations?: string;
  [key: string]: any;
}

export interface PlayerPerformanceTeam {
  id: string;
  teamOverview: string;
  updatedAt: number;
}

export type LicenseTier = 'basic' | 'pro' | 'enterprise';

export interface LicenseInfo {
  key: string;
  tier: LicenseTier;
  clubId: string;
  clubName: string;
  issuedAt: number;
  expiresAt: number;
  isActive: boolean;
  features: LicenseFeature[];
  maxUsers: number;
  maxClubs: number;
  trialsUsed: boolean;
}

export type LicenseFeature =
  | 'dashboard'
  | 'kader'
  | 'training'
  | 'spiele'
  | 'taktiktafel'
  | 'scouting'
  | 'analytics'
  | 'video'
  | 'finance'
  | 'naomi'
  | 'physio'
  | 'individual'
  | 'meetings'
  | 'yearly_plan'
  | 'developer';

export const TIER_FEATURES: Record<LicenseTier, LicenseFeature[]> = {
  basic: ['dashboard', 'kader', 'training', 'spiele'],
  pro: ['dashboard', 'kader', 'training', 'spiele', 'taktiktafel', 'scouting', 'analytics', 'finance', 'physio', 'individual', 'meetings', 'yearly_plan'],
  enterprise: ['dashboard', 'kader', 'training', 'spiele', 'taktiktafel', 'scouting', 'analytics', 'video', 'finance', 'naomi', 'physio', 'individual', 'meetings', 'yearly_plan', 'developer'],
};

export const TIER_PRICES: Record<LicenseTier, { monthly: number; yearly: number }> = {
  basic: { monthly: 29, yearly: 290 },
  pro: { monthly: 79, yearly: 790 },
  enterprise: { monthly: 149, yearly: 1490 },
};

export const TAB_FEATURE_MAP: Partial<Record<TabId, LicenseFeature>> = {
  dashboard: 'dashboard',
  personnel: 'kader',
  team_list: 'kader',
  player_portal: 'kader',
  training_planning: 'training',
  attendance: 'training',
  competitive_planning: 'spiele',
  test_planning: 'spiele',
  match_report: 'spiele',
  tacticboard: 'taktiktafel',
  profi_3d_taktiktafel: 'taktiktafel',
  scouting: 'scouting',
  academy_analysis: 'analytics',
  champions_cup: 'analytics',
  video_analysis: 'video',
  budget_finance: 'finance',
  physio_plan: 'physio',
  individual_control: 'individual',
  meetings_calendar: 'meetings',
  yearly: 'yearly_plan',
  developer_tasks: 'developer',
  summer_prep: 'training',
  winter_prep: 'training',
  runs_sw: 'training',
};

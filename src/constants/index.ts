import { TabId } from '../types';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: '🏠 Dashboard' },
  { id: 'personnel', label: 'Kader & Personal' },
  { id: 'team_list', label: 'Teamliste' },
  { id: 'player_portal', label: 'Spieler-Bereich 📝' },
  { id: 'academy_analysis', label: '⚽ Performance (Training & Spiel)' },
  { id: 'champions_cup', label: '🏆 Champions Cup PRO' },
  { id: 'competitive_planning', label: 'Pflichtspiele' },
  { id: 'test_planning', label: 'Testspiele' },
  { id: 'u23_planning', label: 'U23 – Einsatzzeiten A‑Kader' },
  { id: 'match_report', label: 'Spielbericht' },
  { id: 'attendance', label: 'Anwesenheit' },
  { id: 'yearly', label: 'Jahresplan' },
  { id: 'scouting', label: 'Scouting 26/27' },
  { id: 'summer_prep', label: 'Sommervorbereitung' },
  { id: 'winter_prep', label: 'Winter-Vorbereitung' },
  { id: 'budget_finance', label: 'Budget/Finanzen' },
  { id: 'meetings_calendar', label: 'Gespräche' },
  { id: 'individual_control', label: 'Individuelle Steuerung' },
  { id: 'runs_sw', label: 'Läufe' },
  { id: 'physio_plan', label: 'Physio' },
  { id: 'tacticboard', label: '📐 TAKTIKTAFEL' },
  { id: 'trainer_view', label: 'Kaderübersicht & Grundordnung' },
  { id: 'training_planning', label: 'Trainingsplanung' },
  { id: 'video_analysis', label: 'Videoanalyse (Beta) 📹' },
  { id: 'match_analysis_pro', label: '📊 Spielanalyse+ (xG)' },
  { id: 'standards_registry', label: '📐 Standards' },
  { id: 'analytics_charts', label: '📈 Analytics Charts' },
  { id: 'player_report_pro', label: '⚽ Pro-Bericht' },
  
  { id: 'developer_tasks', label: 'Dev-Roadmap' },
  { id: 'license_admin', label: '🔑 Lizenzverwaltung' },
];

import { data } from './data';

export const PLAYERS = data.players;
export const COMPETITIVE_MATCHES = data.competitiveMatches;
export const TEST_MATCHES = data.testMatches;
export const SCOUTING_DATA = data.scoutingCandidates;
export const INITIAL_FINANCE_DATA = data.financeData || [];
export const INITIAL_MEETINGS_DATA = data.meetingsData || [];
export const INITIAL_TRAINING_SESSIONS = data.trainingSessions || [];
export const INITIAL_SUMMER_PREP = data.summerPrep || [];
export const INITIAL_WINTER_PREP = data.winterPrep || [];
export const YEARLY_PLAN = data.yearlyPlan || {};
export const DEPTH_CHART = data.depthChart || {};
export const FINANCE_META = data.financeMeta || {};
export const INITIAL_FORMATION = data.formation || '4-4-2';
export const CARD_RECORDS = data.cardRecords || [];
export const COMPETITIVE_MINUTES = data.competitiveMinutes || [];
export const TEST_MINUTES = data.testMinutes || [];
export const INITIAL_MATCH_ANALYSES = data.matchAnalyses || [];

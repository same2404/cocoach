// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auth, googleProvider, db, handleFirestoreError, OperationType, getWeekdayLabel, isQueryParamValid } from './firebase';
import { doc, setDoc, deleteField, updateDoc, deleteDoc, writeBatch, query, collection, where, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';

import { TABS, PLAYERS as INITIAL_PLAYERS, COMPETITIVE_MATCHES, TEST_MATCHES, SCOUTING_DATA as INITIAL_SCOUTING, INITIAL_FINANCE_DATA, INITIAL_MEETINGS_DATA, INITIAL_TRAINING_SESSIONS, INITIAL_SUMMER_PREP, INITIAL_WINTER_PREP, YEARLY_PLAN, DEPTH_CHART, FINANCE_META, INITIAL_FORMATION, CARD_RECORDS, COMPETITIVE_MINUTES, TEST_MINUTES } from './constants';
import { SC_SAND_SEED } from './constants/sc-sand-data';
import { TabId, Spieler, Training, Vorbereitung, Spiel, Finanz, LogEntry, Player, IndividualTrainingRecord, TrainingSession, ScoutingEntry, MeetingEntry, FinanceEntry, SummerPrepUnit, WinterPrepUnit, DayPlan } from './types';

import { useSyncedState } from './hooks/useSyncedState';
import { useCollectionSync } from './hooks/useCollectionSync';

import { savePlayer as savePlayerFirestore, getPlayer as getPlayerFirestore, saveTraining as saveTrainingFirestore, getTraining as getTrainingFirestore } from './services/firestore';

import { UniformMask } from './components/UniformMask';
import { KaderAgentModal } from './components/KaderAgentModal';
import { Pro3DTacticBoardModal } from './components/Pro3DTacticBoardModal';
import { AgentSystemControlCenterModal } from './components/AgentSystemControlCenterModal';
import { runMasterAgentCycle } from './utils/agentSystemEngine';

import { GoogleDriveModal } from './components/GoogleDriveModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GmailModal } from './components/GmailModal';

import JSZip from 'jszip';

import { TacticBoard } from './components/TacticBoard';
import { FormationView } from './components/FormationView';
import { ScoutingFormationView } from './components/ScoutingFormationView';

import { MatchPlanningView, YearlyPlanView, BudgetFinanceView, CardStatisticsSheet, RunsSWView, PhysioPlanView, IndividualSteuerungView, TrainingAttendanceView, SummerPreparationView, WinterPreparationView, TeamListView, DeveloperTasksView, TrainingPlanningView, MatchReportView, ScoutingView, MeetingsCalendarView, AccessControlView, PlayerPortalView, AcademyAnalysisView, ChampionsCupProView, DashboardView, VideoAnalysisView, Profi3DTacticBoardView, TrackerAcademyReportView, LicenseAdminView, MatchAnalysisProView, NaomiChat, AIQualityFilterView, AnalyticsChartsView, PlayerReportProView, TrainerChatView, AuditLogView, LiveMatchCommentary } from './components/Views';
import { AUTHORIZED_STAFF_LIST } from './components/views/AccessControlView';
import { getPositionOrder, sortPlayers, isPlayer } from './utils/playerSorting';
import PersonnelView from './components/views/PersonnelView';
import { UniformView } from './components/UniformView';
import { FocusTimer } from './components/FocusTimer';
import { getHolidays } from './utils/holidays';
import { findSessionByDate } from './lib/dateUtils';
import { ClubSwitcher } from './components/ClubSwitcher';
import { NaomiAgentModal, NaomiResult } from './components/NaomiAgentModal';
import { LicenseModal } from './components/LicenseModal';
import { useClub } from './contexts/ClubContext';
import { useLicense } from './hooks/useLicense';
declare const __COCOACH_BUILD_DATE__: string | undefined;
import { apiFetch } from './lib/apiClient';
import { TAB_FEATURE_MAP } from './types';
import { LandingPage } from './components/LandingPage';



import { 
  User, 
  Plus, 
  UserPlus,
  UserMinus,
  Search, 
  Camera, 
  Euro, 
  MessageSquare, 
  Activity, 
  Shield, 
  ChevronRight,
  TrendingUp,
  Clock,
  FileText,
  Target,
  Edit2,
  Trash2,
  Save,
  X as CloseIcon,
  MapPin,
 Timer,
  ChevronLeft,
  Calendar,
  RotateCcw,
  RefreshCw,
  Upload,
  Radio,
  Menu,
  Maximize2,
  Minimize2,
  Monitor,
  Sun,
  Moon,
  LayoutDashboard,
  Trophy,
  FolderKanban,
  Layers,
  HardDrive,
  Download,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Mail
} from 'lucide-react';

const KEY_TO_TAB: Record<string, string> = {
  'players': 'Spielerprofile',
  'attendance': 'Anwesenheit',
  'yearlyPlan': 'Jahresplan',
  'cardRecords': 'Karten',
  'scoutingCandidates': 'Scouting',
  'financeData': 'Finanzen',
  'financeMeta': 'Finanzen',
  'meetingsData': 'Gespräche',
  'individualTrainingData': 'Individuelle Steuerung',
  'summerPrep': 'Sommer Vorbereitung',
  'winterPrep': 'Winter Vorbereitung',
  'runRecords': 'Läufe',
  'physioEntries': 'Physio',
  'video_analysis': 'Video-Analyse',
  'formation': 'Taktiktafel',
  'depthChart': 'Kaderplanung',
  'teamPhoto': 'Teamfoto',
  'testMatches': 'Testspiele',
  'testMinutes': 'Testspiele',
  'u23Matches': 'Spiele U23',
  'u23Minutes': 'Spiele U23',
};

const App: React.FC = () => {
  const { activeClub, isDemo, isReadOnly, getCollectionPath } = useClub();
  const { license, loading: licenseLoading, error: licenseError, showLicenseModal, setShowLicenseModal, validateLicense, hasFeature, tier, daysRemaining, logout: licenseLogout } = useLicense();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastError, setLastError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (themeMode === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [themeMode]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Browser fullscreen request blocked or error:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn("Exit fullscreen error:", err);
        });
      }
    }
  }, []);

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [ownerEmail] = useState('samerkhaleel720@gmail.com');
  const [securityLockActive, setSecurityLockActive] = useSyncedState<boolean>('securityLockActive', false, true);
  const [currentUserStatus, setCurrentUserStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null);

  const [localName, setLocalName] = useState<string>(() => {
    return localStorage.getItem('fca_active_trainer_name') || 'Samer Khaleel (Owner & Entwickler)';
  });
  const [localEmail, setLocalEmail] = useState<string>(() => {
    return localStorage.getItem('fca_active_trainer_email') || 'samerkhaleel720@gmail.com';
  });
  const [showLocalProfileModal, setShowLocalProfileModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNaomiModal, setShowNaomiModal] = useState(false);
  const [naomiPreset, setNaomiPreset] = useState<{ clubId: string; clubName: string; fussballUrl?: string; website?: string; autoStart?: boolean } | null>(null);

  const isOwner = (authUser && authUser.email?.toLowerCase() === ownerEmail.toLowerCase()) ||
                  (localEmail.toLowerCase() === ownerEmail.toLowerCase());

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        if (user.email) {
          setLocalEmail(user.email);
          if (user.displayName) setLocalName(user.displayName);
        }
      } else {
        setAuthUser(null);
      }
    });
  }, []);

  useEffect(() => {
    if (authUser) {
      const userRef = doc(db, 'app_users', authUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserStatus(docSnap.data().status || 'approved');
        } else {
          setCurrentUserStatus('approved');
        }
      }, (error) => {
        console.warn("Could not fetch current user status:", error);
        setCurrentUserStatus('approved');
      });
      return () => unsubscribe();
    } else {
      setCurrentUserStatus(null);
    }
  }, [authUser]);

  useEffect(() => {
    if (isOnline && authUser && currentUserStatus !== 'rejected') {
      const userRef = doc(db, 'app_users', authUser.uid);
      setDoc(userRef, {
        uid: authUser.uid,
        email: authUser.email || '',
        name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
        role: authUser.email === ownerEmail ? 'owner' : 'viewer',
        status: currentUserStatus || 'approved',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => {
        console.warn("Could not automatically register/update user in cloud app_users:", err);
      });
    }
  }, [isOnline, authUser, ownerEmail, currentUserStatus]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setToast({ message: 'Erfolgreich angemeldet.', id: Date.now() });
    } catch (err: any) {
      console.error("Login failed:", err);
      setToast({ message: `Anmeldung fehlgeschlagen: ${err.message}`, id: Date.now() });
    }
  };

  const handleSelectTrainerProfile = (staff: { name: string; role: string; email: string }) => {
    const fullDisplayName = `${staff.name} (${staff.role})`;
    setLocalEmail(staff.email);
    setLocalName(fullDisplayName);
    localStorage.setItem('fca_active_trainer_email', staff.email);
    localStorage.setItem('fca_active_trainer_name', fullDisplayName);
    setShowLocalProfileModal(false);
    setShowLoginModal(false);
    setToast({ 
      message: `Profil aktiviert: ${fullDisplayName} ${staff.email.toLowerCase() === ownerEmail.toLowerCase() ? '👑 (Voller Zugriff inkl. KI)' : '⚽ (Kader & Training Bearbeitung)'}`, 
      id: Date.now() 
    });
  };

  const handleEmailPasswordLogin = async (email: string, pass: string) => {
    const emailClean = email.trim().toLowerCase();
    
    if (pass && pass !== '0000') {
      setToast({ message: 'Hinweis: Bitte nutze das Standard-Passwort 0000 für Trainer.', id: Date.now() });
    }

    const matchedStaff = AUTHORIZED_STAFF_LIST.find(s => s.email.toLowerCase() === emailClean);
    const displayName = matchedStaff ? `${matchedStaff.name} (${matchedStaff.role})` : emailClean;

    setLocalEmail(emailClean);
    setLocalName(displayName);
    localStorage.setItem('fca_active_trainer_email', emailClean);
    localStorage.setItem('fca_active_trainer_name', displayName);

    try {
      setAuthLoading(true);

      const cred = await signInAnonymously(auth);
      setAuthUser({
        ...cred.user,
        email: emailClean,
        displayName: displayName,
        isAnonymous: true
      });

      const userRef = doc(db, 'app_users', cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: emailClean,
        name: displayName,
        role: emailClean === ownerEmail ? 'owner' : 'viewer',
        status: 'approved',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setToast({ message: `Erfolgreich angemeldet als ${displayName}!`, id: Date.now() });
      setShowLoginModal(false);
    } catch (err: any) {
      console.error("Custom email/password login failed:", err);
      setAuthUser({
        uid: 'custom_session_' + emailClean.replace(/[^a-zA-Z0-9]/g, '_'),
        email: emailClean,
        displayName: displayName,
        isCustom: true
      });
      setToast({ message: `Angemeldet als ${displayName}`, id: Date.now() });
      setShowLoginModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToast({ message: 'Erfolgreich abgemeldet.', id: Date.now() });
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  const [requestEmail, setRequestEmail] = useState('');
  const [requestName, setRequestName] = useState('');

  const handleRequestAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setToast({ message: 'Zukunft geplant.', id: Date.now() });
  };

  const [toast, setToast] = useState<{ message: string, id: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [tacticBoardDraft, setTacticBoardDraft] = useState<any>(null);
  const [navCategory, setNavCategory] = useState<'all' | 'ubersicht' | 'kader' | 'training' | 'match' | 'orga'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerProfileTab, setPlayerProfileTab] = useState<'basis' | 'finanzen' | 'notizen'>('basis');
  const [editingPlayer, setEditingPlayer] = useState<Spieler | null>(null);
  const [modalCategory, setModalCategory] = useState<'player' | 'coach' | 'staff' | 'medical'>('player');
  const [showKaderAgentModal, setShowKaderAgentModal] = useState(false);
  const [show3DProfiBoardModal, setShow3DProfiBoardModal] = useState(false);
  const [showAgentControlCenterModal, setShowAgentControlCenterModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [showGoogleGmailModal, setShowGoogleGmailModal] = useState(false);
  const [kaderAgentPreset, setKaderAgentPreset] = useState<'beste_formation' | 'topform_startelf' | 'vollbild_ordnung' | 'laufwege_profi'>('beste_formation');

  const { data: _rawPlayers, loading: loadingSpieler, addOrUpdateItem: saveSpieler, removeItem: deleteSpieler } = useCollectionSync<Spieler>('spieler', 'id', undefined, 'asc', true);
  const isSCSand = activeClub.id === 'sc-sand-1946';
  const players = useMemo(() => {
    if (_rawPlayers.length === 0 && isSCSand && !loadingSpieler) {
      return SC_SAND_SEED.players as Spieler[];
    }
    return _rawPlayers;
  }, [_rawPlayers, isSCSand, loadingSpieler]);
  const { data: training, loading: loadingTraining, addOrUpdateItem: saveTraining, removeItem: deleteTraining } = useCollectionSync<Training>('training', 'id', undefined, 'asc', true);
  const { data: spiele, loading: loadingSpiele, addOrUpdateItem: saveSpiel, removeItem: deleteSpiel } = useCollectionSync<Spiel>('spiele', 'id', undefined, 'asc', true);
  const { data: budgetFinanz, loading: loadingFinanz, addOrUpdateItem: saveFinanz, removeItem: deleteFinanz } = useCollectionSync<Finanz>('budget_finanz', 'id', undefined, 'asc', true);

  // Additional collections for full functionality
  const { data: attendance, loading: loadingAttendance, addOrUpdateItem: saveAttendance, removeItem: deleteAttendance } = useCollectionSync<any>('attendance', 'playerId', undefined, 'asc', true);
  const { data: yearlyPlan, loading: loadingYearly, addOrUpdateItem: saveYearlyPlan, removeItem: deleteYearlyPlan } = useCollectionSync<any>('yearly_plan', 'date', 'date', 'asc', true);
  const yearlyPlanRef = useRef(yearlyPlan);
  useEffect(() => {
    yearlyPlanRef.current = yearlyPlan;
  }, [yearlyPlan]);
  const { data: cardRecords, loading: loadingCards, addOrUpdateItem: saveCardRecord, removeItem: deleteCardRecord } = useCollectionSync<any>('card_records', 'playerId', undefined, 'asc', true);
  const { data: scoutingCandidates, loading: loadingScouting, addOrUpdateItem: saveScoutingCandidate, removeItem: deleteScoutingCandidate } = useCollectionSync<any>('scouting_candidates', 'id', 'createdAt', 'desc', true);
  const { data: depthChart, loading: loadingDepthChart, addOrUpdateItem: saveDepthChart } = useCollectionSync<any>('depth_chart', 'id', undefined, 'asc', true);
  const { data: financeMeta, loading: loadingFinanceMeta, addOrUpdateItem: saveFinanceMeta } = useCollectionSync<any>('finance_meta', 'id', undefined, 'asc', true);
  const { data: meetingsData, loading: loadingMeetings, addOrUpdateItem: saveMeetingEntry, removeItem: deleteMeetingEntry } = useCollectionSync<any>('meetings_data', 'id', 'date', 'desc', true);
  const { data: trainingSessions, loading: loadingSessions, addOrUpdateItem: saveTrainingSession, removeItem: deleteTrainingSession } = useCollectionSync<any>('training_sessions', 'id', undefined, 'asc', true);
  const { data: individualTrainingData, loading: loadingIndividual, addOrUpdateItem: saveIndividualTraining, removeItem: removeIndividualTraining } = useCollectionSync<any>('individual_training', 'id', undefined, 'asc', true);
  const { data: runRecords, loading: loadingRuns, addOrUpdateItem: saveRunRecord, removeItem: deleteRunRecord } = useCollectionSync<any>('run_records', 'id', undefined, 'asc', true);
  const { data: runMeta, loading: loadingRunMeta, addOrUpdateItem: saveRunMeta } = useCollectionSync<any>('run_meta', 'id', undefined, 'asc', true);
  const { data: physioEntries, loading: loadingPhysio, addOrUpdateItem: savePhysioEntry, removeItem: deletePhysioEntry } = useCollectionSync<any>('physio_entries', 'id', 'date', 'desc', true);
  const { data: formation, loading: loadingFormation, addOrUpdateItem: saveFormation } = useCollectionSync<any>('formation', 'id', undefined, 'asc', true);
  const { data: vorbereitungSommer, loading: loadingSommer, addOrUpdateItem: saveVorbereitungSommer, removeItem: removeVorbereitungSommer } = useCollectionSync<any>('vorbereitung_sommer', 'id', undefined, 'asc', true);
  const { data: vorbereitungWinter, loading: loadingWinter, addOrUpdateItem: saveVorbereitungWinter, removeItem: removeVorbereitungWinter } = useCollectionSync<any>('vorbereitung_winter', 'id', undefined, 'asc', true);
  const { data: winterPrepConfig, loading: loadingWinterConfig, addOrUpdateItem: saveWinterConfig } = useCollectionSync<any>('winter_prep_config', 'id', undefined, 'asc', true);
  const { data: matchAnalyses, loading: loadingAnalyses, addOrUpdateItem: saveMatchAnalysis, removeItem: deleteMatchAnalysis } = useCollectionSync<any>('match_analyses', 'id', undefined, 'asc', true);
  const { data: agentLogs, addOrUpdateItem: saveAgentLog, removeItem: deleteAgentLog } = useCollectionSync<any>('agent_logs', 'id', 'timestamp', 'desc', true);
  const { data: academyEvaluations, loading: loadingAcademyEvals, addOrUpdateItem: saveAcademyEvaluation, removeItem: deleteAcademyEvaluation } = useCollectionSync<any>('academy_evaluations', 'id', 'createdAt', 'desc', true);
  const { data: academyWeeklyReports, loading: loadingAcademyReports, addOrUpdateItem: saveAcademyWeeklyReport, removeItem: deleteAcademyWeeklyReport } = useCollectionSync<any>('academy_weekly_reports', 'id', 'createdAt', 'desc', true);
  const { data: trackerAcademyReports, loading: loadingTrackerReports, addOrUpdateItem: saveTrackerAcademyReport, removeItem: deleteTrackerAcademyReport } = useCollectionSync<any>('tracker_academy_reports', 'id', 'createdAt', 'desc', true);

  const { data: _rawCompMatches, loading: loadingCompMatches, addOrUpdateItem: originalSaveCompMatch, removeItem: originalDeleteCompMatch } = useCollectionSync<any>('competitive_matches', 'id', 'date', 'asc', true);
  const competitiveMatches = useMemo(() => {
    if (_rawCompMatches.length === 0 && isSCSand && !loadingCompMatches) {
      return SC_SAND_SEED.competitiveMatches;
    }
    return _rawCompMatches;
  }, [_rawCompMatches, isSCSand, loadingCompMatches]);

  const [lastAgentCycle, setLastAgentCycle] = useState<{ time: number; summary: string } | null>(null);

  const agentDataRef = useRef({ players, matches: competitiveMatches, analyses: matchAnalyses });
  agentDataRef.current = { players, matches: competitiveMatches, analyses: matchAnalyses };
  const agentLogsRef = useRef(agentLogs);
  agentLogsRef.current = agentLogs;
  const agentAlertRef = useRef<{ key: string; sentAt: number } | null>(null);

  // Hintergrund-Heartbeat: echter Master-Agent-Zyklus alle 60s beim App-Start (nicht nur im Modal)
  useEffect(() => {
    const runBackgroundCycle = () => {
      try {
        const { players: p, matches: m, analyses: a } = agentDataRef.current;
        const result = runMasterAgentCycle(p as any, m as any, a as any);
        const sup = result.updatedAgents.SupervisorAgent;
        const clean = result.updatedAgents.CleanupAgent;
        const summary = `${sup.metrics.syncStatus} · Team ${result.updatedAgents.TeamAgent.metrics.healthScore}% · Comp ${result.updatedAgents.CompetitionAgent.metrics.healthScore}% · Clean ${clean.metrics.healthScore}% · Mem ${result.updatedAgents.MemoryAgent.metrics.healthScore}% · Cleanup-Vorschläge ${clean.metrics.processedCount}`;
        setLastAgentCycle({ time: Date.now(), summary });
        const base = Date.now();
        result.logs.forEach((log, i) => {
          saveAgentLog({
            id: `agentlog-${base}-${i}`,
            timestamp: new Date().toISOString(),
            agentId: log.agentId,
            agentName: log.agentName,
            type: log.type,
            message: log.message,
            details: log.details,
            collector: 'app-heartbeat',
            healthSup: sup.metrics.healthScore
          } as any);
        });

        // Discord-Webhook-Alarm: nur bei neuen Fehlern/Warnungen, mit 15-min-Cooldown (kein Spam)
        const allAgents = Object.values(result.updatedAgents);
        const errCount = allAgents.reduce((s, a) => s + a.findings.filter((f) => f.severity === 'ERROR').length, 0);
        const warnCount = allAgents.reduce((s, a) => s + a.findings.filter((f) => f.severity === 'WARNING').length, 0);
        const alertKey = `${errCount}/${warnCount}`;
        const prevAlert = agentAlertRef.current;
        const cooldownMs = 15 * 60 * 1000;
        const scoreMap = Object.fromEntries(allAgents.map((a) => [a.id, a.metrics.healthScore]));
        const fireAlert = () => {
          const detailsText = allAgents
            .flatMap((a) => a.findings.filter((f) => f.severity !== 'INFO').map((f) => `[${a.name}] ${f.text}${f.count ? ` (${f.count})` : ''}`))
            .join('\n');
          apiFetch('/api/agent-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              severity: errCount ? 'ERROR' : warnCount ? 'WARNING' : 'INFO',
              title: errCount ? `🚨 ${errCount} Fehler im Agentensystem` : warnCount ? `⚠️ ${warnCount} Warnungen im Agentensystem` : '✅ Agentensystem stabil',
              message: errCount || warnCount
                ? `Der SupervisorAgent meldet ${errCount} Fehler und ${warnCount} Warnungen an deinen echten Daten.`
                : 'Alle Befunde wurden behoben – die Agents sind wieder voll grün.',
              details: detailsText || 'Keine Befunde.',
              scores: scoreMap,
              source: 'app-heartbeat'
            })
          }).catch((e) => console.error('[Agent Alert Send Error]', e));
        };
        if (errCount > 0 || warnCount > 0) {
          const changed = !prevAlert || prevAlert.key !== alertKey;
          const cooldownOk = !prevAlert || (Date.now() - prevAlert.sentAt) > cooldownMs;
          if (changed && cooldownOk) {
            fireAlert();
            agentAlertRef.current = { key: alertKey, sentAt: Date.now() };
          }
        } else if (prevAlert && prevAlert.key !== '0/0' && (Date.now() - prevAlert.sentAt) > cooldownMs) {
          fireAlert();
          agentAlertRef.current = { key: '0/0', sentAt: Date.now() };
        }
        // CleanupAgent-Regel: Firestore-Log-Datei schlank halten (max 300 Einträge, älteste zuerst entfernen)
        if (agentLogsRef.current.length > 300) {
          agentLogsRef.current.slice(200).forEach((l: any) => {
            if (l?.id && typeof l.id === 'string' && l.id.startsWith('agentlog-')) {
              deleteAgentLog(l.id as any);
            }
          });
        }
      } catch (e) {
        console.error('[Background Agent Cycle Error]', e);
      }
    };
    runBackgroundCycle();
    const interval = setInterval(runBackgroundCycle, 60000);
    return () => clearInterval(interval);
  }, [saveAgentLog, deleteAgentLog]);

  const getAppBackupData = useCallback(() => {
    return {
      exportDate: new Date().toISOString(),
      system: 'CoCoach KI-System',
      players,
      competitiveMatches,
      training,
      spiele,
      budgetFinanz,
      attendance,
      yearlyPlan,
      cardRecords,
      scoutingCandidates,
      meetingsData,
      trainingSessions,
      individualTrainingData,
      runRecords,
      physioEntries,
      vorbereitungSommer,
      vorbereitungWinter
    };
  }, [players, competitiveMatches, training, spiele, budgetFinanz, attendance, yearlyPlan, cardRecords, scoutingCandidates, meetingsData, trainingSessions, individualTrainingData, runRecords, physioEntries, vorbereitungSommer, vorbereitungWinter]);

  const handleDownloadLocalBackup = useCallback(() => {
    const data = getAppBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FC_Auggen_Complete_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Gesamtes System-Backup als .json heruntergeladen!', id: Date.now() });
  }, [getAppBackupData]);

  const saveCompMatch = useCallback(async (match: any) => {
    // Get the previous date if match already exists
    const existingMatch = competitiveMatches.find((m: any) => m.id === match.id);
    const oldDate = existingMatch?.date;

    await originalSaveCompMatch(match);

    // If date changed, clean up old date in yearly_plan
    if (oldDate && oldDate !== match.date) {
      try {
        const oldDocRef = doc(db, 'yearly_plan', oldDate);
        await deleteDoc(oldDocRef);
      } catch (err) {
        console.error('Error removing old yearly_plan entry:', err);
      }
    }

    // Automatically sync to yearly_plan
    if (match.date) {
      try {
        const docRef = doc(db, 'yearly_plan', match.date);
        await setDoc(docRef, {
          date: match.date,
          type: 'Pflichtspiel',
          opponent: match.opponent || '',
          activity: `Pflichtspiel vs ${match.opponent || ''}`,
          time: match.kickOff || '15:30',
          location: match.location || '',
          treffpunkt: match.meetingTime || '',
          ergebnis: match.result || ''
        }, { merge: true });
      } catch (err) {
        console.error('Error auto-syncing match to yearly_plan:', err);
      }
    }
  }, [originalSaveCompMatch, competitiveMatches]);

  const deleteCompMatch = useCallback(async (id: string | number) => {
    const match = competitiveMatches.find((m: any) => m.id === id);
    await originalDeleteCompMatch(id);

    // Automatically remove from yearly_plan
    if (match && match.date) {
      try {
        const docRef = doc(db, 'yearly_plan', match.date);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Error removing match from yearly_plan:', err);
      }
    }
  }, [originalDeleteCompMatch, competitiveMatches]);

  const { data: competitiveMinutes, loading: loadingCompMinutes, addOrUpdateItem: saveCompMinutes, removeItem: deleteCompMinutes } = useCollectionSync<any>('competitive_minutes', 'playerId', undefined, 'asc', true);

  const handleWipeAllCompetitiveMatches = useCallback(async () => {
    try {
      setToast({ message: 'Pflichtspiele werden gelöscht...', id: Date.now() });

      // 1. Delete all competitive matches
      for (const m of competitiveMatches) {
        await originalDeleteCompMatch(m.id);
        
        // Delete related yearly_plan entry if any
        if (m.date) {
          try {
            const docRef = doc(db, 'yearly_plan', m.date);
            await deleteDoc(docRef);
          } catch (err) {
            console.warn(`Could not delete yearly_plan for date ${m.date}:`, err);
          }
        }
      }

      // 2. Also check yearlyPlan for any entries with type === 'Pflichtspiel' and delete them
      for (const entry of yearlyPlan) {
        if (entry.type === 'Pflichtspiel') {
          try {
            if (entry.date) {
              await deleteYearlyPlan(entry.date);
            }
          } catch (err) {
            console.warn(`Could not delete yearly_plan entry ${entry.date}:`, err);
          }
        }
      }

      // 3. Clear all player minutes/stats for competitive matches (competitive_minutes)
      for (const rec of competitiveMinutes) {
        try {
          await deleteCompMinutes(rec.playerId);
        } catch (err) {
          console.warn(`Could not delete competitive minutes for player ${rec.playerId}:`, err);
        }
      }

      setToast({ message: 'Erfolgreich alles gelöscht!', id: Date.now() });
    } catch (e) {
      console.error('Error wiping all competitive matches:', e);
      setToast({ message: 'Fehler beim Löschen!', id: Date.now() });
    }
  }, [competitiveMatches, originalDeleteCompMatch, yearlyPlan, deleteYearlyPlan, competitiveMinutes, deleteCompMinutes]);

  const handleRestoreCompetitiveMatches = useCallback(async () => {
    try {
      setToast({ message: '32 Pflichtspiele werden wiederhergestellt...', id: Date.now() });
      if (COMPETITIVE_MATCHES && COMPETITIVE_MATCHES.length > 0) {
        for (const m of COMPETITIVE_MATCHES) {
          await saveCompMatch(m as any);
        }
      }
      setToast({ message: '32 Pflichtspiele erfolgreich wiederhergestellt!', id: Date.now() });
    } catch (e) {
      console.error('Error restoring competitive matches:', e);
      setToast({ message: 'Fehler beim Wiederherstellen der Pflichtspiele!', id: Date.now() });
    }
  }, [saveCompMatch]);
  const { data: _rawTestMatches, loading: loadingTestMatches, addOrUpdateItem: saveTestMatch, removeItem: deleteTestMatch } = useCollectionSync<any>('test_matches', 'id', 'date', 'asc', true);
  const testMatches = useMemo(() => {
    if (_rawTestMatches.length === 0 && isSCSand && !loadingTestMatches) {
      return SC_SAND_SEED.testMatches;
    }
    return _rawTestMatches;
  }, [_rawTestMatches, isSCSand, loadingTestMatches]);
  const { data: testMinutes, loading: loadingTestMinutes, addOrUpdateItem: saveTestMinutes, removeItem: deleteTestMinutes } = useCollectionSync<any>('test_minutes', 'playerId', undefined, 'asc', true);
  const { data: u23Matches, loading: loadingU23Matches, addOrUpdateItem: saveU23Match, removeItem: deleteU23Match } = useCollectionSync<any>('u23_matches', 'id', 'date', 'asc', true);
  const { data: u23Minutes, loading: loadingU23Minutes, addOrUpdateItem: saveU23Minutes, removeItem: deleteU23Minutes } = useCollectionSync<any>('u23_minutes', 'playerId', undefined, 'asc', true);
  const { data: opponents, loading: loadingOpponents, addOrUpdateItem: saveOpponent, removeItem: deleteOpponent } = useCollectionSync<any>('opponents', 'id', 'name', 'asc', true);
  const { data: playerSessionLogs, loading: loadingSessionLogs, addOrUpdateItem: savePlayerSessionLog, removeItem: deletePlayerSessionLog } = useCollectionSync<any>('player_session_logs', 'id', undefined, 'asc', true);

  const isLoading = loadingSpieler || loadingTraining || loadingSpiele || loadingFinanz ||
                    loadingAttendance || loadingCompMatches || loadingCompMinutes || loadingYearly ||
                    loadingCards || loadingScouting || loadingDepthChart || loadingFinanceMeta || loadingMeetings || loadingSessions ||
                    loadingIndividual || loadingRuns || loadingRunMeta || loadingPhysio || loadingFormation || loadingWinterConfig ||
                    loadingSommer || loadingWinter || loadingOpponents || loadingTestMatches || loadingTestMinutes || loadingAnalyses ||
                    loadingSessionLogs || loadingU23Matches || loadingU23Minutes;

  // App sofort anzeigen: Warte höchstens 6 Sekunden auf große Collections, danach rendern wir trotzdem.
  // Die Daten kommen via onSnapshot weiterhin live nach – kein endloser Spinner, kein scheinbares Hängen.
  const [maxWaitElapsed, setMaxWaitElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMaxWaitElapsed(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  const startReady = !isLoading || maxWaitElapsed;

  const CLIENT_VERSION = "2026-08-24_12-00";
  useEffect(() => {
    if (!navigator.onLine || window.location.hostname !== 'localhost') return;
    apiFetch(`/api/version?cb=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.version && data.version !== CLIENT_VERSION) {
          console.log(`[CoCoach] Server-Version ${data.version} ≠ Client ${CLIENT_VERSION} — manuelles Reload empfohlen`);
        }
      })
      .catch(() => {});
  }, []);

  // Naomi 24/7 Health-Monitor — prüft alle 60s ob der Server läuft (nur lokales Dev)
  useEffect(() => {
    if (!navigator.onLine || window.location.hostname !== 'localhost') return;
    const interval = setInterval(() => {
      apiFetch('/api/health')
        .then(r => r.json())
        .then(data => {
          if (data.status !== 'ok') {
            console.warn('[Naomi Monitor] Server health check failed:', data);
          }
        })
        .catch(() => {
          console.warn('[Naomi Monitor] Server nicht erreichbar (lokal)');
        });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync Summer Prep to Yearly Plan
  const handleSaveVorbereitungSommer = async (item: any) => {
    await saveVorbereitungSommer(item);
    
    // Sync to yearly plan
    const dayPlan = {
      date: item.date,
      type: item.type || 'Training',
      activity: item.content || item.inhalt || '',
      time: item.time || item.start || '',
      location: item.location || item.ort || '',
      treffpunkt: item.treffpunkt || '',
      opponent: item.opponent || item.gegner || '',
      ergebnis: item.ergebnis || '',
      phase: 'summer',
      athletik: item.athletik || { start: '', end: '', notes: '' },
      vormittag: item.vormittag || { start: '', end: '', notes: '' },
      individual: item.individual || { start: '', end: '', notes: '' },
      video: item.video || { start: '', end: '', notes: '' },
      training: item.training || { start: '', end: '', notes: '' },
      te: item.te || 0,
      kw: item.kw || 0,
      notes: item.notes || ''
    };
    
    const existing = yearlyPlan.find((p: any) => p.date === item.date);
    const hasChanged = !existing || 
      existing.type !== dayPlan.type || 
      existing.activity !== dayPlan.activity ||
      existing.time !== dayPlan.time ||
      existing.location !== dayPlan.location ||
      existing.opponent !== dayPlan.opponent;

    if (hasChanged) {
      await saveYearlyPlan(dayPlan);
    }
  };

  // Sync Test Matches to Yearly Plan
  useEffect(() => {
    if (!isLoading && testMatches.length > 0) {
      const syncTests = async () => {
        const currentYearlyPlan = yearlyPlanRef.current;
        for (const m of testMatches) {
          if (!m.date) continue;
          const existing = currentYearlyPlan.find((p: any) => p.date === m.date);
          const shouldSync = !existing;

          if (shouldSync) {
            await saveYearlyPlan({
              date: m.date,
              type: 'Testspiel',
              activity: `Testspiel vs ${m.opponent}`,
              time: m.kickOff || '',
              location: m.location || '',
              opponent: m.opponent || '',
              ergebnis: m.result || '',
              phase: (new Date(m.date) >= new Date('2026-07-06') && new Date(m.date) <= new Date('2026-08-15')) ? 'summer' : 'season'
            });
          }
        }
      };
      void syncTests();
    }
  }, [isLoading, testMatches]);

  // Sync Competitive Matches to Yearly Plan
  useEffect(() => {
    if (!isLoading && competitiveMatches.length > 0) {
      const syncComp = async () => {
        const currentYearlyPlan = yearlyPlanRef.current;
        for (const m of competitiveMatches) {
          if (!m.date) continue;
          const existing = currentYearlyPlan.find((p: any) => p.date === m.date);
          const shouldSync = !existing;

          if (shouldSync) {
            await saveYearlyPlan({
              date: m.date,
              type: 'Pflichtspiel',
              activity: `Pflichtspiel vs ${m.opponent}`,
              time: m.kickOff || '',
              location: m.location || '',
              opponent: m.opponent || '',
              ergebnis: m.result || '',
              phase: (new Date(m.date) >= new Date('2026-07-06') && new Date(m.date) <= new Date('2026-08-15')) ? 'summer' : 'season'
            });
          }
        }
      };
      void syncComp();
    } else if (isDemo && !isLoading && competitiveMatches.length === 0 && COMPETITIVE_MATCHES && COMPETITIVE_MATCHES.length > 0) {
      console.log('Demo club empty, auto-restoring 32 default competitive matches...');
      void handleRestoreCompetitiveMatches();
    }
  }, [isLoading, competitiveMatches, handleRestoreCompetitiveMatches]);

  const handleRemoveVorbereitungSommer = async (id: string) => {
    const item = vorbereitungSommer.find((u: any) => u.id === id);
    await removeVorbereitungSommer(id);
    if (item) {
      const existing = yearlyPlanRef.current.find((p: any) => p.date === item.date);
      if (existing && existing.phase === 'summer') {
        await saveYearlyPlan({ ...existing, type: 'Frei', activity: '', time: '', location: '' });
      }
    }
  };

  useEffect(() => {
    if (!isLoading && vorbereitungSommer.length > 0) {
      const syncAll = async () => {
        const currentYearlyPlan = yearlyPlanRef.current;
        const updates: DayPlan[] = [];
        for (const item of vorbereitungSommer) {
          if (!item.date) continue;
          const existing = currentYearlyPlan.find((p: any) => p.date === item.date);
          
          // Only auto-populate missing dates into yearly plan, do not overwrite manual edits
          const shouldSync = !existing;

          if (shouldSync) {
            updates.push({
              date: item.date,
              type: item.type || 'Training',
              activity: item.content || item.inhalt || '',
              time: item.time || item.start || '',
              location: item.location || item.ort || '',
              treffpunkt: item.treffpunkt || '',
              opponent: item.opponent || item.gegner || '',
              ergebnis: item.ergebnis || '',
              phase: 'summer',
              athletik: item.athletik || { start: '', end: '', notes: '' },
              vormittag: item.vormittag || { start: '', end: '', notes: '' },
              individual: item.individual || { start: '', end: '', notes: '' },
              video: item.video || { start: '', end: '', notes: '' },
              training: item.training || { start: '', end: '', notes: '' },
              te: item.te || 0,
              kw: item.kw || 0,
              notes: item.notes || ''
            });
          }
        }
        
        if (updates.length > 0) {
          console.log(`[Sync] Syncing ${updates.length} missing summer preparation days to yearly plan...`);
          for (const update of updates) {
            await saveYearlyPlan(update);
          }
        }
      };
      
      const timeoutId = setTimeout(() => {
        void syncAll();
      }, 1000); // Debounce sync to avoid hanging on rapid changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, vorbereitungSommer, saveYearlyPlan]);

  const playersWithMinutes = useMemo(() => {
    return players.map(player => {
      const compRecord = competitiveMinutes.find((r: any) => r.playerId === player.id);
      const compMerged = { ...(compRecord?.matchMinutes || {}), ...(compRecord?.minutes || {}) };
      const compTotal = (compRecord ? Object.values(compMerged).reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0) : 0) as number;
      
      const testRecord = testMinutes.find((r: any) => r.playerId === player.id);
      const testMerged = { ...(testRecord?.matchMinutes || {}), ...(testRecord?.minutes || {}) };
      const testTotal = (testRecord ? Object.values(testMerged).reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0) : 0) as number;

      return {
        ...player,
        einsatzzeitenGesamt: compTotal,
        testEinsatzzeitenGesamt: testTotal
      };
    });
  }, [players, competitiveMinutes, testMinutes]);

  const sortedPlayers = useMemo(() => sortPlayers(playersWithMinutes), [playersWithMinutes]);

  // U23: automatisch alle Spieler ohne Einsatzzeit in der ersten Mannschaft
  // (0 Minuten in Pflichtspielen UND Testspielen)
  const u23Players = useMemo(
    () => sortedPlayers.filter((p: any) =>
      p.category === 'player' &&
      (Number(p.einsatzzeitenGesamt) || 0) === 0 &&
      (Number(p.testEinsatzzeitenGesamt) || 0) === 0
    ),
    [sortedPlayers]
  );

  useEffect(() => {
    const handleStateChange = (e: any) => {
      const key = e.detail.key;

      const tabName = KEY_TO_TAB[key] || 'Daten';
      const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

      setToast({
        message: `Änderung gespeichert: ${tabName} (${dateStr}, ${timeStr} Uhr)`,
        id: Date.now()
      });
    };

    window.addEventListener('fca_state_changed', handleStateChange);



    return () => {
      window.removeEventListener('fca_state_changed', handleStateChange);
    };
  }, []);

  // Pure Firestore sync - no localStorage resets or overwrites.
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [activeDetailTab, setActiveDetailTab] = useState<'analysis' | 'notes'>('analysis');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [deepLinkPlayerId, setDeepLinkPlayerId] = useState<string | null>(null);

  // Deep-Link: Nach Komponenten-Mount zurücksetzen (nach 2 Sekunden)
  useEffect(() => {
    if (deepLinkPlayerId) {
      const timer = setTimeout(() => setDeepLinkPlayerId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [deepLinkPlayerId]);

  useEffect(() => {
    if (showAddPlayerModal) {
      setModalCategory(editingPlayer?.category || 'player');
    }
  }, [showAddPlayerModal, editingPlayer]);
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showAddFinanzModal, setShowAddFinanzModal] = useState(false);
  const [showAddSpielModal, setShowAddSpielModal] = useState(false);
  const [showAddVorbereitungModal, setShowAddVorbereitungModal] = useState(false);
  const [showAddScoutingModal, setShowAddScoutingModal] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date('2026-07-01'));
  const [scoutingViewMode, setScoutingViewMode] = useState<'table' | 'field' | 'grid' | 'depth' | 'calendar' | 'timeline'>('table');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [tacticInstructions, setTacticInstructions] = useSyncedState<string>('tacticInstructions', '', true);
  const [selectedIndividualDate, setSelectedIndividualDate] = useState(new Date().toISOString().split('T')[0]);

  const [showRemoveScoutingModal, setShowRemoveScoutingModal] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [selectedMeetingPlayer, setSelectedMeetingPlayer] = useState<string>('');
  const [showAddPhysioModal, setShowAddPhysioModal] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [devPassword, setDevPassword] = useState('');

  const handleResetScouting = async () => {
    // Removed window.confirm
    
    setToast({ message: 'Scouting-Daten werden wiederhergestellt...', id: Date.now() });
    try {
      // Delete existing
      for (const c of scoutingCandidates) {
        await deleteScoutingCandidate(c.id);
      }
      // Add initial
      if (INITIAL_SCOUTING && INITIAL_SCOUTING.length > 0) {
        for (let i = 0; i < INITIAL_SCOUTING.length; i++) {
          const c = INITIAL_SCOUTING[i];
          await saveScoutingCandidate({ ...c, createdAt: Date.now() + i } as any);
        }
      }
      setToast({ message: 'Scouting-Daten erfolgreich wiederhergestellt.', id: Date.now() });
    } catch (err) {
      console.error('Error resetting scouting data:', err);
    }
  };

  const handleResetMeetings = async () => {
    setToast({ message: 'Termine werden zurückgesetzt...', id: Date.now() });
    try {
      for (const m of meetingsData) {
        await deleteMeetingEntry(m.id);
      }
      setToast({ message: 'Termine wurden geleert.', id: Date.now() });
    } catch (err) {
      console.error('Error resetting meetings:', err);
    }
  };

  const handleImportMeetings = async () => {
    setToast({ message: 'Standard-Termine werden importiert...', id: Date.now() });
    try {
      if (INITIAL_MEETINGS_DATA && INITIAL_MEETINGS_DATA.length > 0) {
        for (const m of INITIAL_MEETINGS_DATA) {
          await saveMeetingEntry({ ...m, id: Date.now().toString() + Math.random() });
        }
      }
      setToast({ message: 'Standard-Termine erfolgreich importiert.', id: Date.now() });
    } catch (err) {
      console.error('Error importing meetings:', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;
    setToast({ message: `Bearbeitungsmodus für ${tabLabel} ${!isEditing ? 'aktiviert' : 'deaktiviert'}.`, id: Date.now() });
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    // Most data is autosaved via useCollectionSync and useSyncedState.
    // This button provides a manually triggered status check and visual feedback.
    setTimeout(() => {
      setSaveStatus('success');
      setToast({ message: 'Alle Änderungen in allen Bereichen wurden erfolgreich in der Cloud gespeichert.', id: Date.now() });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const handleReset = () => {
    setToast({ message: 'Reset-Funktion ist im Cloud-Modus deaktiviert.', id: Date.now() });
  };

  const deduplicatePlayers = useCallback(async () => {
    if (players.length < 2) return;

    const seen = new Map<string, Spieler>();
    const duplicates: { keep: Spieler, remove: Spieler }[] = [];

    players.forEach(p => {
      const key = `${(p.firstName || '').trim().toLowerCase()}_${(p.lastName || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        duplicates.push({ keep: seen.get(key)!, remove: p });
      } else {
        seen.set(key, p);
      }
    });

    if (duplicates.length === 0) return;

    setToast({ message: `${duplicates.length} Duplikate gefunden. Bereinigung läuft...`, id: Date.now() });

    for (const { keep, remove } of duplicates) {
      // 1. Merge data into 'keep'
      const mergedPlayer: Spieler = {
        ...remove,
        ...keep,
        notizen: keep.notizen || remove.notizen || '',
        status: keep.status || remove.status || 'Aktiv',
        geburtsdatum: keep.geburtsdatum || remove.geburtsdatum || '',
        wochentag: keep.wochentag || remove.wochentag || '',
        position: keep.position || remove.position || '',
        category: keep.category || remove.category || 'player',
        finance: {
          baseSalary: 0,
          bonusPerMatch: 0,
          ist: 0,
          ...(remove.finance || {}),
          ...(keep.finance || {})
        },
        physical: { ...(remove.physical || {}), ...(keep.physical || {}) },
        analysis: { ...(remove.analysis || {}), ...(keep.analysis || {}) },
        diagnostics: { ...(remove.diagnostics || {}), ...(keep.diagnostics || {}) },
      };

      await saveSpieler(mergedPlayer);

      // 2. Update references in all collections
      const collectionsToUpdate = [
        { data: attendance, save: saveAttendance, field: 'playerId' },
        { data: cardRecords, save: saveCardRecord, field: 'playerId' },
        { data: individualTrainingData, save: saveIndividualTraining, field: 'playerId' },
        { data: runRecords, save: saveRunRecord, field: 'playerId' },
        { data: physioEntries, save: savePhysioEntry, field: 'playerId' },
      ];

      for (const { data, save, field } of collectionsToUpdate) {
        const itemsToUpdate = data.filter((item: any) => item[field] === remove.id);
        for (const item of itemsToUpdate) {
          await save({ ...item, [field]: keep.id });
        }
      }

      // 3. Delete 'remove'
      await deleteSpieler(remove.id);
    }

    setToast({ message: 'Datenbereinigung abgeschlossen.', id: Date.now() });
  }, [players, attendance, cardRecords, individualTrainingData, runRecords, physioEntries, saveSpieler, deleteSpieler, saveAttendance, saveCardRecord, saveIndividualTraining, saveRunRecord, savePhysioEntry]);

  useEffect(() => {
    if (!isLoading && players.length > 0) {
      const timer = setTimeout(() => {
        const seen = new Set<string>();
        let hasDuplicates = false;
        players.forEach(p => {
          const key = `${(p.firstName || '').trim().toLowerCase()}_${(p.lastName || '').trim().toLowerCase()}`;
          if (seen.has(key)) hasDuplicates = true;
          seen.add(key);
        });
        if (hasDuplicates) {
          void deduplicatePlayers();
        }
      }, 5000); // Wait 5s before checking for duplicates automatically
      return () => clearTimeout(timer);
    }
  }, [isLoading, players, deduplicatePlayers]);
  const handleDeleteItem = async (collection: string, id: string, label: string = 'Eintrag') => {
    try {
      if (collection === 'spieler') await deleteSpieler(id);
      else if (collection === 'training') await deleteTraining(id);
      else if (collection === 'spiele') await deleteSpiel(id);
      else if (collection === 'budget_finanz') await deleteFinanz(id);
      else if (collection === 'scouting_candidates') await deleteScoutingCandidate(id);
      else if (collection === 'training_sessions') await deleteTrainingSession(id);
      else if (collection === 'meetings_data') await deleteMeetingEntry(id);
      else if (collection === 'competitive_matches') await deleteCompMatch(id);
      else if (collection === 'physio_entries') await deletePhysioEntry(id);
      else if (collection === 'match_analyses') await deleteMatchAnalysis(id);
      
      setToast({ message: `${label} erfolgreich gelöscht.`, id: Date.now() });
      
      if (collection === 'spieler' && selectedPlayerId === id) {
        setSelectedPlayerId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collection}/${id}`);
    }
  };

  const allProfiles = sortedPlayers.map(p => ({ ...p, isScout: false }));

  useEffect(() => {
    if (selectedPlayerId && allProfiles.length > 0 && !allProfiles.find(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId(allProfiles[0].id);
    }
  }, [selectedPlayerId, players, allProfiles]);

  // Check URL parameters on mount to deep-link to specific tabs/sessions (useful for iframe printing bypass)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const sessionParam = params.get('session_id');

    if (tabParam) {
      setActiveTab(tabParam as any);
    }
    if (sessionParam) {
      setSelectedSessionId(sessionParam);
    }
  }, []);

  // Handle automatic printing once loading is complete
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoPrintParam = params.get('print');
    
    if (autoPrintParam === 'true' && !loadingSessions && trainingSessions.length > 0) {
      const timer = setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error("Auto print failed:", e);
        }
      }, 1000); // Wait 1 second to make sure React components are completely rendered
      return () => clearTimeout(timer);
    }
  }, [loadingSessions, trainingSessions]);

  // Auto-select first session if none selected
  useEffect(() => {
    if (!selectedSessionId && trainingSessions.length > 0) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('session_id')) {
        setSelectedSessionId(trainingSessions[0].id);
      }
    }
  }, [selectedSessionId, trainingSessions]);

  const selectedPlayer = allProfiles.find(p => p.id === selectedPlayerId) || allProfiles[0];
  const handleUpdatePlayer = async (updatedPlayer: Spieler) => {
    setSaveStatus('saving');
    try {
      await savePlayerFirestore(String(updatedPlayer.id), updatedPlayer);
      await saveSpieler(updatedPlayer);
      
      // Update finance data if it exists
      const financeEntry = budgetFinanz.find(f => f.id === updatedPlayer.id);
      if (financeEntry) {
        await saveFinanz({
          ...financeEntry,
          name: updatedPlayer.name,
          pos: updatedPlayer.position,
          baseSalary: updatedPlayer.finance?.baseSalary || 0,
          bonusPerMatch: updatedPlayer.finance?.bonusPerMatch || 0,
          sideAgreements: updatedPlayer.finance?.sideAgreements || '',
        } as any);
      }

      // Return to player list after editing
      setSelectedPlayerId(null);
      setShowAddPlayerModal(false);
      setEditingPlayer(null);
      setSaveStatus('success');
      setToast({ message: 'Person erfolgreich aktualisiert.', id: Date.now() });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      handleFirestoreError(err, OperationType.UPDATE, `spieler/${updatedPlayer.id}`);
    }
  };

  const handleDeletePlayer = async (id: string, skipConfirm = true) => {
    if (!id) {
      console.warn("Löschvorgang abgebrochen: Keine ID übergeben.");
      return;
    }

    const player = players.find(p => p.id === id);
    if (!player) {
      console.warn(`Löschvorgang abgebrochen: Profil mit ID ${id} existiert nicht.`);
      return;
    }

    const playerName = (player.name || `${player.firstName || ''} ${player.lastName || ''}`).trim();

    const shouldSkip = skipConfirm === undefined ? true : skipConfirm;
    
    if (shouldSkip) {
      try {
        // 1. Hook-based local state deletions (offline-safe & instant UI update)
        await deleteSpieler(id);
        await deleteAttendance(id).catch((e) => console.warn(`deleteAttendance failed:`, e));
        await deleteCompMinutes(id).catch((e) => console.warn(`deleteCompMinutes failed:`, e));
        await deleteTestMinutes(id).catch((e) => console.warn(`deleteTestMinutes failed:`, e));
        await deleteCardRecord(id).catch((e) => console.warn(`deleteCardRecord failed:`, e));
        await deleteFinanz(id).catch((e) => console.warn(`deleteFinanz failed:`, e));

        // 2. Query-based deletions in Firestore
        const batch = writeBatch(db);
        const queryColls = [
          { name: 'individual_training', field: 'playerId' },
          { name: 'run_records', field: 'playerId' },
          { name: 'physio_entries', field: 'playerId' }
        ];

        for (const coll of queryColls) {
          if (!isQueryParamValid(id)) {
            console.warn(`Abgebrochen: Query-Parameter id für ${coll.name} ist ungültig.`);
            continue;
          }
          const q = query(collection(db, coll.name), where(coll.field, '==', id));
          const snapshot = await getDocs(q);
          snapshot.forEach(d => batch.delete(d.ref));
        }

        // Special case for meetings (uses name)
        if (playerName && isQueryParamValid(playerName)) {
          const qM = query(collection(db, 'meetings_data'), where('playerName', '==', playerName));
          const snapM = await getDocs(qM);
          snapM.forEach(d => batch.delete(d.ref));
        }

        await batch.commit().catch((e) => console.warn("Firestore batch delete failed/skipped (offline/quota):", e));

        // 3. Sync local state of query-based collections immediately for instant UI feedback
        if (typeof removeIndividualTraining === 'function') {
          const itemsToRemove = (individualTrainingData || []).filter((item: any) => item.playerId === id);
          for (const item of itemsToRemove) {
            await removeIndividualTraining(item.id).catch(() => {});
          }
        }
        if (typeof deleteRunRecord === 'function') {
          const itemsToRemove = (runRecords || []).filter((item: any) => item.playerId === id);
          for (const item of itemsToRemove) {
            await deleteRunRecord(item.id).catch(() => {});
          }
        }
        if (typeof deletePhysioEntry === 'function') {
          const itemsToRemove = (physioEntries || []).filter((item: any) => item.playerId === id);
          for (const item of itemsToRemove) {
            await deletePhysioEntry(item.id).catch(() => {});
          }
        }
        if (typeof deleteMeetingEntry === 'function' && playerName) {
          const itemsToRemove = (meetingsData || []).filter((item: any) => item.playerName === playerName);
          for (const item of itemsToRemove) {
            await deleteMeetingEntry(item.id).catch(() => {});
          }
        }

        setToast({ message: 'Person und alle zugehörigen Daten erfolgreich gelöscht.', id: Date.now() });
        if (selectedPlayerId === id) {
          setSelectedPlayerId(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `spieler/${id}`);
      }
    }
  };

  const handleAddPlayer = async (newPlayer: Spieler) => {
    console.log('Adding player:', newPlayer);
    setSaveStatus('saving');
    try {
      const weekday = newPlayer.geburtsdatum ? getWeekdayLabel(newPlayer.geburtsdatum) : '';
      const spieler: Spieler = {
        ...newPlayer,
        wochentag: weekday,
      };
      await saveSpieler(spieler);
      
      // Also save to finance
      await saveFinanz({
        id: newPlayer.id,
        name: newPlayer.name,
        pos: newPlayer.position,
        baseSalary: newPlayer.finance?.baseSalary || 0,
        bonusPerMatch: newPlayer.finance?.bonusPerMatch || 0,
        sideAgreements: newPlayer.finance?.sideAgreements || '',
        datum: new Date().toISOString().split('T')[0],
        wochentag: getWeekdayLabel(new Date().toISOString().split('T')[0]),
        kategorie: 'Gehalt',
        einnahmen: 0,
        ausgaben: 0,
        aktuelles_budget: 0,
        notiz: `Initialer Eintrag für ${newPlayer.name}`
      } as any);

      setShowAddPlayerModal(false);
      setEditingPlayer(null);
      setSelectedPlayerId(null);
      setSaveStatus('success');
      
      const categoryLabel = newPlayer.category === 'player' ? 'Spielerkader' : 
                          newPlayer.category === 'coach' ? 'Trainerteam' : 
                          newPlayer.category === 'staff' ? 'Teammanagement / Funktionär' : 
                          newPlayer.category === 'medical' ? 'Medizinische Abteilung (Physio / Arzt)' : 'Person';
      
      setToast({ message: `${categoryLabel} erfolgreich hinzugefügt`, id: Date.now() });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('idle');
      handleFirestoreError(error, OperationType.CREATE, 'spieler');
    }
  };

  const handleUpdateAttendance = useCallback(async (playerId: string, session: number, status: string) => {
    console.log(`Updating attendance for player ${playerId}, session ${session} to ${status}`);
    try {
      const docRef = doc(db, 'attendance', playerId);
      const updateValue = status === '' ? deleteField() : status;
      
      try {
        await updateDoc(docRef, {
          [`sessions.${session}`]: updateValue
        });
      } catch (e: any) {
        // If document doesn't exist (code 'not-found'), create it with setDoc
        if (e.code === 'not-found') {
          if (status !== '') {
            await setDoc(docRef, {
              playerId: playerId,
              sessions: { [session]: status }
            });
          }
        } else {
          throw e;
        }
      }
      
      setToast({ message: 'Anwesenheit aktualisiert', id: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${playerId}`);
    }
  }, []);

  const handleUpdateDayPlan = (date: string, field: string, value: any) => {
    const plan = yearlyPlan.find((p: any) => p.date === date) || { date };
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      saveYearlyPlan({ 
        ...(plan as any), 
        [parent]: { 
          ...((plan as any)[parent] || {}), 
          [child]: value 
        } 
      });
    } else {
      saveYearlyPlan({ ...(plan as any), [field]: value });
    }
  };

  // Handlers for Cloud Collections
  const handleSaveSpieler = async (data: Partial<Spieler>) => {
    const weekday = data.geburtsdatum ? getWeekdayLabel(data.geburtsdatum) : '';
    await saveSpieler({ ...data, wochentag: weekday } as Spieler);
    setToast({ message: 'Spieler gespeichert', id: Date.now() });
  };

  const handleSaveTraining = async (data: Partial<Training>) => {
    const weekday = data.datum ? getWeekdayLabel(data.datum) : '';
    await saveTraining({ ...data, wochentag: weekday } as Training);
    setToast({ message: 'Training gespeichert', id: Date.now() });
  };

  const handleSaveSpiel = async (data: Partial<Spiel>) => {
    const weekday = data.datum ? getWeekdayLabel(data.datum) : '';
    await saveSpiel({ ...data, wochentag: weekday } as Spiel);
    setToast({ message: 'Spiel gespeichert', id: Date.now() });
  };

  const handleSaveFinanz = async (data: Partial<Finanz>) => {
    const weekday = data.datum ? getWeekdayLabel(data.datum) : '';
    await saveFinanz({ ...data, wochentag: weekday } as Finanz);
    setToast({ message: 'Finanzdaten gespeichert', id: Date.now() });
  };

  const seasonDates = React.useMemo(() => {
    const dates: string[] = [];
    let current = new Date(2026, 6, 1); // 01.07.2026
    const end = new Date(2027, 4, 30); // 30.05.2027
    
    while (current <= end) {
      const day = current.getDay();
      // 1: Montag, 3: Mittwoch, 5: Freitag
      if (day === 1 || day === 3 || day === 5) {
        dates.push(current.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  const isBeforeAug112026 = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    let parsedDate: Date | null = null;
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (d && m && y) parsedDate = new Date(y, m - 1, d);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y && m && d) parsedDate = new Date(y, m - 1, d);
      }
    }
    if (!parsedDate || isNaN(parsedDate.getTime())) return false;
    const cutoff = new Date(2026, 7, 11); // 11.08.2026
    return parsedDate < cutoff;
  };

  const handleUpdateTrainingSession = (id: string, field: string, value: any) => {
    const session = trainingSessions.find((s: any) => s.id === id);
    if (!session) return;
    
    // Daten vor dem 11.08.2026 dürfen NICHT verändert werden (außer Teilnehmerlisten)
    if (isBeforeAug112026(session.date) && !field.startsWith('players')) {
      setToast({ message: 'Daten vor dem 11.08.2026 dürfen nicht geändert werden (außer Teilnehmerlisten).', id: Date.now() });
      return;
    }

    let updatedSession: any;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedSession = { ...session, [parent]: { ...(session as any)[parent], [child]: value } };
    } else {
      updatedSession = { ...session, [field]: value };
    }
    saveTrainingSession(updatedSession);
    void saveTrainingFirestore(String(session.id), updatedSession);
  };

  const handleUpdateIndividualTraining = (playerId: string, field: keyof IndividualTrainingRecord, value: string) => {
    const existing = individualTrainingData.find(d => d.playerId === playerId && d.date === selectedIndividualDate);
    if (existing) {
      saveIndividualTraining({ ...existing, [field]: value });
    } else {
      saveIndividualTraining({ 
        id: `${playerId}_${selectedIndividualDate}`,
        date: selectedIndividualDate, 
        playerId, 
        focus: '',
        goals: '',
        status: '',
        load: 'Normal',
        targetDate: '',
        ek: '', o: '', t: '', p: '', s: '', a: '', w: '', notes: '', 
        [field]: value 
      } as any);
    }
  };

  const handleAddTrainingSession = async () => {
    const newSession: TrainingSession = {
      id: `ts${Date.now()}`,
      date: new Date().toLocaleDateString('de-DE'),
      weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(new Date()),
      group: 'CoCoach',
      load: 'Mittel',
      duration: '90 Min',
      weeklyFocus: '',
      sessionFocus: '',
      trainer: 'Amin',
      intensity: 'Mittel',
      players: sortPlayers(players)
        .map(p => ({ name: p.lastName, position: p.position, status: 'Aktiv' })),
      content: { warmup: '', main1: '', main2: '', closing: '' },
      importantInfo: '',
      remarks: ''
    };
    await saveTrainingFirestore(newSession.id, newSession);
    await saveTrainingSession(newSession);
    setSelectedSessionId(newSession.id);
  };

  const handleSyncSquadToTraining = (sessionId: string) => {
    const session = trainingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Removed window.confirm
    // players already has SC Sand fallback via useMemo
    const sourcePlayers = (
      isDemo && players.length === 0 ? INITIAL_PLAYERS :
      players
    ) as any[];
    const squadPlayers = sortPlayers(sourcePlayers)
      .map(p => ({ 
        name: p.lastName, 
        position: p.position, 
        status: 'Aktiv' 
      }));
    handleUpdateTrainingSession(sessionId, 'players', squadPlayers);
  };

  const generateSeasonSessions = async (options?: {
    startDate?: string;
    endDate?: string;
    trainingDays?: number[]; // Day numbers: 0 for Sunday, 1 for Monday, etc.
    skipHolidays?: boolean;
    breakStart?: string;
    breakEnd?: string;
  }) => {
    const opts = {
      startDate: '2026-07-06',
      endDate: '2027-05-30',
      trainingDays: [2, 4], // Default to Tuesday & Thursday (typical for amateur club)
      skipHolidays: true,
      breakStart: '2026-12-15',
      breakEnd: '2027-01-15',
      ...options
    };

    const start = new Date(opts.startDate);
    const end = new Date(opts.endDate);
    const breakS = new Date(opts.breakStart);
    const breakE = new Date(opts.breakEnd);
    const sessions: TrainingSession[] = [];
    const yearlyPlanEntries: any[] = [];
    
    let current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const dateStr = current.toLocaleDateString('de-DE');
      const year = current.getFullYear();
      const holidays = getHolidays(year);
      const customHoliday = yearlyPlan.find((p: any) => p.date === dateKey)?.customHolidayName;
      const isHoliday = customHoliday !== undefined ? (customHoliday !== "") : (holidays[dateKey] !== undefined);
      const holidayName = customHoliday !== undefined ? (customHoliday || null) : holidays[dateKey];

      // 1. Winter break check
      if (current >= breakS && current <= breakE) {
        yearlyPlanEntries.push({
          date: dateKey,
          type: 'Frei',
          activity: 'WINTERPAUSE',
          time: '',
          phase: 'break'
        });
        current.setDate(current.getDate() + 1);
        continue;
      }

      // 2. Check if holiday should be skipped/marked as Frei
      if (isHoliday && opts.skipHolidays) {
        yearlyPlanEntries.push({
          date: dateKey,
          type: 'Frei',
          activity: holidayName,
          time: '',
          phase: (current >= new Date('2026-07-06') && current <= new Date('2026-08-15')) ? 'summer' : 'season'
        });
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
      
      // 3. Check if this is a selected training day
      if (opts.trainingDays.includes(dayOfWeek)) {
        // Check if session already exists for this date
        const exists = findSessionByDate(trainingSessions, dateStr);
        if (!exists) {
          const newSession: TrainingSession = {
            id: `ts${current.getTime()}`,
            date: dateStr,
            weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(current),
            group: 'CoCoach',
            load: 'Mittel',
            duration: '90 Min',
            weeklyFocus: '',
            sessionFocus: '',
            trainer: 'Amin',
            intensity: 'Mittel',
            players: sortPlayers((isDemo && players.length === 0 ? INITIAL_PLAYERS : players) as any[])
              .filter(p => (p.category || 'player') === 'player')
              .map(p => ({ name: p.lastName, position: p.position, status: '1' })),
            content: { warmup: '', main1: '', main2: '', closing: '' },
            importantInfo: '',
            remarks: ''
          };
          sessions.push(newSession);
          
          yearlyPlanEntries.push({
            date: dateKey,
            type: 'Training',
            time: '19:00',
            activity: 'Training',
            phase: (current >= new Date('2026-07-06') && current <= new Date('2026-08-15')) ? 'summer' : 'season',
            training: { start: '19:00', end: '20:30', notes: '' }
          });
        }
      } else {
        // All other days are marked as "Frei" (Spielfrei / Trainingsfrei) in the yearly plan
        yearlyPlanEntries.push({
          date: dateKey,
          type: 'Frei',
          activity: 'SPIELFREI',
          time: '',
          phase: (current >= new Date('2026-07-06') && current <= new Date('2026-08-15')) ? 'summer' : 'season'
        });
      }

      current.setDate(current.getDate() + 1);
    }

    if (sessions.length > 0 || yearlyPlanEntries.length > 0) {
      // Save sessions
      for (const s of sessions) {
        await saveTrainingSession(s);
      }
      
      // Save yearly plans
      for (const entry of yearlyPlanEntries) {
        const existingPlan = yearlyPlan.find((p: any) => p.date === entry.date);
        if (!existingPlan) {
          await saveYearlyPlan(entry);
        } else {
          // If existing plan is a placeholder or can be updated
          if (existingPlan.type === 'Frei' && entry.type === 'Training') {
            await saveYearlyPlan({ ...existingPlan, ...entry });
          } else if (entry.activity === 'WINTERPAUSE' || (entry.activity && !existingPlan.activity)) {
            await saveYearlyPlan({ ...existingPlan, ...entry });
          }
        }
      }

      setToast({ message: `${sessions.length} Trainingseinheiten und freie Tage wurden erfolgreich generiert.`, id: Date.now() });
    } else {
      setToast({ message: 'Keine neuen Einheiten zu generieren (alle Daten bereits belegt).', id: Date.now() });
    }
  };

  // Attach to window for the view to call
  useEffect(() => {
    (window as any).generateSeasonSessions = generateSeasonSessions;
    (window as any).saveTrainingSession = saveTrainingSession;
    return () => { 
      delete (window as any).generateSeasonSessions;
      delete (window as any).saveTrainingSession;
    };
  }, [trainingSessions, players, saveTrainingSession, yearlyPlan, saveYearlyPlan]);

  const handleAddYouthPlayer = (sessionId: string, team: 'U23' | 'U19') => {
    const session = trainingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newPlayers = [...session.players, { name: `NEUER ${team} SPIELER`, position: team, status: 'Aktiv' }];
    handleUpdateTrainingSession(sessionId, 'players', newPlayers);
  };

  const getShareText = () => {
    let text = `FC AUGGEN - ${TABS.find(t => t.id === activeTab)?.label}\n\n`;
    
    if (activeTab === 'scouting') {
      scoutingCandidates.forEach((c, i) => {
        text += `${i + 1}. ${c.name.toUpperCase()} (${c.club})\n`;
        text += `   Pos: ${c.position} | Alter: ${c.age} | MW: ${c.marketValue}\n`;
        text += `   Empfehlung: ${c.recommendation}\n`;
        if (c.conversationNotes) text += `   Gespräch: ${c.conversationNotes}\n`;
        if (c.waitingTime) text += `   Antwort bis: ${c.waitingTime}\n`;
        text += `\n`;
      });
    } else if (activeTab === 'personnel') {
      players.forEach((p) => {
        text += `#${p.number} ${p.lastName} (${p.position})`;
        if (p.telefon) text += ` | Tel: ${p.telefon}`;
        if (p.email) text += ` | Mail: ${p.email}`;
        text += `\n`;
      });
    } else if (activeTab === 'meetings_calendar') {
      meetingsData.forEach((m) => {
        const name = m.playerName === 'EXTERN' ? m.manualName || 'Unbekannt' : m.playerName;
        text += `${m.date} ${m.time} - ${name}\n`;
        text += `Ort: ${m.location}\n`;
        if (m.notes) text += `Notiz: ${m.notes}\n\n`;
      });
    } else if (activeTab === 'attendance') {
      text += `Anwesenheit Übersicht:\n`;
      players.forEach(p => {
        const record = attendance.find(a => a.playerId === p.id);
        const total = record ? Object.values(record.sessions).filter(s => s === 'P').length : 0;
        text += `${p.lastName}: ${total} Einheiten\n`;
      });
    } else if (activeTab === 'budget_finance') {
      players.forEach(p => {
        text += `${p.lastName} (${p.position}): ${p.finance?.baseSalary || 0}€`;
        if (p.finance?.transferFeeIn) text += ` | Ablöse Z: ${p.finance.transferFeeIn}€`;
        if (p.finance?.transferFeeOut) text += ` | Ablöse A: ${p.finance.transferFeeOut}€`;
        text += `\n`;
      });
    } else if (activeTab === 'yearly') {
      text += "PLANUNG NÄCHSTE 7 TAGE:\n\n";
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const plan = yearlyPlan.find((p: any) => p.date === dateStr);
        if (plan) {
          text += `${dateStr}: ${plan.type} | ${plan.time} | ${plan.location}\n`;
          if (plan.activity) text += `   Aktivität: ${plan.activity}\n`;
          if (plan.treffpunkt) text += `   Treffpunkt: ${plan.treffpunkt}\n`;
          text += `\n`;
        }
      }
      if (text.endsWith("PLANUNG NÄCHSTE 7 TAGE:\n\n")) {
        text += "Keine Einträge für die nächsten 7 Tage.";
      }
    } else if (activeTab === 'physio_plan') {
      physioEntries.filter(e => e.playerId).forEach(e => {
        const p = players.find(pl => pl.id === e.playerId);
        text += `${e.date} (${e.day}) - ${p?.lastName || 'Unbekannt'}\n`;
        text += `Typ: ${e.type} | Bereich: ${e.area}\n`;
        if (e.remarks) text += `Bemerkung: ${e.remarks}\n\n`;
      });
    } else if (activeTab === 'runs_sw') {
      runRecords.forEach(r => {
        const p = players.find(pl => pl.id === r.playerId);
        const completed = Object.values(r.runs).filter(v => v === 'OK').length;
        text += `${p?.lastName}: ${completed}/15 Läufe\n`;
      });
    } else if (activeTab === 'cards') {
      cardRecords.forEach(r => {
        const p = players.find(pl => pl.id === r.playerId);
        const cards = Object.values(r.cards).filter(v => v !== '').length;
        text += `${p?.lastName}: ${cards} Karten gesamt\n`;
      });
    } else if (activeTab === 'individual_control') {
      individualTrainingData.filter(d => d.date === selectedIndividualDate).forEach(d => {
        const p = players.find(pl => pl.id === d.playerId);
        text += `${p?.lastName}: EK:${d.ek} O:${d.o} T:${d.t} P:${d.p} S:${d.s} A:${d.a} W:${d.w}\n`;
      });
    } else if (activeTab === 'trainer_view') {
      const currentFormation = formation.find((f: any) => f.id === 'current')?.value || '4-2-3-1';
      text += `FORMATION: ${currentFormation}\n\n`;
      text += "Kaderübersicht Trainer:\n";
      players.forEach(p => {
        text += `#${p.number} ${p.lastName}, ${p.firstName} (${p.position})\n`;
      });
    } else if (activeTab === 'training_planning') {
      const session = trainingSessions.find(s => s.id === selectedSessionId);
      if (session) {
        text += `TRAININGSEINHEIT: ${new Date(session.date).toLocaleDateString('de-DE')} (${session.weekday})\n`;
        text += `Schwerpunkt: ${session.sessionFocus || '-'}\n`;
        text += `Dauer: ${session.duration} | Belastung: ${session.load}\n`;
        text += `Trainer: ${session.trainer || 'Amin, marcel'}\n`;
        if (session.opponent) text += `Gegner: ${session.opponent}\n`;
        if (session.location) text += `Ort: ${session.location}\n`;
        
        const fieldPlayers = session.players.filter((p: any) => (p.category === 'player' || p.category === 'spieler') && (p.position || '').toUpperCase() !== 'TW');
        const keepers = session.players.filter((p: any) => (p.category === 'player' || p.category === 'spieler') && (p.position || '').toUpperCase() === 'TW');
        const staff = session.players.filter((p: any) => p.category !== 'player' && p.category !== 'spieler');
        
        const presentPlayers = fieldPlayers.filter((p: any) => p.status === '1');
        const presentKeepers = keepers.filter((p: any) => p.status === '1');
        
        text += `\nTEILNEHMER:\n`;
        text += `Spieler: ${presentPlayers.length}/${fieldPlayers.length}\n`;
        text += `TW: ${presentKeepers.length}/${keepers.length}\n`;
        text += `Staff: ${staff.filter((p: any) => p.status === '1').length}/${staff.length}\n`;
        
        text += `\nINHALT:\n`;
        text += `Aufwärmen: ${session.content.warmup}\n`;
        text += `Hauptteil 1: ${session.content.main1}\n`;
        text += `Hauptteil 2: ${session.content.main2}\n`;
        text += `Schluss: ${session.content.closing}\n`;
        if (session.importantInfo) text += `\nWichtig: ${session.importantInfo}\n`;
        if (session.remarks) text += `Bemerkungen: ${session.remarks}\n`;
      } else {
        text += "Keine Trainingseinheit ausgewählt.";
      }
    } else if (activeTab === 'competitive_planning' || activeTab === 'test_planning') {
      const matches = activeTab === 'competitive_planning' ? competitiveMatches : testMatches;
      text += `${activeTab === 'competitive_planning' ? 'PFLICHTSPIELE' : 'TESTSPIELE'}:\n\n`;
      matches.forEach(m => {
        text += `${m.date || ''} ${m.kickOff} - ${m.opponent} (${m.isHome ? 'H' : 'A'})\n`;
        text += `Treffpunkt: ${m.meetingTime} | Ort: ${m.location}\n`;
        if (m.result) text += `Ergebnis: ${m.result}\n`;
        text += `\n`;
      });
    } else if (activeTab === 'tacticboard') {
      text += `TAKTIKBOARD - ANWEISUNGEN:\n\n${tacticInstructions || 'Keine Anweisungen vorhanden.'}`;
    } else if (activeTab === 'team_list') {
      text += "TEAMLISTE:\n\n";
      players.forEach(p => {
        text += `${p.lastName}, ${p.firstName} (#${p.number}) - ${p.position}\n`;
      });
    } else if (activeTab === 'summer_prep' || activeTab === 'winter_prep') {
      const data = activeTab === 'summer_prep' ? vorbereitungSommer : vorbereitungWinter;
      text += `${activeTab === 'summer_prep' ? 'SOMMERVORBEREITUNG' : 'WINTER-VORBEREITUNG'}:\n\n`;
      data.forEach((unit: any) => {
        text += `${unit.date} (${unit.day}) - ${unit.type}\n`;
        if (unit.activity) text += `Aktivität: ${unit.activity}\n`;
        if (unit.time) text += `Zeit: ${unit.time}\n`;
        if (unit.location) text += `Ort: ${unit.location}\n`;
        text += `\n`;
      });
    } else if (activeTab === 'developer_tasks') {
      text += "DEVELOPER ROADMAP: Interne Entwicklungsdaten.";
    } else {
      text += "Daten für diesen Reiter können aktuell nur als Datei exportiert werden.";
    }
    return text;
  };

  const handleShareText = async () => {
    const text = getShareText();
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;
    
    // Prioritize direct WhatsApp if in AI Studio area to avoid iframe share restrictions
    if (!navigator.share || window.location.href.includes('google.com') || window.location.href.includes('ais-')) {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await navigator.share({
        title: `CoCoach - ${tabLabel}`,
        text: text
      });
    } catch (e) {
      console.log('Share failed, falling back to api.whatsapp.com', e);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEmail = () => {
    const text = getShareText();
    const subject = `CoCoach - ${TABS.find(t => t.id === activeTab)?.label}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.location.assign(mailtoUrl);
  };
















  const handleMigrateCloudData = async () => {
    setToast({ message: 'Alle Daten werden direkt mit Firestore synchronisiert.', id: Date.now() });
  };
  
  const handleMigrateLocalData = async () => {
    setToast({ message: 'Alle Daten werden direkt mit Firestore synchronisiert.', id: Date.now() });
  };

  const handleCloudSync = async () => {
    setToast({ message: 'Alle Daten werden direkt mit Firestore synchronisiert.', id: Date.now() });
  };

  const getCategoryForTab = (tabId: TabId): 'ubersicht' | 'kader' | 'training' | 'match' | 'orga' => {
    if (['dashboard', 'developer_tasks'].includes(tabId)) return 'ubersicht';
    if (['personnel', 'team_list', 'player_portal', 'scouting'].includes(tabId)) return 'kader';
    if (['academy_analysis', 'attendance', 'training_planning', 'individual_control', 'runs_sw', 'summer_prep', 'winter_prep'].includes(tabId)) return 'training';
    if (['champions_cup', 'competitive_planning', 'test_planning', 'u23_planning', 'match_report', 'tacticboard', 'trainer_view', 'video_analysis', 'match_analysis_pro'].includes(tabId)) return 'match';
    if (['yearly', 'budget_finance', 'meetings_calendar', 'physio_plan', 'access_control'].includes(tabId)) return 'orga';
    return 'ubersicht';
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setSelectedPlayerId(null);
    setIsMobileMenuOpen(false);
    setNavCategory(getCategoryForTab(tabId));
  };

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const bootstrapData = async (silent = false) => {
    setToast({ message: 'Alle Daten werden direkt mit Firestore synchronisiert.', id: Date.now() });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            players={sortedPlayers}
            competitiveMatches={competitiveMatches}
            testMatches={testMatches}
            trainingSessions={trainingSessions}
            onSaveTestMatch={saveTestMatch}
            onSaveCompetitiveMatch={saveCompMatch}
            onNavigateToTab={(tabId) => handleTabClick(tabId)}
            onDeepLinkPlayer={(playerId) => {
              setDeepLinkPlayerId(playerId);
              handleTabClick('player_portal');
            }}
            clubName={activeClub.name}
            clubShortName={activeClub.shortName}
          />
        );
      case 'personnel':
        return (
          <PersonnelView 
            players={sortedPlayers}
            sessionLogs={playerSessionLogs || []}
            onEditPlayer={(p) => {
              setEditingPlayer(p);
              setShowAddPlayerModal(true);
            }}
            onDeletePlayer={handleDeletePlayer}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) {
                const updated = { ...player, [field]: val };
                if (field === 'firstName' || field === 'lastName') {
                  updated.name = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();
                }
                saveSpieler(updated);
              }
            }}
            onAddPlayer={() => {
              setEditingPlayer(null);
              setShowAddPlayerModal(true);
            }}
            isEditing={isEditing}
          />
        );
      case 'summer_prep':
        return (
          <SummerPreparationView 
            data={vorbereitungSommer} 
            onAddOrUpdate={handleSaveVorbereitungSommer} 
            onDelete={handleRemoveVorbereitungSommer}
            isEditing={isEditing} 
            setToast={setToast}
            opponents={opponents}
          />
        );
      case 'winter_prep':
        return (
          <WinterPreparationView 
            data={vorbereitungWinter} 
            onAddOrUpdate={saveVorbereitungWinter} 
            onDelete={removeVorbereitungWinter}
            isEditing={isEditing} 
            setToast={setToast}
            opponents={opponents}
          />
        );
      case 'attendance':
        return (
          <TrainingAttendanceView 
            players={sortedPlayers}
            attendance={attendance}
            onUpdateAttendance={handleUpdateAttendance}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) saveSpieler({ ...player, [field]: val });
            }}
            onEditPlayer={(p) => {
              setEditingPlayer(p);
              setShowAddPlayerModal(true);
            }}
            onDeletePlayer={handleDeletePlayer}
            onAddPlayer={() => {
              setEditingPlayer(null);
              setShowAddPlayerModal(true);
            }}
            onClearRangeSessions={async (start, end) => {
              try {
                const batch = writeBatch(db);
                let hasUpdates = false;
                attendance.forEach((record) => {
                  const updates: any = {};
                  let recordHasUpdates = false;
                  for (let num = start; num <= end; num++) {
                    const isNested = record.sessions && record.sessions[num] !== undefined;
                    const isFlat = record[`sessions.${num}`] !== undefined;
                    if (isNested || isFlat) {
                      updates[`sessions.${num}`] = deleteField();
                      recordHasUpdates = true;
                    }
                  }
                  if (recordHasUpdates) {
                    const docRef = doc(db, 'attendance', record.playerId);
                    batch.update(docRef, updates);
                    hasUpdates = true;
                  }
                });
                if (hasUpdates) {
                  await batch.commit();
                }
                setToast({ message: `Einheiten ${start} bis ${end} wurden gelöscht`, id: Date.now() });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `attendance/clear/range-${start}-${end}`);
              }
            }}
            onClearAllSessions={async () => {
              try {
                const batch = writeBatch(db);
                let hasUpdates = false;
                attendance.forEach((record) => {
                  const docRef = doc(db, 'attendance', record.playerId);
                  batch.update(docRef, {
                    sessions: deleteField()
                  });
                  hasUpdates = true;
                });
                if (hasUpdates) {
                  await batch.commit();
                }
                setToast({ message: `Alle Trainingseinheiten wurden gelöscht`, id: Date.now() });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `attendance/clear/all`);
              }
            }}
            onClearSession={async (sessionNum) => {
              try {
                const batch = writeBatch(db);
                let hasUpdates = false;
                attendance.forEach((record) => {
                  const isNested = record.sessions && record.sessions[sessionNum] !== undefined;
                  const isFlat = record[`sessions.${sessionNum}`] !== undefined;
                  if (isNested || isFlat) {
                    const docRef = doc(db, 'attendance', record.playerId);
                    batch.update(docRef, {
                      [`sessions.${sessionNum}`]: deleteField()
                    });
                    hasUpdates = true;
                  }
                });
                if (hasUpdates) {
                  await batch.commit();
                }
                setToast({ message: `Trainingseinheit ${sessionNum} geleert`, id: Date.now() });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `attendance/clear/${sessionNum}`);
              }
            }}
            isEditing={isEditing}
          />
        );
      case 'yearly':
        const yearlyPlanRecord = yearlyPlan.reduce((acc: any, p: any) => {
          acc[p.date] = p;
          return acc;
        }, {});
        
        return (
          <YearlyPlanView 
            yearlyPlan={yearlyPlanRecord} 
            players={sortedPlayers}
            trainingSessions={trainingSessions}
            summerPrep={vorbereitungSommer}
            testMatches={testMatches}
            competitiveMatches={competitiveMatches}
            currentMonth={currentMonth} 
            setCurrentMonth={setCurrentMonth} 
            handleUpdateDayPlan={async (dateKey, field, val) => {
              try {
                const existing = yearlyPlan.find((p: any) => p.date === dateKey) || { date: dateKey };
                let updated: any = { ...existing, date: dateKey };

                if (field === '_full_day_') {
                  updated = {
                    ...existing,
                    ...val,
                    date: dateKey
                  };
                } else if (field.includes('.')) {
                  const [parent, child] = field.split('.');
                  updated = {
                    ...updated,
                    [parent]: {
                      ...(typeof updated[parent] === 'object' && updated[parent] !== null ? updated[parent] : {}),
                      [child]: val
                    }
                  };
                } else {
                  updated[field] = val;
                }

                // If date exists in summer prep, also keep summer prep in sync
                const summerItem = vorbereitungSommer.find((v: any) => v.date === dateKey);
                if (summerItem) {
                  if (field === '_full_day_') {
                    void saveVorbereitungSommer({
                      ...summerItem,
                      type: val.type || summerItem.type,
                      content: val.content || val.activity || summerItem.content,
                      time: val.time || summerItem.time,
                      location: val.location || summerItem.location,
                      opponent: val.opponent || summerItem.opponent,
                      treffpunkt: val.treffpunkt || summerItem.treffpunkt,
                      ergebnis: val.ergebnis || summerItem.ergebnis
                    });
                  } else {
                    const summerFieldMap: Record<string, string> = {
                      activity: 'content',
                      time: 'time',
                      location: 'location',
                      type: 'type',
                      opponent: 'opponent',
                      treffpunkt: 'treffpunkt',
                      ergebnis: 'ergebnis',
                      notes: 'notes'
                    };
                    const sField = summerFieldMap[field] || field;
                    void saveVorbereitungSommer({
                      ...summerItem,
                      [sField]: val,
                      type: field === 'type' ? val : (summerItem.type || val)
                    });
                  }
                }

                await saveYearlyPlan(updated);
                setToast({ message: 'Plan aktualisiert', id: Date.now() });
              } catch (err) {
                console.error('Error updating plan:', err);
                setToast({ message: 'Fehler beim Speichern des Plans', id: Date.now() });
              }
            }} 
            isEditing={isEditing}
          />
        );
      case 'cards':
        return (
          <CardStatisticsSheet 
            players={sortedPlayers}
            competitiveMatches={competitiveMatches}
            cardRecords={cardRecords}
            handleUpdateCard={async (playerId, matchId, card) => {
              try {
                const docRef = doc(db, 'card_records', playerId);
                try {
                  await updateDoc(docRef, {
                    [`cards.${matchId}`]: card
                  });
                } catch (e: any) {
                  if (e.code === 'not-found') {
                    await setDoc(docRef, {
                      playerId: playerId,
                      cards: { [matchId]: card }
                    });
                  } else {
                    throw e;
                  }
                }
                setToast({ message: 'Karten aktualisiert', id: Date.now() });
              } catch (err) {
                console.error('Error updating cards:', err);
                setToast({ message: 'Fehler beim Speichern der Karten', id: Date.now() });
              }
            }}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) saveSpieler({ ...player, [field]: val });
            }}
            onDeletePlayer={handleDeletePlayer}
            setShowAddPlayerModal={setShowAddPlayerModal}
            isEditing={isEditing}
          />
        );
      case 'scouting':
        return (
          <ScoutingView 
            scoutingCandidates={scoutingCandidates}
            scoutingViewMode={scoutingViewMode}
            setScoutingViewMode={setScoutingViewMode}
            setShowAddScoutingModal={setShowAddScoutingModal}
            handleUpdateScoutingCandidate={(id, field, val) => {
              const candidate = scoutingCandidates.find((c: any) => c.id === id);
              if (candidate) saveScoutingCandidate({ ...candidate, [field]: val });
            }}
            handleRemoveScoutingCandidate={(id) => handleDeleteItem('scouting_candidates', id, 'Kandidat')}
            setShowRemoveScoutingModal={setShowRemoveScoutingModal}
            onAddScoutingCandidate={(candidate) => {
              saveScoutingCandidate({ ...candidate, id: Date.now().toString(), createdAt: Date.now() });
              setToast({ message: 'Scouting-Kandidat erfolgreich angelegt.', id: Date.now() });
            }}
            handleResetScouting={handleResetScouting}
            depthChart={depthChart[0] || {}}
            setDepthChart={(chart) => {
              const currentChart = depthChart[0] || { id: 'current' };
              void saveDepthChart({ ...currentChart, ...chart, id: 'current' });
            }}
            players={sortedPlayers}
            isEditing={isEditing}
          />
        );
      case 'budget_finance':
        return (
          <BudgetFinanceView 
            players={sortedPlayers}
            financeMeta={financeMeta[0] || { month: '2026-07', wins: 0, draws: 0, bonusPerPoint: 0 }}
            setFinanceMeta={(meta) => {
              const currentMeta = financeMeta[0] || { id: 'current', month: '2026-07', wins: 0, draws: 0, bonusPerPoint: 0 };
              const newMeta = typeof meta === 'function' ? meta(currentMeta) : meta;
              saveFinanceMeta({ ...newMeta, id: 'current' });
            }}
            handleUpdateFinance={(playerId, field, value) => {
              const player = players.find(p => p.id === playerId);
              if (player) {
                const updatedPlayer = {
                  ...player,
                  finance: {
                    ...player.finance,
                    [field]: value
                  }
                };
saveSpieler(updatedPlayer as Spieler);
              }
            }}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            isEditing={isEditing}
          />
        );
      case 'meetings_calendar':
        return (
          <MeetingsCalendarView 
            players={sortedPlayers}
            scoutingCandidates={scoutingCandidates}
            meetingsData={meetingsData}
            handleAddMeetingEntry={() => setShowAddMeetingModal(true)}
            handleUpdateMeetingEntry={(id, field, val) => {
              const entry = meetingsData.find((m: any) => m.id === id);
              void saveMeetingEntry({ ...entry, [field]: val });
            }}
            handleRemoveMeetingEntry={(id) => handleDeleteItem('meetings_data', id, 'Termin')}
            handleResetMeetings={handleResetMeetings}
            handleImportMeetings={handleImportMeetings}
            onAddScoutingCandidate={(candidate) => {
              saveScoutingCandidate({ ...candidate, id: Date.now().toString(), createdAt: Date.now() });
              setToast({ message: 'Scouting-Kandidat erfolgreich angelegt.', id: Date.now() });
            }}
            onOpenGoogleCalendar={() => setShowGoogleCalendarModal(true)}
            isEditing={isEditing}
          />
        );
      case 'individual_control':
        return (
          <IndividualSteuerungView 
            players={sortedPlayers}
            individualTrainingData={individualTrainingData}
            selectedIndividualDate={selectedIndividualDate}
            setSelectedIndividualDate={setSelectedIndividualDate}
            handleUpdateIndividualTraining={(playerId, field, val) => {
              const id = `${playerId}_${selectedIndividualDate}`;
              const existingRecord = individualTrainingData.find((r: any) => r.id === id);
              
              if (field === 'delete' && existingRecord) {
                removeIndividualTraining(existingRecord.id)
                  .then(() => {
                    setToast({ message: 'Eintrag gelöscht', id: Date.now() });
                  })
                  .catch((err) => {
                    console.error('Error deleting individual training:', err);
                    setToast({ message: 'Fehler beim Löschen', id: Date.now() });
                  });
                return;
              }

              const record = existingRecord || { 
                id, 
                playerId, 
                date: selectedIndividualDate,
                focus: '',
                goals: '',
                status: '',
                load: 'Normal',
                targetDate: selectedIndividualDate,
                ek: '', o: '', t: '', p: '', s: '', a: '', w: ''
              };
              
              saveIndividualTraining({ ...record, [field]: val })
                .then(() => {
                  console.log(`Updated individual training for ${playerId} on ${selectedIndividualDate}: ${field} = ${val}`);
                })
                .catch((err) => {
                  console.error('Error updating individual training:', err);
                  setToast({ message: 'Fehler beim Speichern der Daten', id: Date.now() });
                });
            }}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) {
                const updated = { ...player, [field]: val };
                if (field === 'firstName' || field === 'lastName') {
                  updated.name = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();
                }
                saveSpieler(updated);
              }
            }}
            onDeletePlayer={handleDeletePlayer}
            onAddPlayer={() => setShowAddPlayerModal(true)}
            onAddPlayerDirect={handleAddPlayer}
            isEditing={isEditing}
          />
        );
      case 'runs_sw':
        return (
          <RunsSWView 
            players={sortedPlayers}
            runRecords={runRecords}
            runMeta={runMeta}
            onUpdateRunRecord={(record) => {
              saveRunRecord(record)
                .then(() => {
                  console.log('Lauf-Datensatz aktualisiert:', record.id);
                })
                .catch((err) => {
                  console.error('Fehler beim Aktualisieren des Lauf-Datensatzes:', err);
                  setToast({ message: 'Fehler beim Speichern der Daten', id: Date.now() });
                });
            }}
            onUpdateRunMeta={(meta) => {
              saveRunMeta(meta)
                .then(() => {
                  setToast({ message: 'Lauf-Konfiguration gespeichert', id: Date.now() });
                })
                .catch((err) => {
                  console.error('Fehler beim Speichern der Lauf-Meta:', err);
                });
            }}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) {
                const updated = { ...player, [field]: val };
                if (field === 'firstName' || field === 'lastName') {
                  updated.name = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();
                }
                saveSpieler(updated);
              }
            }}
            isEditing={isEditing}
          />
        );
      case 'physio_plan':
        return (
          <PhysioPlanView 
            players={sortedPlayers}
            physioEntries={physioEntries}
            onAddPhysioEntry={() => setShowAddPhysioModal(true)}
            onUpdatePhysioEntry={(entry) => {
              savePhysioEntry(entry)
                .then(() => {
                  console.log('Physio-Eintrag aktualisiert:', entry.id);
                })
                .catch((err) => {
                  console.error('Fehler beim Aktualisieren des Physio-Eintrags:', err);
                  setToast({ message: 'Fehler beim Speichern der Daten', id: Date.now() });
                });
            }}
            onUpdatePlayer={(id, field, val) => {
              const player = players.find(p => p.id === id);
              if (player) {
                const updated = { ...player, [field]: val };
                if (field === 'firstName' || field === 'lastName') {
                  updated.name = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();
                }
                saveSpieler(updated);
              }
            }}
            onDeletePlayer={handleDeletePlayer}
            onDeletePhysioEntry={(id) => handleDeleteItem('physio_entries', id, 'Physio-Eintrag')}
            setShowAddPlayerModal={setShowAddPlayerModal}
            isEditing={isEditing}
          />
        );
      case 'tacticboard':
      case 'profi_3d_taktiktafel':
        return (
          <Profi3DTacticBoardView 
            players={sortedPlayers.filter(isPlayer)} 
            competitiveMatches={competitiveMatches}
            testMatches={testMatches}
            opponents={opponents}
            onSaveMatch={saveCompMatch}
            matchAnalyses={matchAnalyses}
            onSaveMatchAnalysis={saveMatchAnalysis}
            onNavigateToVideo={() => setActiveTab('video_analysis')}
            isEditing={isEditing}
            initialStandardDraft={tacticBoardDraft}
            onDraftConsumed={() => setTacticBoardDraft(null)}
          />
        );
      case 'trainer_view':
        return (
          <FormationView 
            players={sortedPlayers.filter(isPlayer)} 
            scoutingCandidates={scoutingCandidates}
            formation={formation.find(f => f.id === 'current')?.value || '4-4-2'} 
            onFormationChange={(f) => saveFormation({ id: 'current', value: f })} 
            isEditing={isEditing}
          />
        );
      case 'training_planning':
        return (
           <TrainingPlanningView 
            players={sortedPlayers}
            competitiveMatches={competitiveMatches}
            testMatches={testMatches}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            onEmail={handleEmail}
          />
        );
      case 'developer_tasks':
        if (!isDevUnlocked) {
          return (
            <div className="flex flex-col items-center justify-center h-full bg-[#0A0E17] p-8">
              <div className="bg-[#121824] border border-[#2A2A2A] shadow-2xl p-8 max-w-md w-full rounded-2xl text-[#F5F5F5]">
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 text-[#F5F5F5]">Bereich Geschützt</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C7C7C7] mb-6">Bitte Passwort eingeben, um die Dev-Roadmap freizuschalten.</p>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (devPassword === '2011') {
                      setIsDevUnlocked(true);
                      setToast({ message: 'Dev-Roadmap freigeschaltet!', id: Date.now() });
                    } else {
                      setToast({ message: 'Falsches Passwort!', id: Date.now() });
                    }
                  }}
                  className="space-y-4"
                >
                  <input 
                    type="password" 
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="PASSWORT..."
                    className="w-full bg-[#1E293B] border-2 border-[#2A2A2A] p-3 font-black text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F] uppercase text-sm rounded-xl"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="w-full bg-[#FFD54F] hover:bg-[#FFE082] text-[#0F0F0F] py-3 font-black uppercase tracking-widest rounded-xl shadow-md transition-all border border-[#FFD54F]"
                  >
                    Freischalten
                  </button>
                </form>
              </div>
            </div>
          );
        }
        return (
          <DeveloperTasksView 
            onOpenAgentControlCenter={() => setShowAgentControlCenterModal(true)} 
            isDeveloper={isOwner || isDevUnlocked}
          />
        );
      case 'competitive_planning':
        return (
          <MatchPlanningView 
            players={sortedPlayers}
            matches={competitiveMatches}
            matchMinutes={competitiveMinutes}
            opponents={opponents}
            onSaveMatch={saveCompMatch}
            onDeleteMatch={deleteCompMatch}
            onSaveMinutes={saveCompMinutes}
            onSaveOpponent={saveOpponent}
            onDeleteOpponent={deleteOpponent}
            onWipeAllMatches={handleWipeAllCompetitiveMatches}
            onRestoreMatches={handleRestoreCompetitiveMatches}
            title="Pflichtspiel-Planung"
          />
        );
      case 'test_planning':
        return (
          <MatchPlanningView 
            players={sortedPlayers}
            matches={testMatches}
            matchMinutes={testMinutes}
            opponents={opponents}
            onSaveMatch={saveTestMatch}
            onDeleteMatch={deleteTestMatch}
            onSaveMinutes={saveTestMinutes}
            onSaveOpponent={saveOpponent}
            onDeleteOpponent={deleteOpponent}
            title="Testspiel-Planung"
          />
        );
      case 'u23_planning':
        return (
          <MatchPlanningView 
            players={sortedPlayers}
            matches={u23Matches}
            matchMinutes={u23Minutes}
            opponents={opponents}
            onSaveMatch={saveU23Match}
            onDeleteMatch={deleteU23Match}
            onSaveMinutes={saveU23Minutes}
            onSaveOpponent={saveOpponent}
            onDeleteOpponent={deleteOpponent}
            title="U23-Spiel-Planung"
          />
        );
      case 'match_report':
        return (
          <MatchReportView 
            matches={competitiveMatches}
            testMatches={testMatches}
            analyses={matchAnalyses}
            onSaveAnalysis={saveMatchAnalysis}
            onDeleteAnalysis={(id) => handleDeleteItem('match_analyses', id, 'Spielbericht')}
opponents={opponents}
players={sortedPlayers}
sessionLogs={playerSessionLogs}
onNavigateToTacticBoard={(_matchId: any, draft?: any) => {
              setTacticBoardDraft(draft || null);
              setActiveTab('profi_3d_taktiktafel');
            }}
          />
        );
      case 'team_list':
        return (
          <TeamListView 
            players={sortedPlayers} 
            onEditPlayer={(p) => {
              setEditingPlayer(p);
              setShowAddPlayerModal(true);
            }}
            onAddPlayer={() => {
              setEditingPlayer(null);
              setShowAddPlayerModal(true);
            }}
            isEditing={isEditing}
          />
        );
      case 'tracker_academy_report':
      case 'player_portal':
        return (
          <PlayerPortalView 
            players={sortedPlayers}
            sessionLogs={playerSessionLogs || []}
            initialPlayerId={deepLinkPlayerId}
            onSaveLog={async (log) => {
              try {
                await savePlayerSessionLog(log);
                setToast({ message: 'Einheit erfolgreich gespeichert!', id: Date.now() });
              } catch (err) {
                console.error("Fehler beim Speichern des Logs:", err);
                setToast({ message: 'Fehler beim Speichern der Einheit!', id: Date.now() });
              }
            }}
            onDeleteLog={async (id) => {
              try {
                await deletePlayerSessionLog(id);
                setToast({ message: 'Einheit erfolgreich gelöscht!', id: Date.now() });
              } catch (err) {
                console.error("Fehler beim Löschen des Logs:", err);
                setToast({ message: 'Fehler beim Löschen der Einheit!', id: Date.now() });
              }
            }}
            onUpdatePlayerDiagnostics={async (playerId, diagnostics) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  const updatedDiagnostics = {
                    ...(player.diagnostics || {}),
                    ...diagnostics
                  };
                  await saveSpieler({
                    ...player,
                    diagnostics: updatedDiagnostics
                  });
                }
              } catch (err) {
                console.error("Fehler beim Aktualisieren der Diagnostics:", err);
              }
            }}
            onUpdatePlayerStats={async (playerId, minutes, goals, assists) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  const currentMinutes = player.einsatzzeitenGesamt || 0;
                  await saveSpieler({
                    ...player,
                    einsatzzeitenGesamt: currentMinutes + minutes
                  });
                }
              } catch (err) {
                console.error("Fehler beim Aktualisieren der Spieler-Statistiken:", err);
              }
            }}
            onUpdatePlayerDatenblatt={async (playerId, report) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  await saveSpieler({
                    ...player,
                    datenblattReport: report
                  });
                  setToast({ message: 'Datenblatt erfolgreich gespeichert!', id: Date.now() });
                }
              } catch (err) {
                console.error("Fehler beim Aktualisieren des Datenblatts:", err);
                setToast({ message: 'Fehler beim Speichern des Datenblatts!', id: Date.now() });
              }
            }}
            onUpdatePlayerTracker={async (playerId, trackerData) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  const existingHistory = (player.trackerHistory || []) as any[];
                  
                  // Check if trackerData is a DecodedTrackerData object or standard summary
                  const newHistoryItem = trackerData.gesamtDistanzMeter !== undefined ? {
                    id: trackerData.id || `tracker_${Date.now()}`,
                    spielerId: trackerData.spielerId || playerId,
                    name: trackerData.name || `${player.firstName} ${player.lastName}`.trim(),
                    datum: trackerData.datum || new Date().toISOString().split('T')[0],
                    uhrzeit: trackerData.uhrzeit || '18:30',
                    trainingId: trackerData.trainingId || `TR-${Date.now()}`,
                    trackerQuelle: trackerData.trackerQuelle || 'GPS-Tracker XY',
                    gesamtDistanzMeter: trackerData.gesamtDistanzMeter || 0,
                    gesamtDauerSekunden: trackerData.gesamtDauerSekunden || 0,
                    durchschnittsGeschwindigkeitKmh: trackerData.durchschnittsGeschwindigkeitKmh || 0,
                    maxGeschwindigkeitKmh: trackerData.maxGeschwindigkeitKmh || 0,
                    durchschnittsHerzfrequenz: trackerData.durchschnittsHerzfrequenz || 0,
                    maxHerzfrequenz: trackerData.maxHerzfrequenz || 0,
                    belastungsZonen: trackerData.belastungsZonen || { zone1LockerMin: 0, zone2NormalMin: 0, zone3IntensivMin: 0, zone4SehrIntensivMin: 0 },
                    sprints: trackerData.sprints || [],
                    gpsPunkte: trackerData.gpsPunkte || [],
                    fileName: trackerData.fileName || 'Tracker_Data.bin',
                    uploadedAt: trackerData.uploadedAt || new Date().toISOString()
                  } : {
                    id: `tracker_${Date.now()}`,
                    spielerId: playerId,
                    name: `${player.firstName} ${player.lastName}`.trim(),
                    datum: trackerData.uploadDate || new Date().toISOString().split('T')[0],
                    uhrzeit: '18:30',
                    trainingId: `TR-${Date.now()}`,
                    trackerQuelle: 'GPS-Tracker XY',
                    gesamtDistanzMeter: Math.round((trackerData.totalDistanceKm || 0) * 1000),
                    gesamtDauerSekunden: 5400,
                    durchschnittsGeschwindigkeitKmh: 12.5,
                    maxGeschwindigkeitKmh: trackerData.maxSpeedKmh || 28.5,
                    durchschnittsHerzfrequenz: 155,
                    maxHerzfrequenz: 188,
                    belastungsZonen: { zone1LockerMin: 20, zone2NormalMin: 30, zone3IntensivMin: 25, zone4SehrIntensivMin: 15 },
                    sprints: [],
                    gpsPunkte: [],
                    fileName: trackerData.fileName || 'Tracker_Data.bin',
                    uploadedAt: new Date().toISOString(),
                    fileUrl: trackerData.fileUrl || '',
                    matchName: trackerData.matchName || 'Spielanalyse',
                    tacticalSummary: trackerData.tacticalSummary || ''
                  };

                  await saveSpieler({
                    ...player,
                    trackerAnalysis: trackerData,
                    trackerHistory: [newHistoryItem, ...existingHistory]
                  });
                  setToast({ message: 'GPS / Tracker-Analyse erfolgreich im Spielerordner gespeichert!', id: Date.now() });
                }
              } catch (err) {
                console.error("Fehler beim Speichern der Tracker-Analyse:", err);
                setToast({ message: 'Fehler beim Speichern der Tracker-Analyse!', id: Date.now() });
              }
            }}
            onDeletePlayerTracker={async (playerId, trackerId) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  const existingHistory = (player.trackerHistory || []) as any[];
                  const updatedHistory = existingHistory.filter((item: any) => item.id !== trackerId && item._id !== trackerId);
                  
                  let updatedTrackerAnalysis = player.trackerAnalysis;
                  if (
                    trackerId === 'active' || 
                    (player.trackerAnalysis as any)?.id === trackerId || 
                    (player.trackerAnalysis as any)?._id === trackerId ||
                    (player.trackerAnalysis as any)?.fileName === trackerId ||
                    updatedHistory.length === 0
                  ) {
                    updatedTrackerAnalysis = updatedHistory.length > 0 ? updatedHistory[0] : null;
                  }

                  await saveSpieler({
                    ...player,
                    trackerHistory: updatedHistory,
                    trackerAnalysis: updatedTrackerAnalysis
                  });

                  if (trackerAcademyReports && trackerAcademyReports.length > 0 && typeof deleteTrackerAcademyReport === 'function') {
                    const matchingRep = trackerAcademyReports.find((r: any) => r.id === trackerId || (r.playerId === playerId && (r.id === trackerId || r.rawFileName === trackerId)));
                    if (matchingRep) {
                      await deleteTrackerAcademyReport(matchingRep.id);
                    }
                  }

                  setToast({ message: 'Tracker-Einheit / Session erfolgreich gelöscht!', id: Date.now() });
                }
              } catch (err) {
                console.error("Fehler beim Löschen des Tracker-Eintrags:", err);
                setToast({ message: 'Fehler beim Löschen des Tracker-Eintrags!', id: Date.now() });
              }
            }}
            onUpdatePlayerMovementPoints={async (playerId, points) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  await saveSpieler({
                    ...player,
                    movementPoints: points
                  });
                  setToast({ message: 'Bewegungsprofil erfolgreich aktualisiert!', id: Date.now() });
                }
              } catch (err) {
                console.error("Fehler beim Speichern des Bewegungsprofils:", err);
                setToast({ message: 'Fehler beim Speichern des Bewegungsprofils!', id: Date.now() });
              }
            }}
            onUpdatePlayerVideos={async (playerId, videoClips) => {
              try {
                const player = players.find(p => p.id === playerId);
                if (player) {
                  await saveSpieler({
                    ...player,
                    videoHighlights: videoClips
                  });
                  setToast({ message: 'Video-Highlights erfolgreich aktualisiert!', id: Date.now() });
                }
              } catch (err) {
                console.error("Fehler beim Speichern der Video-Highlights:", err);
                setToast({ message: 'Fehler beim Speichern der Video-Highlights!', id: Date.now() });
              }
            }}
            competitiveMatches={competitiveMatches}
            competitiveMinutes={competitiveMinutes}
            testMatches={testMatches}
            testMinutes={testMinutes}
            trackerAcademyReports={trackerAcademyReports || []}
            saveTrackerAcademyReport={saveTrackerAcademyReport}
            deleteTrackerAcademyReport={deleteTrackerAcademyReport}
            onUpdatePlayer={async (id, field, value) => {
              const p = players.find(x => x.id === id);
              if (p) {
                await saveSpieler({ ...p, [field]: value });
              }
            }}
          />
        );
      case 'access_control':
        return (
          <AccessControlView 
            ownerEmail={ownerEmail}
            securityLockActive={securityLockActive}
            onToggleSecurityLock={setSecurityLockActive}
          />
        );
      case 'video_analysis':
        return <VideoAnalysisView players={sortedPlayers.filter(isPlayer)} clubName={activeClub.name} clubShortName={activeClub.shortName} />;
      case 'academy_analysis':
        return (
          <AcademyAnalysisView 
            players={sortedPlayers}
            sessionEvaluations={academyEvaluations || []}
            weeklyReports={academyWeeklyReports || []}
            attendance={attendance || []}
            saveSessionEvaluation={saveAcademyEvaluation}
            deleteSessionEvaluation={deleteAcademyEvaluation}
            saveWeeklyReport={saveAcademyWeeklyReport}
            deleteWeeklyReport={deleteAcademyWeeklyReport}
          />
        );
      case 'champions_cup':
        return (
          <ChampionsCupProView 
            players={sortedPlayers}
            isEditing={isEditing}
            setToast={setToast}
          />
        );
      case 'license_admin':
        return <LicenseAdminView />;
      case 'match_analysis_pro':
        return <MatchAnalysisProView matchAnalyses={matchAnalyses} competitiveMatches={competitiveMatches} players={sortedPlayers} />;
      case 'analytics_charts':
        return <AnalyticsChartsView player={sortedPlayers[0]} allPlayers={sortedPlayers} />;
      case 'player_report_pro':
        return <PlayerReportProView player={sortedPlayers[0]} players={sortedPlayers} />;
      case 'live_commentary':
        return <LiveMatchCommentary />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div className="w-20 h-20 border-4 border-dashed border-gray-300 rounded-full flex items-center justify-center">
              <Clock size={32} />
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-sm">Modul in Vorbereitung...</p>
          </div>
        );
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncError = (e: any) => {
      if (e.detail?.error === null) {
        setQuotaError(false);
        setLastError(null);
        setToast({ message: 'Datenbankverbindung wiederhergestellt. Daten erfolgreich synchronisiert!', id: Date.now() });
        return;
      }
      const errMessage = e.detail?.error || '';
      console.warn("Sync error caught in UI:", errMessage);
      if (errMessage.includes('Quota limit exceeded') || errMessage.toLowerCase().includes('quota')) {
        setQuotaError(true);
        setLastError('Datenbank-Limit erreicht (Tageskontingent überschritten). Offline-Modus aktiv – Änderungen werden lokal gespeichert.');
      } else {
        setLastError(errMessage || 'Synchronisierungsfehler');
      }
      setTimeout(() => setLastError(null), 10000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('fca_sync_error', handleSyncError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fca_sync_error', handleSyncError);
    };
  }, []);

  if (authLoading || !startReady) {
    return (
      <div className="h-screen w-screen flex-col flex items-center justify-center bg-black text-white p-8">
        <div className="w-16 h-16 border-4 border-white border-t-[#C00000] rounded-full animate-spin mb-8" />
        <h1 className="font-black uppercase tracking-[0.2em] text-2xl">FC AUGGEN</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-4">
          Daten werden synchronisiert...
        </p>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('page') === 'landing') {
    return <LandingPage />;
  }

  return (
      <div className="flex h-screen bg-[#0A0E17] text-[#F5F5F5] font-sans overflow-hidden selection:bg-[#10B981] selection:text-[#0A0E17] print:h-auto print:overflow-visible print:bg-white">
        {showLicenseModal && !isDemo && (
          <LicenseModal onValidate={validateLicense} error={licenseError} tier={tier} daysRemaining={daysRemaining} />
        )}
        {quotaError && (
          <div className="fixed top-0 left-0 w-full bg-[#121824] border-b border-[#2A2A2A] text-[#F5F5F5] px-4 py-3 text-xs font-bold flex flex-wrap items-center justify-between gap-3 z-50 print:hidden shrink-0 backdrop-blur-md">
            <div className="flex items-start gap-2 max-w-3xl">
              <span className="text-base mt-0.5">⚠️</span>
              <div>
                <p className="font-black uppercase tracking-wider text-[10px] text-[#FFD54F] mb-0.5">Firestore Quota erreicht (Tageslimit überschritten)</p>
                <p className="font-medium text-[#F5F5F5] leading-relaxed">
                  Das kostenlose Tageslimit an Datenbank-Lesevorgängen/Schreibvorgängen ist aufgebraucht. 
                  <strong className="font-bold text-[#F5F5F5]"> Die App läuft vollkommen offline weiter!</strong> Deine Änderungen (wie z.B. Einheiten, Aufstellungen) werden sicher lokal in deinem Browser gespeichert.
                </p>
                <p className="font-medium text-[#C7C7C7] mt-1 flex items-center gap-1.5 bg-[#1E293B] px-2 py-0.5 rounded-lg border border-[#2A2A2A] w-fit text-[11px]">
                  <span>🕒</span>
                  <span><strong>Wie lange dauert das?</strong> Das Limit wird von Google jeden Tag automatisch um <strong>09:00 Uhr deutscher Zeit</strong> (Mitternacht US-Pazifikzeit) zurückgesetzt. Danach synchronisiert sich alles wieder von selbst!</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="https://console.firebase.google.com/project/gen-lang-client-0951111843/firestore/databases/ai-studio-20b6fe19-5950-4d1f-9c88-e7f55ed9a819/data?openUpgradeDialog=true"
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#FFD54F] text-[#0F0F0F] px-3 py-1.5 text-[10px] uppercase font-black tracking-wider hover:bg-[#FFE082] transition-colors rounded-xl shadow-[0_0_12px_rgba(255,213,79,0.4)]"
              >
                In Firebase Console upgraden
              </a>
              <button 
                onClick={() => setQuotaError(false)}
                className="bg-[#1E293B] text-[#F5F5F5] hover:bg-[#2A2A2A] rounded-lg p-1 font-black leading-none text-xs transition-colors border border-[#2A2A2A]"
                title="Schließen"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MOBILE/Tablet Drawer Backdrop (<768px) */}
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden print:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* LEFT VERTICAL SIDEBAR: mobile => drawer, tablet => slim, desktop => full */}
        <aside className={`sidebar-glass flex flex-col shrink-0 print:hidden shadow-2xl
          fixed md:static top-0 left-0 bottom-0 z-50 md:z-40
          w-64 md:w-60 xl:w-64
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          max-md:overflow-y-auto max-md:pb-6`}
          style={{ boxShadow: '4px 0 30px rgba(0,212,255,0.05)' }}
        >
          {/* Header Branding in Sidebar */}
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-lg border logo-glow"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF, #00FFAA)',
                    color: '#060912',
                    borderColor: 'rgba(0,212,255,0.4)',
                  }}
                >
                  {activeClub.shortName || 'FCA'}
                </div>
                <div>
                  <h1 className="text-xs font-black tracking-wider" style={{ color: '#F0F6FF' }}>
                    {activeClub.name} {!activeClub.name.includes('e.V.') && <span className="text-gradient-cyan">e.V.</span>}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="badge-cyan">Manager 26/27</span>
                    {activeClub.league && (
                      <span className="text-[10px]" style={{ color: '#7E9BB5' }}>{activeClub.league}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ClubSwitcher
                onClubCreated={(clubId, clubName, fbUrl) => {
                  setNaomiPreset({ clubId, clubName, fussballUrl: fbUrl, autoStart: true });
                  setShowNaomiModal(true);
                }}
              />
              {!isDemo && (
                <button
                  onClick={() => setShowNaomiModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
                  style={{
                    background: 'rgba(0,255,170,0.08)',
                    border: '1px solid rgba(0,255,170,0.25)',
                    color: '#00FFAA',
                  }}
                  title="Naomi Agent - Daten automatisch laden"
                >
                  <span className="text-sm">🤖</span>
                  <span className="text-[10px] font-bold uppercase">Naomi</span>
                </button>
              )}
            </div>
          </div>


          {/* Build-Stand anzeigen (Hilfe: Cache leeren & neu laden) */}
          <div className="px-3.5 py-1.5 border-b flex items-center justify-between gap-2" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
            <span className="text-[9px] font-bold uppercase" style={{ color: '#7E9BB5' }}>⚡ Build-Version</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold" style={{ color: '#00D4FF' }}>
                {typeof __COCOACH_BUILD_DATE__ !== 'undefined' && __COCOACH_BUILD_DATE__ ? new Date(__COCOACH_BUILD_DATE__).toLocaleString('de-DE') : 'dev'}
              </span>
              <button
                onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
                title="Cache leeren & neu laden"
              >⟳ Refresh</button>
            </div>
          </div>

          {/* Active Trainer Profile Indicator & Fast Switcher */}
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
            style={{ background: 'rgba(0,212,255,0.04)', borderColor: 'rgba(0,212,255,0.08)' }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-base shrink-0">{isOwner ? '👑' : '⚽'}</span>
              <div className="truncate">
                <p className="text-[11px] font-bold truncate" style={{ color: '#F0F6FF' }}>{localName.split('(')[0].trim()}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: '#00FFAA', boxShadow: '0 0 6px rgba(0,255,170,0.8)' }} />
                  <p className="text-[9px] font-medium truncate" style={{ color: '#7E9BB5' }}>
                    {isOwner ? 'Owner (Voller KI-Zugriff)' : 'Trainer (Bearbeitung)'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowLocalProfileModal(true)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00D4FF',
              }}
              title="Trainer-Profil wechseln"
            >
              Wechseln
            </button>
          </div>


          {/* ── LIVE-STATUS BAR ───────────────────────────────────── */}
          {(() => {
            const totalPlayers = players.filter(p => isPlayer(p)).length;
            const injuredPlayers = players.filter(p => isPlayer(p) && (p.isInjured || p.status === 'k' || p.status === 'B')).length;
            const injuredNames = players.filter(p => isPlayer(p) && (p.isInjured || p.status === 'k' || p.status === 'B')).map(p => `${p.lastName}`).slice(0, 3);
            const now = new Date();
            const upcomingMatch = competitiveMatches
              .filter(m => m.date && new Date(m.date) >= now)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            const daysUntilMatch = upcomingMatch ? Math.ceil((new Date(upcomingMatch.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div className="mx-3 mb-2 p-2.5 rounded-xl" style={{
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.1)',
              }}>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="text-center">
                    <div className="text-[15px] font-black leading-none text-gradient-cyan">{totalPlayers}</div>
                    <div className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#7E9BB5' }}>Kader</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[15px] font-black leading-none" style={{ color: injuredPlayers > 0 ? '#FF3366' : '#00FFAA' }}>{injuredPlayers}</div>
                    <div className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#7E9BB5' }}>Verletzt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[15px] font-black leading-none" style={{ color: daysUntilMatch !== null && daysUntilMatch <= 3 ? '#FF5E3A' : '#00D4FF' }}>
                      {daysUntilMatch !== null ? `${daysUntilMatch}d` : '—'}
                    </div>
                    <div className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#7E9BB5' }}>Spiel</div>
                  </div>
                </div>
                {injuredPlayers > 0 && (
                  <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,51,102,0.15)' }}>
                    <div className="text-[7px] font-bold truncate" style={{ color: 'rgba(255,51,102,0.8)' }}>
                      ⚠ {injuredNames.join(', ')}{injuredPlayers > 3 ? ` +${injuredPlayers - 3}` : ''}
                    </div>
                  </div>
                )}
                {upcomingMatch && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
                    <div className="text-[7px] font-bold truncate" style={{ color: 'rgba(0,212,255,0.7)' }}>
                      ⚽ {upcomingMatch.opponent || 'TBD'} — {new Date(upcomingMatch.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}


          {/* Navigation Categories List */}
          <div className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {[
              { id: 'ubersicht', label: 'Übersicht', icon: LayoutDashboard, defaultTab: 'dashboard' as TabId, tabIds: isOwner ? ['dashboard', 'developer_tasks'] : ['dashboard'] },
              { id: 'kader', label: 'Kader & Spieler', icon: User, defaultTab: 'personnel' as TabId, tabIds: ['personnel', 'team_list', 'player_portal', 'scouting'] },
              { id: 'training', label: 'Training & Performance', icon: Activity, defaultTab: 'academy_analysis' as TabId, tabIds: ['academy_analysis', 'attendance', 'training_planning', 'individual_control', 'runs_sw', 'summer_prep', 'winter_prep'] },
              { id: 'match', label: 'Match & Taktik', icon: Trophy, defaultTab: 'tacticboard' as TabId, tabIds: ['champions_cup', 'competitive_planning', 'test_planning', 'u23_planning', 'match_report', 'tacticboard', 'trainer_view', 'video_analysis', 'match_analysis_pro'] },
              { id: 'orga', label: 'Organisation', icon: FolderKanban, defaultTab: 'yearly' as TabId, tabIds: isOwner ? ['yearly', 'budget_finance', 'meetings_calendar', 'physio_plan', 'access_control'] : ['yearly', 'budget_finance', 'meetings_calendar', 'physio_plan'] },
              { id: 'all', label: isOwner ? 'Alle (28)' : 'Alle (26)', icon: Layers, defaultTab: 'dashboard' as TabId, tabIds: [] },
            ].map(cat => {
              const isCatActive = navCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setNavCategory(cat.id as any);
                    if (cat.id !== 'all' && !cat.tabIds.includes(activeTab)) {
                      handleTabClick(cat.defaultTab);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer text-left"
                  style={isCatActive ? {
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00D4FF',
                    boxShadow: '0 0 15px rgba(0,212,255,0.12), inset 0 0 15px rgba(0,212,255,0.04)',
                    fontWeight: 700,
                  } : {
                    border: '1px solid transparent',
                    color: '#7E9BB5',
                  }}
                  onMouseEnter={e => { if (!isCatActive) { (e.currentTarget as HTMLButtonElement).style.color = '#F0F6FF'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; } }}
                  onMouseLeave={e => { if (!isCatActive) { (e.currentTarget as HTMLButtonElement).style.color = '#7E9BB5'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
                >
                  <Icon size={16} style={{ color: isCatActive ? '#00D4FF' : '#4A6080' }} />
                  <span>{cat.label}</span>
                  {isCatActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#00D4FF', boxShadow: '0 0 6px rgba(0,212,255,0.8)' }} />}
                </button>
              );
            })}
          </div>


          {/* Theme Mode & Fullscreen & Cloud Drive Toggle Footer */}
          <div className="p-3 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
            {isOwner && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowGoogleCalendarModal(true)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#FCD34D' }}
                    title="Google Kalender Synchronisation"
                  >
                    <CalendarIcon size={12} className="shrink-0" />
                    <span>Kalender</span>
                  </button>
                  <button
                    onClick={() => setShowGoogleDriveModal(true)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF' }}
                    title="Google Drive Cloud Speicherung & Backups"
                  >
                    <HardDrive size={12} className="shrink-0" />
                    <span>Drive</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowGoogleSheetsModal(true)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    style={{ background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.2)', color: '#00FFAA' }}
                    title="Google Sheets Tabellen Export"
                  >
                    <FileSpreadsheet size={12} className="shrink-0" />
                    <span>Sheets</span>
                  </button>
                  <button
                    onClick={() => setShowGoogleGmailModal(true)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.2)', color: '#FF6B8A' }}
                    title="Gmail Kommunikation Center"
                  >
                    <Mail size={12} className="shrink-0" />
                    <span>Gmail</span>
                  </button>
                </div>
                <button
                  onClick={handleDownloadLocalBackup}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#7E9BB5' }}
                  title="Gesamten Datensatz / Backup als .json herunterladen"
                >
                  <Download size={13} style={{ color: '#FCD34D' }} />
                  <span>System-Backup herunterladen</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
                className="flex-1 px-2.5 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#7E9BB5' }}
                title={themeMode === 'dark' ? 'Zu Light Mode wechseln' : 'Zu Dark Mode wechseln'}
              >
                {themeMode === 'dark' ? <Sun size={14} style={{ color: '#FCD34D' }} /> : <Moon size={14} style={{ color: '#00D4FF' }} />}
                <span>{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={toggleBrowserFullscreen}
                className="px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={isFullscreen ? {
                  background: 'linear-gradient(135deg, #00D4FF, #00FFAA)',
                  border: '1px solid transparent',
                  color: '#060912',
                  fontWeight: 700,
                  boxShadow: '0 0 12px rgba(0,212,255,0.4)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#7E9BB5',
                }}
                title="Browser Vollbild Modus (F11)"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>Vollbild</span>
              </button>
            </div>
          </div>
        </aside>


        {/* RIGHT MAIN CONTAINER */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0E17]">
          {/* TAB-NAVI BAR (OPEN TEXT TABS WITH DECENT ORANGE UNDERLINE) */}
          <nav className="bg-[#121824]/90 border-b border-[#334155]/80 px-3 sm:px-4 py-2.5 flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar shrink-0 z-30">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-[#F5F5F5] hover:bg-[#1E293B] border border-[#334155]/60 shrink-0 cursor-pointer transition-colors"
              aria-label="Menü öffnen oder schließen"
              title="Menü"
            >
              <Menu size={18} />
            </button>
            {TABS.filter(tab => {
              if (tab.id === 'access_control' && !isOwner) return false;
              if (tab.id === 'developer_tasks' && !isOwner) return false;
              if (tab.id === 'license_admin' && !isOwner) return false;
              const requiredFeature = TAB_FEATURE_MAP[tab.id];
              if (requiredFeature && !hasFeature(requiredFeature)) return false;
              if (navCategory === 'all') return true;
              if (navCategory === 'ubersicht') return ['dashboard', 'developer_tasks'].includes(tab.id);
              if (navCategory === 'kader') return ['personnel', 'team_list', 'player_portal', 'scouting'].includes(tab.id);
              if (navCategory === 'training') return ['academy_analysis', 'attendance', 'training_planning', 'individual_control', 'runs_sw', 'summer_prep', 'winter_prep'].includes(tab.id);
              if (navCategory === 'match') return ['champions_cup', 'competitive_planning', 'test_planning', 'u23_planning', 'match_report', 'tacticboard', 'trainer_view', 'video_analysis', 'match_analysis_pro'].includes(tab.id);
              if (navCategory === 'orga') return ['yearly', 'budget_finance', 'meetings_calendar', 'physio_plan', 'access_control'].includes(tab.id);
              return true;
            }).map(tab => {
              const isAcademy = tab.id === 'academy_analysis';
              const isCup = tab.id === 'champions_cup';
              const isVideo = tab.id === 'video_analysis';
              const isActive = activeTab === tab.id;

              // Custom label formatting
              let displayLabel = tab.label;
              if (tab.id === 'champions_cup') displayLabel = 'Champions Cup Pro';
              if (tab.id === 'competitive_planning') displayLabel = 'Pflichtspiele';
              if (tab.id === 'test_planning') displayLabel = 'Testspiele';
              if (tab.id === 'u23_planning') displayLabel = 'Spiele U23';
              if (tab.id === 'match_report') displayLabel = 'Spielbericht';
              if (tab.id === 'tacticboard') displayLabel = 'Taktiktafel';
              if (tab.id === 'trainer_view') displayLabel = 'Kaderübersicht & Grundordnung';
              if (tab.id === 'video_analysis') displayLabel = 'Videoanalyse (Beta)';
              if (tab.id === 'match_analysis_pro') displayLabel = 'Spielanalyse & xG';

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="py-1.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer relative"
                  style={isActive ? {
                    color: '#00D4FF',
                    fontWeight: 700,
                    borderBottom: '2px solid #00D4FF',
                    marginBottom: '-0.5rem',
                    paddingBottom: '0.5rem',
                    textShadow: '0 0 12px rgba(0,212,255,0.6)',
                  } : {
                    color: '#7E9BB5',
                  }}
                >
                  <span>{displayLabel}</span>
                  {isCup && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                      style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)' }}>
                      Pro
                    </span>
                  )}
                  {isVideo && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                      style={{ background: 'rgba(255,94,58,0.12)', color: '#FF5E3A', border: '1px solid rgba(255,94,58,0.3)' }}>
                      Beta
                    </span>
                  )}
                  {isAcademy && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.8)' }} />}
                </button>
              );
            })}
          </nav>

          {/* Main Content View Canvas */}
          <main className="flex-1 p-3 sm:p-5 overflow-hidden text-[#F0F6FF] print:p-0 print:bg-white print:overflow-visible" style={{ background: 'transparent' }}>

            <UniformMask 
              title={TABS.find(t => t.id === activeTab)?.label || ''}
              onOpenKaderAgent={(activeTab === 'trainer_view' || activeTab === 'tacticboard') ? ((preset) => {
                setKaderAgentPreset(preset || 'beste_formation');
                setShowKaderAgentModal(true);
              }) : undefined}
          onOpen3DTacticBoard={(activeTab === 'trainer_view' || activeTab === 'tacticboard') ? (() => setShow3DProfiBoardModal(true)) : undefined}
          onShareText={handleShareText}
          onEmail={handleEmail}
          onEdit={handleEdit}
          isEditing={isEditing}
          onSave={handleManualSave}
          onReset={handleReset}
          onManageSquad={() => handleTabClick('personnel')}
          onAddPlayer={() => {
            if (activeTab === 'scouting') setShowAddScoutingModal(true);
            else if (activeTab === 'attendance' || activeTab === 'yearly') setShowAddTrainingModal(true);
            else if (activeTab === 'budget_finance') setShowAddFinanzModal(true);
            else if (activeTab === 'meetings_calendar') setShowAddMeetingModal(true);
            else if (activeTab === 'physio_plan') setShowAddPhysioModal(true);
            else if (activeTab === 'summer_prep') {
              const lastTE = vorbereitungSommer.length > 0 ? Math.max(...vorbereitungSommer.map((d: any) => typeof d.te === 'number' ? d.te : 0)) : 0;
              handleSaveVorbereitungSommer({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                kw: 1,
                te: lastTE + 1,
                date: '2026-07-06',
                day: 'Mo',
                time: '19:00',
                type: 'Training',
                content: 'NEUE EINHEIT',
                location: 'Auggen',
                intensity: 'Mittel'
              });
              setToast({ message: 'Einheit zur Sommervorbereitung hinzugefügt.', id: Date.now() });
            }
            else if (activeTab === 'winter_prep') {
              const lastTE = vorbereitungWinter.length > 0 ? Math.max(...vorbereitungWinter.map((d: any) => typeof d.te === 'number' ? d.te : 0)) : 0;
              saveVorbereitungWinter({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                kw: 1,
                te: lastTE + 1,
                date: '2027-01-16',
                day: 'Sa',
                time: '10:30',
                type: 'Training',
                content: 'NEUE EINHEIT',
                location: 'Auggen',
                intensity: 'Mittel'
              });
              setToast({ message: 'Einheit zur Wintervorbereitung hinzugefügt.', id: Date.now() });
            }
            else {
              setEditingPlayer(null);
              setShowAddPlayerModal(true);
            }
          }}
          onRemovePlayer={() => {
            if (activeTab === 'scouting') setShowRemoveScoutingModal(true);
            else if (activeTab === 'summer_prep' || activeTab === 'winter_prep') {
              setToast({ message: 'Nutzen Sie das Löschen-Symbol (Mülleimer) in der Tabelle im Bearbeiten-Modus.', id: Date.now() });
            }
            else setShowRemovePlayerModal(true);
          }}
          onMigrate={handleMigrateCloudData}
          saveStatus={saveStatus}
        >
          {renderContent()}
        </UniformMask>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white text-[9px] px-3 sm:px-6 py-2 flex flex-wrap justify-center sm:justify-between items-center gap-x-4 gap-y-1 uppercase tracking-widest font-bold border-t-2 border-black print:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[#C00000] font-black">FC AUGGEN 1921 e.V.</span>
          <span className="opacity-30">|</span>
          <span className="opacity-60">Team Management System 2026/2027</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {lastError && (
            <span className="text-red-500 text-[10px] font-black animate-pulse px-2.5 py-1 border border-red-500 bg-red-950/50 rounded mr-2 uppercase">
              ⚠️ {lastError}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-75">
            <span>Status: <span className={isOnline ? "text-green-500" : "text-red-500"}>{isOnline ? 'Online' : 'Offline'}</span></span>
            <span className="opacity-30">|</span>
            {authUser ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  User: <span className="text-amber-400 font-extrabold">{authUser.displayName || authUser.email}</span>
                  {isOwner && (
                    <span className="ml-2 bg-amber-500 text-black px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider shadow-sm border border-black animate-pulse">
                      OWNER
                    </span>
                  )}
                </span>
                <button 
                  onClick={handleLogout}
                  className="bg-[#C00000] text-white px-2 py-0.5 text-[8px] font-black uppercase border border-black hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  User: <span className="text-amber-400 font-extrabold hover:underline cursor-pointer" onClick={() => setShowLocalProfileModal(true)}>{localName}</span>
                  {isOwner && (
                    <span className="ml-2 bg-amber-500 text-black px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider shadow-sm border border-black animate-pulse">
                      OWNER
                    </span>
                  )}
                </span>
                <button 
                  onClick={() => setShowLocalProfileModal(true)}
                  className="bg-gray-800 text-white px-2 py-0.5 text-[8px] font-black uppercase border border-white hover:bg-gray-700 transition"
                >
                  Name/Rolle ändern
                </button>
                {isOnline && (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="bg-green-600 text-white px-2 py-0.5 text-[8px] font-black uppercase border border-black hover:bg-green-500 transition flex items-center gap-1"
                  >
                    <User size={10} /> Anmelden
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>

      {/* Local Profile Configuration Modal */}
      {showLocalProfileModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-md my-auto text-[#F8FAFC]">
            <div className="bg-[#0F172A] text-[#F8FAFC] p-4 border-b border-[#334155] rounded-t-xl flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                👤 Benutzerprofil bearbeiten
              </h3>
              <button onClick={() => setShowLocalProfileModal(false)} className="hover:rotate-90 transition-transform font-black">✕</button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = (formData.get('profile_name') as string || '').trim();
              const email = (formData.get('profile_email') as string || '').trim();
              
              setLocalName(name || 'Gast');
              setLocalEmail(email);
              setShowLocalProfileModal(false);
              setToast({ message: 'Profil erfolgreich gespeichert!', id: Date.now() });
            }}>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 text-[#F8FAFC]">Anzeigename</label>
                <input 
                  type="text" 
                  name="profile_name"
                  defaultValue={localName}
                  className="w-full border border-[#334155] p-2.5 rounded-lg font-bold text-sm bg-[#121824] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  placeholder="Z.B. Samer Khaleel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 text-[#F8FAFC]">E-Mail-Adresse (Optional)</label>
                <input 
                  type="email" 
                  name="profile_email"
                  defaultValue={localEmail}
                  className="w-full border border-[#334155] p-2.5 rounded-lg font-bold text-sm bg-[#121824] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  placeholder="Z.B. name@example.com"
                />
                <p className="text-[9px] text-[#94A3B8] font-bold mt-1 uppercase tracking-wide">
                  TIPP: Trage '{ownerEmail}' ein, um direkt als OWNER freigeschaltet zu werden!
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLocalName('Samer (Owner)');
                    setLocalEmail(ownerEmail);
                    setShowLocalProfileModal(false);
                    setToast({ message: 'Als Owner angemeldet!', id: Date.now() });
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] font-black uppercase hover:bg-[#F59E0B]/20 transition"
                >
                  ⚡ Als Owner freischalten
                </button>
              </div>

              <div className="pt-4 border-t border-[#334155] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocalProfileModal(false)}
                  className="py-2 px-4 border border-[#334155] rounded-lg bg-[#121824] text-[#F8FAFC] text-xs font-black uppercase hover:bg-[#334155] transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-[#10B981] text-[#0A0E17] text-xs font-black uppercase hover:bg-[#059669] transition shadow-md"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-md my-auto text-[#F8FAFC]">
            <div className="bg-[#E11D48] text-white p-4 border-b border-[#334155] rounded-t-xl flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                ⚽ FC AUGGEN - ANMELDUNG
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="hover:rotate-90 transition-transform font-black">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Email / Password Form */}
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = (formData.get('login_email') as string || '').trim();
                const pass = (formData.get('login_password') as string || '').trim();
                handleEmailPasswordLogin(email, pass);
              }} className="space-y-4">
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/40 p-3 text-[#F59E0B] text-xs font-bold uppercase tracking-wider rounded-lg">
                  💡 Hinweis für Kollegen:<br/>
                  Nutzt eure E-Mail & das Passwort <span className="bg-[#F59E0B] text-[#0A0E17] px-1.5 py-0.5 rounded font-black">0000</span>, um euch direkt anzumelden und gemeinsam live zu arbeiten!
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1 text-[#F8FAFC]">E-Mail-Adresse</label>
                  <input 
                    type="email" 
                    name="login_email"
                    id="modal_login_email"
                    required
                    className="w-full border border-[#334155] p-2.5 rounded-lg font-bold text-sm bg-[#121824] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1 text-[#F8FAFC]">Passwort</label>
                  <input 
                    type="password" 
                    name="login_password"
                    required
                    className="w-full border border-[#334155] p-2.5 rounded-lg font-bold text-sm bg-[#121824] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    placeholder="****"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#10B981] text-[#0A0E17] text-xs font-black uppercase hover:bg-[#059669] rounded-lg transition shadow-md disabled:opacity-50"
                >
                  {authLoading ? 'Verbinde...' : '🔑 Als Kollege Anmelden'}
                </button>
              </form>

              {/* Quick Login Profiles */}
              <div className="border-t border-[#334155] pt-4">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-2">Schnellauswahl für Trainer & Entwickler (Vollzugriff)</span>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { email: 'samerkhaleel720@gmail.com', label: '👑 Samer Khaleel (Owner & Entwickler)' }
                  ].map((profile) => (
                    <button
                      key={profile.email}
                      type="button"
                      onClick={() => {
                        const emailInput = document.getElementById('modal_login_email') as HTMLInputElement;
                        if (emailInput) {
                          emailInput.value = profile.email;
                          setToast({ message: `E-Mail ${profile.email} ausgewählt. Bitte Passwort 0000 eingeben!`, id: Date.now() });
                        }
                      }}
                      className="text-left py-2 px-3 border border-[#334155] rounded-lg bg-[#121824] hover:bg-[#334155] font-bold text-xs uppercase tracking-wide transition flex items-center justify-between text-[#F8FAFC]"
                    >
                      <span>👤 {profile.label}</span>
                      <span className="text-[9px] text-[#94A3B8] font-mono">Wählen</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Sign-In Option */}
              <div className="border-t border-[#334155] pt-4">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-2 text-center">Oder über Drittanbieter</span>
                <button
                  type="button"
                  onClick={() => {
                    handleLogin();
                    setShowLoginModal(false);
                  }}
                  className="w-full py-2.5 px-4 border border-[#334155] rounded-lg bg-[#121824] text-[#F8FAFC] text-xs font-black uppercase hover:bg-[#334155] transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.93 1 12 1 7.35 1 3.39 3.68 1.48 7.62l3.78 2.93c.92-2.76 3.51-4.51 6.74-4.51z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z"/>
                    <path fill="#FBBC05" d="M5.26 14.12c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.48 6.57C.53 8.44 0 10.53 0 12.75s.53 4.31 1.48 6.18l3.78-2.93z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-3.23 0-5.82-1.75-6.74-4.51L1.48 16.8C3.39 20.32 7.35 23 12 23z"/>
                  </svg>
                  Mit Google Anmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Naomi Agent Modal */}
      <NaomiAgentModal
        isOpen={showNaomiModal}
        onClose={() => { setShowNaomiModal(false); setNaomiPreset(null); }}
        presetClubId={naomiPreset?.clubId}
        presetClubName={naomiPreset?.clubName}
        presetFussballUrl={naomiPreset?.fussballUrl}
        presetWebsite={naomiPreset?.website}
        autoStart={naomiPreset?.autoStart}
        onDataReady={async (result: NaomiResult) => {
          if (result.players?.length) {
            for (const p of result.players) {
              await saveSpieler(p as Spieler);
            }
          }
          if (result.matches?.length) {
            for (const m of result.matches) {
              await saveCompMatch(m);
            }
          }
          setToast({ message: `Naomi hat ${result.players.length} Spieler und ${result.matches.length} Spiele importiert!`, id: Date.now() });
          setShowNaomiModal(false);
          setNaomiPreset(null);
        }}
      />

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-2xl my-auto text-[#F8FAFC]">
            <div className="bg-[#0F172A] text-[#F8FAFC] p-4 border-b border-[#334155] rounded-t-xl flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                <UserPlus size={20} /> {editingPlayer ? 'Spieler bearbeiten' : 'Neuer Spieler'}
              </h3>
              <button onClick={() => {
                setShowAddPlayerModal(false);
                setEditingPlayer(null);
              }} className="hover:rotate-90 transition-transform"><CloseIcon size={20} /></button>
            </div>
            <form className="p-6 space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const birthDate = formData.get('geburtsdatum') as string;
              const num = parseInt(formData.get('number') as string) || 0;
              
              const firstName = formData.get('firstName') as string;
              const lastName = formData.get('lastName') as string;
              const name = `${firstName} ${lastName}`.trim();
              
              const p: Spieler = {
                id: editingPlayer?.id || Date.now().toString(),
                category: formData.get('category') as any,
                number: num,
                nummer: num,
                name: name,
                firstName: firstName,
                lastName: lastName,
                position: formData.get('position') as string,
                geburtsdatum: birthDate,
                wochentag: '', // Will be calculated in handleAddPlayer
                status: formData.get('status') as any || 'Aktiv',
                notizen: formData.get('notizen') as string,
                adresse: formData.get('adresse') as string,
                telefon: formData.get('telefon') as string,
                email: formData.get('email') as string,
                oberteil: formData.get('oberteil') as string,
                kurze_hose: formData.get('kurze_hose') as string,
                lange_hose: formData.get('lange_hose') as string,
                schuhe: formData.get('schuhe') as string,
                physical: {
                  height: parseInt(formData.get('height') as string) || 0,
                  weight: parseInt(formData.get('weight') as string) || 0,
                  bodyFat: parseFloat(formData.get('bodyFat') as string) || 0,
                  strongFoot: formData.get('strongFoot') as any,
                },
                finance: {
                  baseSalary: parseInt(formData.get('baseSalary') as string) || 0,
                  bonusPerMatch: parseInt(formData.get('bonusPerMatch') as string) || 0,
                  months: isNaN(parseInt(formData.get('months') as string)) ? 12 : parseInt(formData.get('months') as string),
                  transferFeeIn: parseInt(formData.get('transferFeeIn') as string) || 0,
                  transferFeeOut: parseInt(formData.get('transferFeeOut') as string) || 0,
                  ist: parseInt(formData.get('ist') as string) || 0,
                  sideAgreements: formData.get('sideAgreements') as string,
                },
                analysis: {
                  strengths: formData.get('strengths') as string,
                  weaknesses: formData.get('weaknesses') as string,
                  development: formData.get('development') as string,
                },
                injuryHistory: formData.get('injuryHistory') as string,
                professionalStatus: formData.get('professionalStatus') as string,
                education: formData.get('education') as string,
                employer: formData.get('employer') as string,
                diagnostics: {
                  sprintwert: formData.get('sprintwert') as string,
                  yoyotest: formData.get('yoyotest') as string,
                }
              };
              if (editingPlayer) {
                handleUpdatePlayer(p);
              } else {
                handleAddPlayer(p);
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basisdaten */}
                <div className="space-y-4">
                  <h4 className="font-black uppercase text-xs border-b-2 border-black pb-1">Basisdaten</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Kategorie</label>
                      <select 
                        name="category" 
                        value={modalCategory} 
                        onChange={(e) => setModalCategory(e.target.value as any)}
                        className="w-full border-2 border-black p-2 font-black focus:outline-none"
                      >
                        <option value="player">Spielerkader</option>
                        <option value="coach">Trainerteam</option>
                        <option value="staff">Teammanagement / Funktionär</option>
                        <option value="medical">Medizinische Abteilung (Physio / Arzt)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Nr</label>
                      <input name="number" type="number" defaultValue={editingPlayer?.nummer} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Vorname</label>
                      <input name="firstName" type="text" defaultValue={editingPlayer?.firstName} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Nachname</label>
                      <input name="lastName" type="text" defaultValue={editingPlayer?.lastName} required className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Position</label>
                      <div className="flex flex-col gap-1">
                        <input name="position" id="pos-input" type="text" defaultValue={editingPlayer?.position} required className="w-full border-2 border-black p-2 font-black focus:outline-none uppercase" />
                        <div className="flex flex-wrap gap-1">
                          {['TW', 'IV', 'RV', 'LV', 'MD', 'ZDM', 'ZMD', 'ZOM', 'LM', 'RM', 'HS', 'ST'].map(p => (
                            <button 
                              key={p} 
                              type="button" 
                              onClick={() => {
                                const input = document.getElementById('pos-input') as HTMLInputElement;
                                if (input) {
                                  input.value = p;
                                }
                              }}
                              className="text-[7px] font-black uppercase border border-black px-1.5 py-0.5 hover:bg-black hover:text-white transition-colors"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Status</label>
                      <select name="status" defaultValue={editingPlayer?.status || 'Aktiv'} className="w-full border-2 border-black p-2 font-black focus:outline-none">
                        <option value="Aktiv">Aktiv</option>
                        <option value="Inaktiv">Inaktiv</option>
                        <option value="Verletzt">Verletzt</option>
                        <option value="Abgang">Abgang</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Geburtsdatum</label>
                      <input name="geburtsdatum" type="text" defaultValue={editingPlayer?.geburtsdatum} placeholder="TT.MM.JJJJ" className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Beruflicher Status</label>
                      <select name="professionalStatus" defaultValue={editingPlayer?.professionalStatus || ''} className="w-full border-2 border-black p-2 font-black focus:outline-none">
                        <option value="">- Wählen -</option>
                        <option value="Student">Student</option>
                        <option value="Schüler">Schüler</option>
                        <option value="Ausbildung">Ausbildung</option>
                        <option value="Angestellter">Angestellter</option>
                        <option value="Selbstständig">Selbstständig</option>
                        <option value="Arbeitslos">Arbeitslos</option>
                        <option value="Arbeitssuchend">Arbeitssuchend</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Ausbildung</label>
                      <input name="education" type="text" defaultValue={editingPlayer?.education || ''} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Arbeitgeber</label>
                      <input name="employer" type="text" defaultValue={editingPlayer?.employer || ''} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-1">Verletzungshistorie</label>
                    <textarea name="injuryHistory" defaultValue={editingPlayer?.injuryHistory || ''} className="w-full border-2 border-black p-2 font-black focus:outline-none min-h-[60px]" placeholder="Bisherige Verletzungen..." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Telefon</label>
                      <input name="telefon" type="text" defaultValue={editingPlayer?.telefon} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Email</label>
                      <input name="email" type="email" defaultValue={editingPlayer?.email} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Adresse</label>
                      <input name="adresse" type="text" defaultValue={editingPlayer?.adresse} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Physische Daten & Ausrüstung */}
                {modalCategory === 'player' && (
                  <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs border-b-2 border-black pb-1">Physische Daten</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Größe (cm)</label>
                        <input name="height" type="number" defaultValue={editingPlayer?.physical?.height} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Gewicht (kg)</label>
                        <input name="weight" type="number" defaultValue={editingPlayer?.physical?.weight} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Körperfett (%)</label>
                        <input name="bodyFat" type="number" step="0.1" defaultValue={editingPlayer?.physical?.bodyFat} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Starker Fuß</label>
                        <select name="strongFoot" defaultValue={editingPlayer?.physical?.strongFoot || 'Rechts'} className="w-full border-2 border-black p-2 font-black focus:outline-none">
                          <option value="Rechts">Rechts</option>
                          <option value="Links">Links</option>
                          <option value="Beidfüßig">Beidfüßig</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Sprintwert</label>
                        <input name="sprintwert" type="text" defaultValue={editingPlayer?.diagnostics?.sprintwert} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Yoyo-Test</label>
                        <input name="yoyotest" type="text" defaultValue={editingPlayer?.diagnostics?.yoyotest} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                    </div>

                    <h4 className="font-black uppercase text-xs border-b-2 border-black pb-1 pt-2">Ausrüstung</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Oberteil</label>
                        <input name="oberteil" type="text" defaultValue={editingPlayer?.oberteil} placeholder="Größe" className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Schuhe</label>
                        <input name="schuhe" type="text" defaultValue={editingPlayer?.schuhe} placeholder="Größe" className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Kurze Hose</label>
                        <input name="kurze_hose" type="text" defaultValue={editingPlayer?.kurze_hose} placeholder="Größe" className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase block mb-1">Lange Hose</label>
                        <input name="lange_hose" type="text" defaultValue={editingPlayer?.lange_hose} placeholder="Größe" className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyse & Finanzen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modalCategory === 'player' && (
                  <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs border-b-2 border-black pb-1">Analyse</h4>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Stärken</label>
                      <textarea name="strengths" defaultValue={editingPlayer?.analysis?.strengths} className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2}></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Schwächen</label>
                      <textarea name="weaknesses" defaultValue={editingPlayer?.analysis?.weaknesses} className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2}></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Entwicklungspotenzial</label>
                      <textarea name="development" defaultValue={editingPlayer?.analysis?.development} className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2}></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Allgemeine Notizen</label>
                      <textarea name="notizen" defaultValue={editingPlayer?.notizen} className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2}></textarea>
                    </div>
                  </div>
                )}
                <div className={`space-y-4 ${modalCategory !== 'player' ? 'md:col-span-2' : ''}`}>
                  <h4 className="font-black uppercase text-xs border-b-2 border-black pb-1">Finanzen</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Grundgehalt</label>
                      <input name="baseSalary" type="number" defaultValue={editingPlayer?.finance?.baseSalary} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Prämie/Spiel</label>
                      <input name="bonusPerMatch" type="number" defaultValue={editingPlayer?.finance?.bonusPerMatch} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1 text-blue-600">Monate Aktiv (0-12)</label>
                      <input name="months" type="number" min="0" max="12" defaultValue={editingPlayer?.finance?.months ?? 12} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Ablöse (Zugang)</label>
                      <input name="transferFeeIn" type="number" defaultValue={editingPlayer?.finance?.transferFeeIn} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Ablöse (Abgang)</label>
                      <input name="transferFeeOut" type="number" defaultValue={editingPlayer?.finance?.transferFeeOut} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-1">Nebenvereinbarungen</label>
                    <textarea name="sideAgreements" defaultValue={editingPlayer?.finance?.sideAgreements} className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2}></textarea>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => {
                  setShowAddPlayerModal(false);
                  setEditingPlayer(null);
                }} className="flex-1 bg-white text-black py-3 font-black uppercase tracking-widest hover:bg-gray-100 transition-colors border-2 border-black">
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={saveStatus === 'saving'}
                  className={`flex-1 text-white py-3 font-black uppercase tracking-widest transition-colors border-2 border-black flex items-center justify-center gap-2 ${
                    saveStatus === 'saving' ? 'bg-gray-600 cursor-wait' : 
                    saveStatus === 'success' ? 'bg-green-500' : 'bg-black hover:bg-gray-800'
                  }`}
                >
                  {saveStatus === 'saving' ? 'WIRD GESPEICHERT...' : 
                   saveStatus === 'success' ? 'GESPEICHERT!' : 
                   (editingPlayer ? 'Speichern' : 'Anlegen')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Player Modal */}
      {showRemovePlayerModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg">
            <div className="bg-[#C00000] text-white p-4 border-b-4 border-black flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                <UserMinus size={20} /> Spieler entfernen
              </h3>
              <button onClick={() => setShowRemovePlayerModal(false)} className="hover:rotate-90 transition-transform"><CloseIcon size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase opacity-60 mb-4 italic">Wählen Sie einen Spieler aus, den Sie aus dem Kader entfernen möchten:</p>
              <div className="max-h-96 overflow-y-auto custom-scrollbar border-2 border-black">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border-b border-black last:border-b-0 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-gray-100 text-xs font-black border border-black group-hover:bg-[#C00000] group-hover:text-white transition-colors">
                        #{p.number}
                      </span>
                      <div>
                        <p className="font-black uppercase text-sm leading-none">{p.lastName}</p>
                        <p className="text-[9px] font-bold uppercase opacity-40 mt-1">{p.position}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeletePlayer(p.id, true)}
                      className="bg-white text-[#C00000] p-2 border-2 border-[#C00000] hover:bg-[#C00000] hover:text-white transition-all"
                      title="Spieler löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="p-8 text-center font-black uppercase opacity-20 italic">Keine Spieler im Kader</div>
                )}
              </div>
              <div className="mt-6">
                <button 
                  onClick={() => setShowRemovePlayerModal(false)}
                  className="w-full bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-black"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Scouting Modal */}
      {showAddScoutingModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
            <div className="bg-black text-white p-4 border-b-4 border-black flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                <Plus size={20} /> Neuer Scouting-Kandidat
              </h3>
              <button onClick={() => setShowAddScoutingModal(false)} className="hover:rotate-90 transition-transform"><CloseIcon size={20} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newCandidate: ScoutingEntry = {
                id: `s${Date.now()}`,
                createdAt: Date.now(),
                name: formData.get('name') as string,
                age: parseInt(formData.get('age') as string) || 0,
                position: formData.get('position') as string,
                club: formData.get('club') as string,
                marketValue: formData.get('marketValue') as string,
                recommendation: (formData.get('recommendation') as any) || 'Beobachten',
                category: (formData.get('category') as any) || 'Sonstige',
                status: (formData.get('status') as string) || 'Offen',
                date: formData.get('date') as string,
                conversationNotes: formData.get('conversationNotes') as string,
                waitingTime: formData.get('waitingTime') as string
              };
              console.log('Saving new candidate:', newCandidate);
              saveScoutingCandidate(newCandidate).then(() => {
                console.log('Scouting candidate saved successfully');
                setShowAddScoutingModal(false);
                setToast({ message: 'Scouting-Kandidat erfolgreich angelegt.', id: Date.now() });
              }).catch(err => {
                console.error('Error saving scouting candidate:', err);
                setToast({ message: 'Fehler beim Speichern des Kandidaten.', id: Date.now() });
              });
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Name</label>
                  <input name="name" type="text" required className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Datum</label>
                  <input name="date" type="text" defaultValue={new Date().toLocaleDateString('de-DE')} className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Alter</label>
                  <input name="age" type="number" required className="w-full border-2 border-black p-2 font-black focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Position</label>
                  <input name="position" type="text" required className="w-full border-2 border-black p-2 font-black focus:outline-none uppercase" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Verein</label>
                <input name="club" type="text" required className="w-full border-2 border-black p-2 font-black focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Kategorie</label>
                  <select name="category" className="w-full border-2 border-black p-2 font-black focus:outline-none uppercase">
                    <option value="Abwehr">Abwehr</option>
                    <option value="Mittelfeld">Mittelfeld</option>
                    <option value="Flügel">Flügel</option>
                    <option value="Sturm">Sturm</option>
                    <option value="Sonstige">Sonstige</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Empfehlung</label>
                  <select name="recommendation" className="w-full border-2 border-black p-2 font-black focus:outline-none uppercase">
                    <option value="Beobachten">Beobachten</option>
                    <option value="Verpflichten">Verpflichten</option>
                    <option value="Kein Interesse">Kein Interesse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Marktwert</label>
                  <input name="marketValue" type="text" className="w-full border-2 border-black p-2 font-black focus:outline-none" placeholder="z.B. 500k€" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Status</label>
                  <input name="status" type="text" className="w-full border-2 border-black p-2 font-black focus:outline-none" placeholder="z.B. Offen" defaultValue="Offen" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Gesprächsinhalt</label>
                <textarea name="conversationNotes" className="w-full border-2 border-black p-2 font-black focus:outline-none text-xs" rows={2} placeholder="Was wurde besprochen?"></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Wartezeit auf Antwort</label>
                <input name="waitingTime" type="text" className="w-full border-2 border-black p-2 font-black focus:outline-none" placeholder="z.B. 2 Wochen / Datum" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-black">
                  Kandidat anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Scouting Modal */}
      {showRemoveScoutingModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#DADADA] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#E8E8E8] text-[#1A1A1A] p-4 border-b border-[#DADADA] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-wider text-[#FF4C4C] flex items-center gap-2 text-sm">
                <UserMinus size={18} /> Kandidat entfernen
              </h3>
              <button onClick={() => setShowRemoveScoutingModal(false)} className="text-[#4A4A4A] hover:text-[#1A1A1A] hover:rotate-90 transition-transform"><CloseIcon size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold uppercase text-[#4A4A4A] mb-4 italic">Wählen Sie einen Kandidaten aus, den Sie von der Liste entfernen möchten:</p>
              <div className="max-h-96 overflow-y-auto custom-scrollbar border border-[#DADADA] rounded-xl divide-y divide-[#DADADA] bg-[#FFFFFF]">
                {scoutingCandidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 hover:bg-[#F4F4F4] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-[#E8E8E8] text-[#00C2FF] font-black rounded-lg border border-[#DADADA] text-xs">
                        {c.name.substring(0, 1)}
                      </div>
                      <div>
                        <p className="font-bold uppercase text-sm leading-none text-[#1A1A1A]">{c.name}</p>
                        <p className="text-[10px] font-bold uppercase text-[#4A4A4A] mt-1">{c.position} • {c.club}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await deleteScoutingCandidate(c.id);
                          setToast({ message: 'Kandidat erfolgreich entfernt.', id: Date.now() });
                        } catch (err) {
                          console.error('Error removing candidate:', err);
                          setToast({ message: 'Fehler beim Entfernen des Kandidaten.', id: Date.now() });
                        }
                      }}
                      className="bg-[#FF4C4C]/10 text-[#FF4C4C] p-2 border border-[#FF4C4C]/30 hover:bg-[#FF4C4C]/20 rounded-lg transition-all"
                      title="Kandidat löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {scoutingCandidates.length === 0 && (
                  <div className="p-8 text-center font-bold uppercase text-[#4A4A4A] italic text-xs">Keine Kandidaten auf der Liste</div>
                )}
              </div>
              <div className="mt-6">
                <button 
                  onClick={() => setShowRemoveScoutingModal(false)}
                  className="w-full bg-[#E8E8E8] text-[#1A1A1A] py-3 font-bold uppercase tracking-wider hover:bg-[#D8D8D8] transition-colors rounded-xl border border-[#DADADA] text-xs"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Meeting Modal */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#DADADA] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#E8E8E8] text-[#1A1A1A] p-4 border-b border-[#DADADA] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-wider text-[#00C2FF] text-sm">Gespräch hinzufügen</h3>
              <button onClick={() => { setShowAddMeetingModal(false); setSelectedMeetingPlayer(''); }} className="text-[#4A4A4A] hover:text-[#1A1A1A] hover:rotate-90 transition-transform"><CloseIcon size={18} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const playerName = selectedMeetingPlayer === 'NEUER SPIELER' 
                ? formData.get('customPlayerName') as string 
                : selectedMeetingPlayer;
              const isScout = scoutingCandidates.some(c => c.name === playerName);
              
              const newMeeting: MeetingEntry = {
                id: `m${Date.now()}`,
                playerName,
                date: formData.get('date') as string,
                time: formData.get('time') as string,
                location: formData.get('location') as string,
                notes: formData.get('notes') as string,
                status: formData.get('status') as any || 'Offen',
                isScout
              };
              saveMeetingEntry(newMeeting).then(() => {
                setShowAddScoutingModal(false);
                setShowAddMeetingModal(false);
                setSelectedMeetingPlayer('');
                setToast({ message: 'Termin erfolgreich angelegt', id: Date.now() });
              }).catch(err => {
                console.error('Error saving meeting:', err);
                setToast({ message: 'Fehler beim Speichern des Termins', id: Date.now() });
              });
            }}>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1.5">Spieler / Kontakt</label>
                <select 
                  name="playerType" 
                  required 
                  className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] uppercase text-xs"
                  value={selectedMeetingPlayer}
                  onChange={(e) => setSelectedMeetingPlayer(e.target.value)}
                >
                  <option value="">Wähle einen Spieler...</option>
                  <option value="NEUER SPIELER">NEUER SPIELER</option>
                  <optgroup label="KADER">
                    {sortPlayers(players).map(p => (
                      <option key={p.id} value={p.lastName}>{p.lastName} (#{p.number})</option>
                    ))}
                  </optgroup>
                  <optgroup label="SCOUTING">
                    {scoutingCandidates.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({c.club})</option>
                    ))}
                  </optgroup>
                </select>
                {selectedMeetingPlayer === 'NEUER SPIELER' && (
                  <div className="mt-2.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Name des neuen Spielers</label>
                    <input 
                      name="customPlayerName" 
                      type="text" 
                      required 
                      className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] uppercase text-xs" 
                      placeholder="NAME EINGEBEN..."
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Datum</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Uhrzeit</label>
                  <input name="time" type="time" required defaultValue="18:00" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Ort</label>
                <input name="location" type="text" required defaultValue="Sportheim" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] uppercase text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Status</label>
                <select name="status" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] uppercase text-xs">
                  <option value="Offen">Offen</option>
                  <option value="Zusage">Zusage</option>
                  <option value="Absage">Absage</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Notizen</label>
                <textarea name="notes" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" rows={3} placeholder="Themen, Ziele..."></textarea>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[#00C2FF] text-[#0A0A0A] py-3 font-black uppercase tracking-wider rounded-xl shadow-xs hover:bg-[#00B0E6] transition-all text-xs border border-[#00C2FF]">
                  Termin speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#DADADA] rounded-2xl shadow-xl w-full max-w-2xl my-auto overflow-hidden">
            <div className="bg-[#E8E8E8] text-[#1A1A1A] p-4 border-b border-[#DADADA] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-wider text-[#00C2FF] text-sm">Trainingseinheit hinzufügen</h3>
              <button onClick={() => setShowAddTrainingModal(false)} className="text-[#4A4A4A] hover:text-[#1A1A1A] hover:rotate-90 transition-transform"><CloseIcon size={18} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newSession: TrainingSession = {
                id: Date.now().toString(),
                date: formData.get('date') as string,
                weekday: getWeekdayLabel(formData.get('date') as string),
                group: formData.get('group') as string,
                load: formData.get('load') as string,
                duration: formData.get('duration') as string,
                weeklyFocus: formData.get('weeklyFocus') as string,
                sessionFocus: formData.get('sessionFocus') as string,
                trainer: formData.get('trainer') as string,
                intensity: formData.get('intensity') as string,
                players: players.map(p => ({ name: p.name, position: p.position, status: 'Aktiv' })),
                content: { warmup: '', main1: '', main2: '', closing: '' },
                importantInfo: '',
                remarks: ''
              };
              try {
                await saveTrainingSession(newSession);
                setShowAddTrainingModal(false);
                setToast({ message: 'Trainingseinheit erfolgreich hinzugefügt', id: Date.now() });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, 'training_sessions');
              }
            }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Datum</label>
                  <input name="date" type="date" required className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Trainer</label>
                  <input name="trainer" type="text" defaultValue="Trainerteam" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Gruppe</label>
                  <input name="group" type="text" defaultValue="Gesamtkader" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Dauer (Min)</label>
                  <input name="duration" type="text" defaultValue="90" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Belastung</label>
                  <select name="load" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs">
                    <option value="Gering">Gering</option>
                    <option value="Mittel">Mittel</option>
                    <option value="Hoch">Hoch</option>
                    <option value="Maximal">Maximal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Intensität</label>
                  <select name="intensity" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs">
                    <option value="Regenerativ">Regenerativ</option>
                    <option value="Extensiv">Extensiv</option>
                    <option value="Intensiv">Intensiv</option>
                    <option value="Wettkampf">Wettkampf</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Wochenschwerpunkt</label>
                <input name="weeklyFocus" type="text" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#4A4A4A] block mb-1">Einheitsschwerpunkt</label>
                <input name="sessionFocus" type="text" className="w-full bg-[#FFFFFF] border border-[#DADADA] text-[#1A1A1A] rounded-xl p-2.5 font-bold focus:outline-none focus:border-[#00C2FF] text-xs" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[#00C2FF] text-[#0A0A0A] py-3 font-black uppercase tracking-wider rounded-xl shadow-xs hover:bg-[#00B0E6] transition-all text-xs border border-[#00C2FF]">
                  Einheit speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Physio Modal */}
      {showAddPhysioModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md my-auto overflow-hidden text-slate-900">
            <div className="bg-slate-100 text-slate-900 p-4 border-b-2 border-black flex justify-between items-center">
              <h3 className="font-black uppercase tracking-wider text-slate-900 text-sm">Physio-Eintrag hinzufügen</h3>
              <button onClick={() => setShowAddPhysioModal(false)} className="text-slate-600 hover:text-black hover:rotate-90 transition-transform"><CloseIcon size={18} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const playerId = (formData.get('playerId') as string || '').trim();
              const date = (formData.get('date') as string || '').trim();
              const diagnosis = (formData.get('diagnosis') as string || '').trim();

              if (!playerId) {
                setToast({ message: 'Fehler: Bitte einen Spieler auswählen', id: Date.now() });
                return;
              }
              if (!date) {
                setToast({ message: 'Fehler: Bitte ein gültiges Datum wählen', id: Date.now() });
                return;
              }
              if (!diagnosis) {
                setToast({ message: 'Fehler: Bitte eine Diagnose/Beschwerde eingeben', id: Date.now() });
                return;
              }

              const newEntry = {
                id: Date.now().toString(),
                playerId,
                date,
                type: formData.get('type') as string,
                diagnosis,
                treatment: (formData.get('treatment') as string || '').trim(),
                status: formData.get('status') as string,
                remarks: (formData.get('remarks') as string || '').trim()
              };
              try {
                await savePhysioEntry(newEntry);
                setShowAddPhysioModal(false);
                setToast({ message: 'Physio-Eintrag erfolgreich hinzugefügt', id: Date.now() });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, 'physio_entries');
              }
            }}>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Spieler</label>
                <select name="playerId" required className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs">
                  <option value="">-- Spieler wählen --</option>
                  {sortedPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Datum</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Typ</label>
                <select name="type" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs">
                  <option value="Behandlung">Behandlung</option>
                  <option value="Check-Up">Check-Up</option>
                  <option value="Reha">Reha</option>
                  <option value="Massage">Massage</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Diagnose / Grund</label>
                <input name="diagnosis" type="text" required className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Durchgeführte Behandlung</label>
                <input name="treatment" type="text" placeholder="Z.B. Massage, Kältetherapie" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Status</label>
                <select name="status" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black text-xs">
                  <option value="In Behandlung">In Behandlung</option>
                  <option value="Austrainiert">Austrainiert</option>
                  <option value="Spielfähig">Spielfähig</option>
                  <option value="Reha-Phase">Reha-Phase</option>
                  <option value="Langzeit">Langzeit</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">Bemerkungen</label>
                <textarea name="remarks" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-2.5 font-bold focus:outline-none focus:border-black min-h-[60px] text-xs" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-slate-900 text-white border border-black py-3 font-black uppercase tracking-wider rounded-xl shadow-md hover:bg-slate-800 transition-all text-xs">
                  Eintrag speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KaderAgent Profi-Modus Modal */}
      {showKaderAgentModal && (
        <KaderAgentModal
          players={players}
          onClose={() => setShowKaderAgentModal(false)}
          initialPreset={kaderAgentPreset}
        />
      )}

      {/* 3D Profi Taktiktafel Modal */}
      {show3DProfiBoardModal && (
        <Pro3DTacticBoardModal
          players={players}
          matches={competitiveMatches}
          analyses={matchAnalyses}
          onClose={() => setShow3DProfiBoardModal(false)}
        />
      )}

      {/* Agent System Control Center Modal */}
      {showAgentControlCenterModal && (
        <AgentSystemControlCenterModal
          players={players}
          matches={competitiveMatches}
          analyses={matchAnalyses}
          backgroundLastCycle={lastAgentCycle}
          onClose={() => setShowAgentControlCenterModal(false)}
        />
      )}

      {/* Trainer Profile Selector Modal */}
      {showLocalProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#334155] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#334155]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <h2 className="text-base font-black uppercase text-[#F8FAFC] tracking-wider">
                    Trainer & Betreuer Profil
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Wähle dein Trainer-Profil für CoCoach
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLocalProfileModal(false)}
                className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Information Banner */}
            <div className="p-3.5 bg-[#1E293B]/80 border border-[#334155] rounded-xl text-xs space-y-1.5">
              <p className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <span className="text-[#10B981]">✓</span> Trainer-Zugriff aktiv
              </p>
              <p className="text-[#94A3B8] leading-relaxed">
                Alle Trainer-Kollegen haben vollen Zugriff auf Kaderverwaltung, Trainingsplanung, Taktiktafel, Spielberichte und Athletiksteuerung. Der <strong>Gemini KI-Chat</strong> ist exklusiv für Samer Khaleel reserviert.
              </p>
            </div>

            {/* Staff Profiles List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {AUTHORIZED_STAFF_LIST.map((staff) => {
                const isSelected = localEmail.toLowerCase() === staff.email.toLowerCase();
                const isStaffOwner = staff.email.toLowerCase() === ownerEmail.toLowerCase();
                return (
                  <button
                    key={staff.email}
                    onClick={() => handleSelectTrainerProfile(staff)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-[#1E293B]/50 border-[#334155]/60 hover:bg-[#1E293B] text-[#CBD5E1] hover:border-[#64748B]'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xl shrink-0">{staff.icon}</span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#F8FAFC] truncate">{staff.name}</p>
                          {isStaffOwner && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                              Owner & KI
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#94A3B8] font-medium truncate">
                          {staff.role} • {staff.email}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-black text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-md shrink-0 border border-[#10B981]/30">
                        Aktiv
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer with PIN/Login or Close */}
            <div className="pt-3 border-t border-[#334155]/60 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowLocalProfileModal(false);
                  setShowLoginModal(true);
                }}
                className="text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition underline"
              >
                Mit Google / PIN anmelden
              </button>
              <button
                onClick={() => setShowLocalProfileModal(false)}
                className="py-2 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#334155] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#334155]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-black font-black flex items-center justify-center text-sm shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  FCA
                </div>
                <div>
                  <h2 className="text-base font-black uppercase text-[#F8FAFC] tracking-wider">
                    Trainer Anmeldung
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    CoCoach
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                const passInput = form.elements.namedItem('pass') as HTMLInputElement;
                if (emailInput && passInput) {
                  handleEmailPasswordLogin(emailInput.value, passInput.value);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] block mb-1">
                  Trainer E-Mail
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={localEmail}
                  required
                  placeholder="z.B. samerkhaleel720@gmail.com"
                  className="w-full bg-[#1E293B] border border-[#334155] text-white rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] block mb-1">
                  Trainer-PIN / Passwort
                </label>
                <input
                  name="pass"
                  type="password"
                  defaultValue="0000"
                  required
                  placeholder="0000"
                  className="w-full bg-[#1E293B] border border-[#334155] text-white rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#F59E0B]"
                />
                <p className="text-[10px] text-[#64748B] mt-1">Standard Trainer-PIN: 0000</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg mt-2"
              >
                Anmelden
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#334155]"></div>
              <span className="flex-shrink mx-3 text-[#64748B] text-[10px] font-bold uppercase">Oder</span>
              <div className="flex-grow border-t border-[#334155]"></div>
            </div>

            <button
              onClick={() => {
                setShowLoginModal(false);
                handleLogin();
              }}
              className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>🔑</span>
              <span>Mit Google Account anmelden</span>
            </button>
          </div>
        </div>
      )}

      {/* Google Drive Modal (Nur für Entwickler / Owner) */}
      {isOwner && (
        <GoogleDriveModal
          isOpen={showGoogleDriveModal}
          onClose={() => setShowGoogleDriveModal(false)}
          appExportData={getAppBackupData}
        />
      )}

      {/* Google Calendar Modal */}
      <GoogleCalendarModal
        isOpen={showGoogleCalendarModal}
        onClose={() => setShowGoogleCalendarModal(false)}
        players={players}
        trainingSessions={trainingSessions}
        training={training}
        competitiveMatches={competitiveMatches}
        spiele={spiele}
        yearlyPlan={yearlyPlan}
        meetingsData={meetingsData}
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        players={players}
        matches={competitiveMatches}
      />

      {/* Gmail Modal */}
      <GmailModal
        isOpen={showGoogleGmailModal}
        onClose={() => setShowGoogleGmailModal(false)}
        players={players}
        matches={competitiveMatches}
      />

      {/* Toast Notification */}
      {toast && (
        <div key={toast.id} className="fixed bottom-6 right-6 z-[200] bg-[#FFFFFF] text-[#1A1A1A] px-4 py-3 border border-[#DADADA] rounded-2xl shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#00C2FF] rounded-full animate-pulse shadow-xs" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">{toast.message}</span>
        </div>
      )}

      {/* Floating Focus Timer Button */}
      <button
        onClick={() => setShowFocusTimer(!showFocusTimer)}
        className="fixed bottom-6 left-6 z-[200] w-12 h-12 bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-110 transition-transform border border-[#F87171]"
        title="Fokus-Timer (Pomodoro)"
      >
        <Timer size={20} className="text-white" />
      </button>

      {/* Focus Timer Overlay */}
      {showFocusTimer && (
        <div className="fixed inset-0 z-[190] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowFocusTimer(false)}>
          <div onClick={e => e.stopPropagation()}>
            <FocusTimer onClose={() => setShowFocusTimer(false)} />
          </div>
        </div>
      )}

    </div>
  );
};

export default App;

// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.

// Code-Splitting-Modul: Jede View wird als React.lazy geladen, damit das
// Start-Bundle klein bleibt. Die Komponenten werden erst beim Öffnen des
// jeweiligen Tabs (oder Modals) nachgeladen. Alle Exports haben die gleichen
// Namen wie vorher, damit App.tsx unverändert funktioniert.

import { lazy } from 'react';

export const MatchPlanningView = lazy(() => import('./views/MatchPlanningView').then((m) => ({ default: m.MatchPlanningView })));
export const YearlyPlanView = lazy(() => import('./views/YearlyPlanView').then((m) => ({ default: m.YearlyPlanView })));
export const BudgetFinanceView = lazy(() => import('./views/BudgetFinanceView').then((m) => ({ default: m.BudgetFinanceView })));
export const CardStatisticsSheet = lazy(() => import('./views/CardStatisticsSheet').then((m) => ({ default: m.CardStatisticsSheet })));
export const RunsSWView = lazy(() => import('./views/RunsSWView').then((m) => ({ default: m.RunsSWView })));
export const PhysioPlanView = lazy(() => import('./views/PhysioPlanView').then((m) => ({ default: m.PhysioPlanView })));
export const IndividualSteuerungView = lazy(() => import('./views/IndividualSteuerungView').then((m) => ({ default: m.IndividualSteuerungView })));
export const TrainingAttendanceView = lazy(() => import('./views/TrainingAttendanceView').then((m) => ({ default: m.TrainingAttendanceView })));
export const SummerPreparationView = lazy(() => import('./views/SummerPreparationView').then((m) => ({ default: m.SummerPreparationView })));
export const WinterPreparationView = lazy(() => import('./views/WinterPreparationView').then((m) => ({ default: m.WinterPreparationView })));
export const TeamListView = lazy(() => import('./views/TeamListView').then((m) => ({ default: m.TeamListView })));
export const DeveloperTasksView = lazy(() => import('./views/DeveloperTasksView').then((m) => ({ default: m.DeveloperTasksView })));
export const TrainingPlanningView = lazy(() => import('./views/TrainingPlanningView').then((m) => ({ default: m.TrainingPlanningView })));
export const MatchReportView = lazy(() => import('./views/MatchReportView').then((m) => ({ default: m.MatchReportView })));
export const ScoutingView = lazy(() => import('./views/ScoutingView').then((m) => ({ default: m.ScoutingView })));
export const MeetingsCalendarView = lazy(() => import('./views/MeetingsCalendarView').then((m) => ({ default: m.MeetingsCalendarView })));
export const AccessControlView = lazy(() => import('./views/AccessControlView').then((m) => ({ default: m.AccessControlView })));
export const PlayerPortalView = lazy(() => import('./views/PlayerPortalView').then((m) => ({ default: m.PlayerPortalView })));
export const AcademyAnalysisView = lazy(() => import('./views/AcademyAnalysisView').then((m) => ({ default: m.AcademyAnalysisView })));
export const ChampionsCupProView = lazy(() => import('./views/ChampionsCupProView').then((m) => ({ default: m.ChampionsCupProView })));
export const DashboardView = lazy(() => import('./views/DashboardView').then((m) => ({ default: m.DashboardView })));
export const VideoAnalysisView = lazy(() => import('./views/VideoAnalysisView').then((m) => ({ default: m.VideoAnalysisView })));
export const Profi3DTacticBoardView = lazy(() => import('./views/Profi3DTacticBoardView').then((m) => ({ default: m.Profi3DTacticBoardView })));
export const TrackerAcademyReportView = lazy(() => import('./views/TrackerAcademyReportView').then((m) => ({ default: m.TrackerAcademyReportView })));
export const LicenseAdminView = lazy(() => import('./views/LicenseAdminView').then((m) => ({ default: m.LicenseAdminView })));
export const MatchAnalysisProView = lazy(() => import('./views/MatchAnalysisProView').then((m) => ({ default: m.MatchAnalysisProView })));
export const StandardsRegistryView = lazy(() => import('./views/StandardsRegistryView').then((m) => ({ default: m.StandardsRegistryView })));
export const NaomiChat = lazy(() => import('./views/NaomiChatView').then((m) => ({ default: m.NaomiChat })));
export const AIQualityFilterView = lazy(() => import('./views/AIQualityFilterView').then((m) => ({ default: m.AIQualityFilterView })));
export const AnalyticsChartsView = lazy(() => import('./views/AnalyticsChartsView').then((m) => ({ default: m.default })));
export const PlayerReportProView = lazy(() => import('./views/PlayerReportProView').then((m) => ({ default: m.PlayerReportProView })));
export const TrainerChatView = lazy(() => import('./views/TrainerChatView').then((m) => ({ default: m.TrainerChatView })));
export const AuditLogView = lazy(() => import('./views/AuditLogView').then((m) => ({ default: m.AuditLogView })));
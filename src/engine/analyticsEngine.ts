import {
  PlayerAnalytics, ACWRResult, WeeklyLoadResult, GPSBaseline,
  PositionBenchmark, DeficitResult, MetabolicPowerResult,
  DistanceZones, RSAResult, HRRecoveryResult, PlayerStatusResult,
  RTPClearance, TeamAnalytics, TeamAverages, TeamAvailability,
  IntensitySuggestion, RiskAlert, EngineUpdate
} from './types';

const POSITION_BENCHMARKS: Record<string, PositionBenchmark> = {
  'TW': { position: 'TW', expectedDistanceKm: 5.5, expectedHighSpeedM: 120, expectedSprintM: 50, expectedMaxSpeed: 28, expectedSprintCount: 5 },
  'IV': { position: 'IV', expectedDistanceKm: 9.0, expectedHighSpeedM: 550, expectedSprintM: 250, expectedMaxSpeed: 30, expectedSprintCount: 12 },
  'RV': { position: 'RV', expectedDistanceKm: 10.5, expectedHighSpeedM: 850, expectedSprintM: 400, expectedMaxSpeed: 32, expectedSprintCount: 18 },
  'LV': { position: 'LV', expectedDistanceKm: 10.5, expectedHighSpeedM: 850, expectedSprintM: 400, expectedMaxSpeed: 32, expectedSprintCount: 18 },
  'DM': { position: 'DM', expectedDistanceKm: 10.8, expectedHighSpeedM: 750, expectedSprintM: 320, expectedMaxSpeed: 31, expectedSprintCount: 14 },
  'ZM': { position: 'ZM', expectedDistanceKm: 11.0, expectedHighSpeedM: 800, expectedSprintM: 350, expectedMaxSpeed: 31.5, expectedSprintCount: 15 },
  'OM': { position: 'OM', expectedDistanceKm: 10.5, expectedHighSpeedM: 850, expectedSprintM: 400, expectedMaxSpeed: 32, expectedSprintCount: 16 },
  'RM': { position: 'RM', expectedDistanceKm: 11.2, expectedHighSpeedM: 1000, expectedSprintM: 500, expectedMaxSpeed: 33, expectedSprintCount: 20 },
  'LM': { position: 'LM', expectedDistanceKm: 11.2, expectedHighSpeedM: 1000, expectedSprintM: 500, expectedMaxSpeed: 33, expectedSprintCount: 20 },
  'RA': { position: 'RA', expectedDistanceKm: 11.5, expectedHighSpeedM: 1050, expectedSprintM: 550, expectedMaxSpeed: 33.5, expectedSprintCount: 22 },
  'LA': { position: 'LA', expectedDistanceKm: 11.5, expectedHighSpeedM: 1050, expectedSprintM: 550, expectedMaxSpeed: 33.5, expectedSprintCount: 22 },
  'ST': { position: 'ST', expectedDistanceKm: 10.0, expectedHighSpeedM: 900, expectedSprintM: 480, expectedMaxSpeed: 33.5, expectedSprintCount: 20 },
  'LM/LW': { position: 'LM/LW', expectedDistanceKm: 11.5, expectedHighSpeedM: 1050, expectedSprintM: 550, expectedMaxSpeed: 33.5, expectedSprintCount: 22 },
  'RM/RW': { position: 'RM/RW', expectedDistanceKm: 11.5, expectedHighSpeedM: 1050, expectedSprintM: 550, expectedMaxSpeed: 33.5, expectedSprintCount: 22 },
};

function getPositionBenchmark(pos: string): PositionBenchmark {
  return POSITION_BENCHMARKS[pos] || POSITION_BENCHMARKS['ZM'];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function toDays(dateStr?: string): number {
  if (!dateStr) return 999;
  try {
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  } catch {
    return 999;
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendFromValues(recent: number, older: number): 'steigend' | 'stabil' | 'fallend' {
  if (older === 0) return 'stabil';
  const diff = ((recent - older) / older) * 100;
  if (diff > 10) return 'steigend';
  if (diff < -10) return 'fallend';
  return 'stabil';
}

function computeACWR(history: any[]): ACWRResult {
  if (!history || history.length < 2) {
    return { ratio: 0, acuteLoad: 0, chronicLoad: 0, trend: 'stabil', status: 'keine_daten', text: 'Nicht genug Daten für ACWR-Berechnung.' };
  }
  const sorted = [...history].sort((a, b) => {
    const da = a.uploadDate || '';
    const db = b.uploadDate || '';
    return da.localeCompare(db);
  });
  const loads = sorted.map(h => h.totalDistanceKm || 0);
  const acute = loads.length >= 1 ? avg(loads.slice(-1)) : 0;
  const chronic = loads.length >= 4 ? avg(loads.slice(-4)) : avg(loads);
  const ratio = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0;
  const prevAcute = loads.length >= 2 ? avg(loads.slice(-2, -1)) : acute;
  const trend = trendFromValues(acute, prevAcute);
  let status: ACWRResult['status'] = 'optimal';
  let text = '';
  if (ratio === 0) { status = 'keine_daten'; text = 'Keine Daten vorhanden.'; }
  else if (ratio >= 0.8 && ratio <= 1.3) { status = 'optimal'; text = `ACWR ${ratio} – Optimaler Belastungsbereich (0.8–1.3).`; }
  else if (ratio > 1.3 && ratio <= 1.5) { status = 'vorsicht'; text = `ACWR ${ratio} – Erhöhte Belastung. Verletzungsrisiko steigt.`; }
  else if (ratio > 1.5) { status = 'gefahr'; text = `ACWR ${ratio} – KRITISCH! Höchstes Verletzungsrisiko. Sofort Belastung reduzieren!`; }
  else if (ratio < 0.8 && ratio > 0.5) { status = 'vorsicht'; text = `ACWR ${ratio} – Unterhalb des optimalen Bereichs. Fitness kann abnehmen.`; }
  else { status = 'gefahr'; text = `ACWR ${ratio} – Sehr niedrige Belastung. Trainingsrückstand.`; }
  return { ratio, acuteLoad: Math.round(acute * 100) / 100, chronicLoad: Math.round(chronic * 100) / 100, trend, status, text };
}

function computeWeeklyLoad(history: any[]): WeeklyLoadResult {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const last7 = history.filter(h => h.uploadDate && (now - new Date(h.uploadDate).getTime()) < weekMs);
  const last14 = history.filter(h => h.uploadDate && (now - new Date(h.uploadDate).getTime()) < 2 * weekMs);
  const last28 = history.filter(h => h.uploadDate && (now - new Date(h.uploadDate).getTime()) < 4 * weekMs);
  const l7 = avg(last7.map(h => h.totalDistanceKm || 0));
  const l14 = avg(last14.map(h => h.totalDistanceKm || 0));
  const l28 = avg(last28.map(h => h.totalDistanceKm || 0));
  return {
    currentWeek: Math.round(l7 * 100) / 100,
    last7d: Math.round(l7 * 100) / 100,
    last14d: Math.round(l14 * 100) / 100,
    last28d: Math.round(l28 * 100) / 100,
    avgPerSession: history.length > 0 ? Math.round(avg(history.map(h => h.totalDistanceKm || 0)) * 100) / 100 : 0,
    sessionsCount: history.length,
    trend: trendFromValues(l7, l14)
  };
}

function computeGPSBaseline(history: any[], position: string): GPSBaseline {
  const bench = getPositionBenchmark(position);
  if (!history || history.length === 0) {
    return {
      avgDistanceKm: 0, avgHighSpeedM: 0, avgSprintM: 0, avgMaxSpeed: 0, avgSprintCount: 0,
      sampleCount: 0, positionBenchmark: bench
    };
  }
  return {
    avgDistanceKm: Math.round(avg(history.map(h => h.totalDistanceKm || 0)) * 100) / 100,
    avgHighSpeedM: Math.round(avg(history.map(h => h.highSpeedDistanceM || 0))),
    avgSprintM: Math.round(avg(history.map(h => h.sprintDistanceM || 0))),
    avgMaxSpeed: Math.round(avg(history.map(h => h.maxSpeedKmh || 0)) * 10) / 10,
    avgSprintCount: Math.round(avg(history.map(h => h.sprintCount || 0))),
    sampleCount: history.length,
    positionBenchmark: bench
  };
}

function computeSprintDeficit(baseline: GPSBaseline): DeficitResult {
  const current = baseline.avgSprintM;
  const benchmark = baseline.positionBenchmark.expectedSprintM;
  if (baseline.sampleCount === 0) return { current: 0, benchmark, deficit: 0, percent: 0, status: 'keine_daten' };
  const deficit = benchmark - current;
  const percent = benchmark > 0 ? Math.round((current / benchmark) * 100) : 0;
  let status: DeficitResult['status'] = 'durchschnitt';
  if (percent >= 110) status = 'ueber_durchschnitt';
  else if (percent >= 85) status = 'durchschnitt';
  else status = 'unter_durchschnitt';
  return { current: Math.round(current), benchmark, deficit: Math.round(deficit), percent, status };
}

function computeAccelDecelDeficit(history: any[], position: string): DeficitResult {
  const bench = getPositionBenchmark(position);
  const avgAccel = history.length > 0 ? avg(history.map(h => h.accelerations || 0)) : 0;
  const expectedAccel = bench.expectedSprintCount * 1.5;
  const deficit = expectedAccel - avgAccel;
  const percent = expectedAccel > 0 ? Math.round((avgAccel / expectedAccel) * 100) : 0;
  let status: DeficitResult['status'] = 'keine_daten';
  if (history.length > 0) {
    if (percent >= 100) status = 'ueber_durchschnitt';
    else if (percent >= 75) status = 'durchschnitt';
    else status = 'unter_durchschnitt';
  }
  return { current: Math.round(avgAccel), benchmark: Math.round(expectedAccel), deficit: Math.round(deficit), percent, status };
}

function computeMetabolicPower(history: any[]): MetabolicPowerResult {
  if (!history || history.length === 0) return { avgPowerW: 0, peakPowerW: 0, totalEnergyKJ: 0, classification: 'keine_daten' };
  const powers = history.map(h => {
    const dist = (h.totalDistanceKm || 0) * 1000;
    const speed = h.maxSpeedKmh || 0;
    const mass = 75;
    const bodySpeed = speed / 3.6;
    const accelForce = mass * (bodySpeed * bodySpeed) / 2;
    return Math.round(accelForce * 0.15);
  });
  const avgP = Math.round(avg(powers));
  const peakP = Math.round(Math.max(...powers));
  const totalKJ = Math.round(avgP * 90 * history.length / 1000);
  let classification: MetabolicPowerResult['classification'] = 'niedrig';
  if (avgP >= 800) classification = 'hoch';
  else if (avgP >= 500) classification = 'mittel';
  return { avgPowerW: avgP, peakPowerW: peakP, totalEnergyKJ: totalKJ, classification };
}

function computeDistanceZones(history: any[]): DistanceZones {
  if (!history || history.length === 0) return { z1Walking: 0, z2Jogging: 0, z3Laufen: 0, z4Schnelllauf: 0, z5Sprint: 0, z6MaxSprint: 0, totalKm: 0 };
  const total = avg(history.map(h => h.totalDistanceKm || 0));
  const hs = avg(history.map(h => h.highSpeedDistanceM || 0)) / 1000;
  const sp = avg(history.map(h => h.sprintDistanceM || 0)) / 1000;
  const remaining = Math.max(0, total - hs - sp);
  return {
    z1Walking: Math.round(remaining * 0.35 * 1000) / 1000,
    z2Jogging: Math.round(remaining * 0.35 * 1000) / 1000,
    z3Laufen: Math.round(remaining * 0.30 * 1000) / 1000,
    z4Schnelllauf: Math.round(hs * 1000) / 1000,
    z5Sprint: Math.round(sp * 0.7 * 1000) / 1000,
    z6MaxSprint: Math.round(sp * 0.3 * 1000) / 1000,
    totalKm: Math.round(total * 1000) / 1000
  };
}

function computeRSA(history: any[]): RSAResult {
  if (!history || history.length < 2) return { score: 0, dropoffPercent: 0, status: 'keine_daten', text: 'Nicht genug Daten für RSA-Berechnung.' };
  const sorted = [...history].sort((a, b) => (a.uploadDate || '').localeCompare(b.uploadDate || ''));
  const speeds = sorted.map(h => h.maxSpeedKmh || 0);
  const firstHalf = avg(speeds.slice(0, Math.ceil(speeds.length / 2)));
  const secondHalf = avg(speeds.slice(Math.floor(speeds.length / 2)));
  const dropoff = firstHalf > 0 ? Math.round(((firstHalf - secondHalf) / firstHalf) * 100) : 0;
  const score = clamp(Math.round(100 - dropoff * 2), 0, 100);
  let status: RSAResult['status'] = 'stabil';
  let text = '';
  if (dropoff <= 5) { status = 'stabil'; text = `RSA stabil. Geschwindigkeitsabfall ${dropoff}% – im Optimalbereich.`; }
  else if (dropoff <= 15) { status = 'abfallend'; text = `RSA leicht abfallend. Abfall ${dropoff}% – Upload-Intervall erhöhen.`; }
  else { status = 'kritisch'; text = `RSA kritisch! Abfall ${dropoff}% – Belastung reduzieren, Regeneration prüfen.`; }
  return { score, dropoffPercent: dropoff, status, text };
}

function computeHRRecovery(history: any[]): HRRecoveryResult {
  if (!history || history.length === 0) return { avgRecoveryBpm: 0, status: 'keine_daten', restingHR: 0, maxHR: 0 };
  const recoveries = history.map(h => (h as any).hrRecoveryDropBpm || 0).filter(r => r > 0);
  const avgHR = avg(history.map(h => h.avgHeartRateBpm || 0));
  const maxHR = avg(history.map(h => h.maxHeartRateBpm || 0));
  const avgRec = recoveries.length > 0 ? avg(recoveries) : 0;
  let status: HRRecoveryResult['status'] = 'keine_daten';
  if (avgRec > 0) {
    if (avgRec >= 20) status = 'gut';
    else if (avgRec >= 12) status = 'mittel';
    else status = 'schlecht';
  }
  return { avgRecoveryBpm: Math.round(avgRec), status, restingHR: Math.round(avgHR * 0.55), maxHR: Math.round(maxHR) };
}

function computeLoadAmpel(acwr: ACWRResult, rsa: RSAResult, hrRecovery: HRRecoveryResult, physioStatus: string, isInjured: boolean): { ampel: 'Grun' | 'Gelb' | 'Rot'; reason: string } {
  if (isInjured || physioStatus.includes('Rot') || physioStatus.includes('Ausfall')) {
    return { ampel: 'Rot', reason: 'Verletzung / Ausfall' };
  }
  if (acwr.status === 'gefahr' || rsa.status === 'kritisch') {
    return { ampel: 'Rot', reason: `Belastung kritisch (ACWR ${acwr.ratio}, RSA ${rsa.status})` };
  }
  if (acwr.status === 'vorsicht' || rsa.status === 'abfallend' || hrRecovery.status === 'schlecht' || physioStatus.includes('Gelb') || physioStatus.includes('Reha')) {
    return { ampel: 'Gelb', reason: `Erhöhte Vorsicht (ACWR ${acwr.ratio}, HR-Erholung ${hrRecovery.status})` };
  }
  return { ampel: 'Grun', reason: 'Alle Werte im grünen Bereich.' };
}

function computeRTPRisk(player: any, physioEntries: any[], acwr: ACWRResult, rsa: RSAResult): { score: number; phase: string; clearance: RTPClearance } {
  let score = 0;
  const isHurt = player.isInjured || (player.status || '').includes('Verletzt') || (player.status || '').includes('Reha');
  const recentPhysio = physioEntries
    .filter((e: any) => e.playerId === player.id)
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  const activePhysio = recentPhysio.find((e: any) =>
    e.status?.includes('Behandlung') || e.status?.includes('Reha') || e.status?.includes('Langzeit') || e.status?.includes('Rot')
  );

  if (isHurt) score += 40;
  if (activePhysio) score += 25;
  if (acwr.status === 'gefahr') score += 20;
  else if (acwr.status === 'vorsicht') score += 10;
  if (rsa.status === 'kritisch') score += 15;
  else if (rsa.status === 'abfallend') score += 8;
  if (acwr.ratio > 1.5) score += 10;
  const lastUploadDays = player.trackerAnalysis?.uploadDate ? toDays(player.trackerAnalysis.uploadDate) : 999;
  if (lastUploadDays > 14) score += 5;

  score = clamp(score, 0, 100);

  let phase = 'Keine Einschränkung';
  if (score >= 60) phase = 'Reha-Phase ( aktiv)';
  else if (score >= 35) phase = 'Teilbelastung / Aufbau';
  else if (score >= 15) phase = 'Leicht erhöhte Vorsicht';
  else phase = 'Volle Belastbarkeit';

  const medicalCleared = !isHurt && !activePhysio;
  const physioCleared = !activePhysio || activePhysio.status?.includes('Grün') || activePhysio.status?.includes('Spielfähig');
  const trainerCleared = score < 30;
  const overall = medicalCleared && physioCleared && trainerCleared;

  return {
    score,
    phase,
    clearance: {
      medical: medicalCleared,
      physio: physioCleared,
      trainer: trainerCleared,
      overallCleared: overall,
      phase,
      estimatedReturn: score >= 60 ? '2–4 Wochen' : score >= 35 ? '1–2 Wochen' : score >= 15 ? '1 Woche' : 'Sofort'
    }
  };
}

function computePlayerStatus(player: any, physioEntries: any[]): PlayerStatusResult {
  const recentPhysio = physioEntries
    .filter((e: any) => e.playerId === player.id)
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  const latestPhysio = recentPhysio[0];
  const lastUploadDays = player.trackerAnalysis?.uploadDate ? toDays(player.trackerAnalysis.uploadDate) : 999;
  const isInjured = player.isInjured || (player.status || '').includes('Verletzt');
  let availability: PlayerStatusResult['availability'] = 'verfuegbar';
  if (isInjured || (latestPhysio?.status || '').includes('Rot') || (latestPhysio?.status || '').includes('Ausfall')) {
    availability = 'ausfall';
  } else if ((latestPhysio?.status || '').includes('Gelb') || (latestPhysio?.status || '').includes('Behandlung') || (latestPhysio?.status || '').includes('Reha')) {
    availability = 'teilweise';
  }
  return {
    isInjured,
    injuryType: player.injuryType || player.verletzung || '',
    fitness: player.fitness || 'Unbekannt',
    loadAmpel: player.loadAmpel || 'Grun',
    physioStatus: latestPhysio?.status || 'Keine Einträge',
    lastPhysioDate: latestPhysio?.date || '',
    daysSinceLastUpload: lastUploadDays,
    availability
  };
}

function computeTrainerRecommendation(name: string, pos: string, acwr: ACWRResult, rsa: RSAResult, ampel: string, rtpRisk: number, gpsBaseline: GPSBaseline): string {
  const parts: string[] = [];
  parts.push(`${name} (${pos}):`);
  if (ampel === 'Rot') {
    parts.push('🔴 SOFORTIGE MASSNAHME: Belastung stoppen. Regeneration priorisieren.');
    if (rtpRisk >= 60) parts.push('RTP-Risiko hoch – ärztliche Abstimmung empfohlen.');
  } else if (ampel === 'Gelb') {
    parts.push('🟡 VORSICHT: Belastung reduzieren. Individuelles Training empfohlen.');
    if (acwr.status === 'vorsicht') parts.push(`ACWR ${acwr.ratio} – nächste Einheit leicht gestalten.`);
  } else {
    parts.push('🟢 VOLLE LEISTUNGSFÄHIGKEIT.');
    if (acwr.status === 'optimal') parts.push('Belastung im optimalen Bereich – beibehalten.');
  }
  if (rsa.status === 'abfallend' || rsa.status === 'kritisch') {
    parts.push(`RSA-Abfall ${rsa.dropoffPercent}% – Sprint-Intensität in Training überprüfen.`);
  }
  const bench = gpsBaseline.positionBenchmark;
  if (gpsBaseline.sampleCount > 0) {
    if (gpsBaseline.avgSprintM < bench.expectedSprintM * 0.8) {
      parts.push(`Sprint-Defizit: ${Math.round(bench.expectedSprintM - gpsBaseline.avgSprintM)}m unter Benchmark.`);
    }
    if (gpsBaseline.avgDistanceKm > bench.expectedDistanceKm * 1.15) {
      parts.push('Überdurchschnittliche Gesamtdistanz – Regeneration im Blick behalten.');
    }
  }
  return parts.join(' ');
}

function computeRiskAlerts(players: any[], playerAnalytics: PlayerAnalytics[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  for (const pa of playerAnalytics) {
    if (pa.loadAmpel === 'Rot') {
      alerts.push({
        playerId: pa.playerId, playerName: pa.playerName, level: 'hoch',
        type: 'ueberlastung', message: pa.loadAmpelReason,
        action: 'Belastung reduzieren, individuelles Training, ggf. Arzt konsultieren.'
      });
    } else if (pa.acwr.status === 'gefahr') {
      alerts.push({
        playerId: pa.playerId, playerName: pa.playerName, level: 'hoch',
        type: 'ermuedung', message: `ACWR ${pa.acwr.ratio} – Überlastungsgefahr`,
        action: 'Sofort Belastung reduzieren.'
      });
    } else if (pa.rtpRiskScore >= 35) {
      alerts.push({
        playerId: pa.playerId, playerName: pa.playerName, level: 'mittel',
        type: 'verletzung', message: `RTP-Risiko ${pa.rtpRiskScore}/100`,
        action: 'Individuelles Training prüfen.'
      });
    } else if (pa.status.daysSinceLastUpload > 21) {
      alerts.push({
        playerId: pa.playerId, playerName: pa.playerName, level: 'niedrig',
        type: 'formabfall', message: `Letztes Upload vor ${pa.status.daysSinceLastUpload} Tagen`,
        action: 'Nächstes Tracking-Update anfordern.'
      });
    }
  }
  return alerts.sort((a, b) => {
    const prio = { hoch: 0, mittel: 1, niedrig: 2 };
    return (prio[a.level] || 3) - (prio[b.level] || 3);
  });
}

function computeIntensitySuggestion(team: TeamAnalytics, matchInDays: number | null): IntensitySuggestion {
  const { availability, teamAverage } = team;
  const warnings: string[] = [];
  let level: IntensitySuggestion['level'] = 'mittel';
  let reason = '';
  let focus = 'Technik, Taktik, Kondition';

  if (availability.rate < 70) {
    level = 'niedrig';
    reason = `Nur ${availability.rate}% Verfügbarkeit. Regeneration priorisieren.`;
    warnings.push('Viele Spieler ausfallend – Squad-Belastung niedrig halten.');
  } else if (matchInDays !== null && matchInDays <= 2) {
    level = 'niedrig';
    reason = `Spiel in ${matchInDays} Tagen – Regeneration und Taktik im Fokus.`;
    focus = 'Taktik, Standards, lockeres Abschluss-Training';
  } else if (matchInDays !== null && matchInDays <= 4) {
    level = 'mittel';
    reason = `Spiel in ${matchInDays} Tagen – Wettkampfvorbereitung.`;
    focus = 'Spielintensität, Pressing, Umschalten';
  } else if (teamAverage.fitCount < teamAverage.squadSize * 0.6) {
    level = 'regeneration';
    reason = 'Viele Spieler im Aufbau – Regenerationseinheit empfohlen.';
    focus = 'Lockeres Training, Regeneration, Einzelarbeit';
  } else {
    const avgDist = teamAverage.avgDistanceKm;
    if (avgDist > 11) {
      level = 'mittel';
      reason = 'Team-Durchschnitt bereits hoch – Intensität moderat halten.';
      focus = 'Qualität vor Quantität, technische Arbeit';
    } else {
      level = 'hoch';
      reason = 'Team bereit für belastende Einheit.';
      focus = 'Hohe Intensität, schnelle Abfolge, Pressing-Training';
    }
  }
  return { level, reason, focus, warnings };
}

export function computePlayerAnalytics(
  player: any,
  physioEntries: any[],
  individualTrainingData: any[]
): PlayerAnalytics {
  const history = player.trackerHistory || [];
  const tracker = player.trackerAnalysis || {};
  if (tracker.totalDistanceKm && (!history.length || history[history.length - 1]?.uploadDate !== tracker.uploadDate)) {
    history.push({
      id: 'latest_snapshot',
      fileName: tracker.fileName || 'latest',
      uploadDate: tracker.uploadDate || '',
      totalDistanceKm: tracker.totalDistanceKm || 0,
      highSpeedDistanceM: tracker.highSpeedDistanceM || 0,
      sprintDistanceM: tracker.sprintDistanceM || 0,
      maxSpeedKmh: tracker.maxSpeedKmh || 0,
      sprintCount: tracker.sprintCount || 0,
      tacticalSummary: tracker.tacticalSummary || '',
      avgHeartRateBpm: tracker.avgHeartRateBpm || 0,
      maxHeartRateBpm: tracker.maxHeartRateBpm || 0,
      accelerations: tracker.accelerations || 0,
      decelerations: tracker.decelerations || 0,
    } as any);
  }

  const acwr = computeACWR(history);
  const weeklyLoad = computeWeeklyLoad(history);
  const gpsBaseline = computeGPSBaseline(history, player.position);
  const sprintDeficit = computeSprintDeficit(gpsBaseline);
  const accelDecelDeficit = computeAccelDecelDeficit(history, player.position);
  const metabolicPower = computeMetabolicPower(history);
  const distanceZones = computeDistanceZones(history);
  const rsaScore = computeRSA(history);
  const highSpeedDistance = gpsBaseline.avgHighSpeedM;
  const hrRecovery = computeHRRecovery(history);

  const recentPhysio = physioEntries
    .filter((e: any) => e.playerId === player.id)
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  const latestPhysioStatus = recentPhysio[0]?.status || '';

  const { ampel, reason: ampelReason } = computeLoadAmpel(acwr, rsaScore, hrRecovery, latestPhysioStatus, player.isInjured || false);
  const status = computePlayerStatus(player, physioEntries);
  const { score: rtpRisk, phase: rtpPhase, clearance: rtpClearance } = computeRTPRisk(player, physioEntries, acwr, rsaScore);

  return {
    playerId: player.id,
    playerName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
    position: player.position || '',
    acwr, weeklyLoad, gpsBaseline, sprintDeficit, accelDecelDeficit,
    metabolicPower, distanceZones, rsaScore, highSpeedDistance, hrRecovery,
    loadAmpel: ampel, loadAmpelReason: ampelReason,
    status, rtpRiskScore: rtpRisk, rtpPhase, rtpClearance,
    trainerRecommendation: '',
    riskAnalysis: ''
  };
}

export function computeTeamAnalytics(
  players: any[],
  physioEntries: any[],
  individualTrainingData: any[],
  matchInDays: number | null
): TeamAnalytics {
  const squadPlayers = players.filter((p: any) => p.category === 'player');
  const allAnalytics = squadPlayers.map(p => computePlayerAnalytics(p, physioEntries, individualTrainingData));

  const distances = allAnalytics.filter(a => a.gpsBaseline.sampleCount > 0).map(a => a.gpsBaseline.avgDistanceKm);
  const highSpeeds = allAnalytics.filter(a => a.gpsBaseline.sampleCount > 0).map(a => a.gpsBaseline.avgHighSpeedM);
  const sprints = allAnalytics.filter(a => a.gpsBaseline.sampleCount > 0).map(a => a.gpsBaseline.avgSprintM);
  const speeds = allAnalytics.filter(a => a.gpsBaseline.sampleCount > 0).map(a => a.gpsBaseline.avgMaxSpeed);
  const sprintCounts = allAnalytics.filter(a => a.gpsBaseline.sampleCount > 0).map(a => a.gpsBaseline.avgSprintCount);
  const hrs = allAnalytics.filter(a => a.hrRecovery.status !== 'keine_daten').map(a => a.hrRecovery.avgRecoveryBpm);

  const teamAverage: TeamAverages = {
    avgDistanceKm: distances.length > 0 ? Math.round(avg(distances) * 100) / 100 : 0,
    avgHighSpeedM: highSpeeds.length > 0 ? Math.round(avg(highSpeeds)) : 0,
    avgSprintM: sprints.length > 0 ? Math.round(avg(sprints)) : 0,
    avgMaxSpeed: speeds.length > 0 ? Math.round(avg(speeds) * 10) / 10 : 0,
    avgSprintCount: sprintCounts.length > 0 ? Math.round(avg(sprintCounts)) : 0,
    avgWorkloadIndex: 0,
    avgHR: hrs.length > 0 ? Math.round(avg(hrs)) : 0,
    squadSize: squadPlayers.length,
    fitCount: allAnalytics.filter(a => a.loadAmpel === 'Grun').length,
    partialCount: allAnalytics.filter(a => a.loadAmpel === 'Gelb').length,
    outCount: allAnalytics.filter(a => a.loadAmpel === 'Rot').length,
  };

  const positionBaselines: Record<string, PositionBenchmark> = {};
  const positions = [...new Set(squadPlayers.map(p => p.position))];
  for (const pos of positions) {
    const posPlayers = allAnalytics.filter(a => a.position === pos && a.gpsBaseline.sampleCount > 0);
    if (posPlayers.length > 0) {
      positionBaselines[pos] = {
        position: pos,
        expectedDistanceKm: Math.round(avg(posPlayers.map(a => a.gpsBaseline.avgDistanceKm)) * 100) / 100,
        expectedHighSpeedM: Math.round(avg(posPlayers.map(a => a.gpsBaseline.avgHighSpeedM))),
        expectedSprintM: Math.round(avg(posPlayers.map(a => a.gpsBaseline.avgSprintM))),
        expectedMaxSpeed: Math.round(avg(posPlayers.map(a => a.gpsBaseline.avgMaxSpeed)) * 10) / 10,
        expectedSprintCount: Math.round(avg(posPlayers.map(a => a.gpsBaseline.avgSprintCount))),
      };
    }
  }

  const unavail = allAnalytics.filter(a => a.status.availability !== 'verfuegbar');
  const availability: TeamAvailability = {
    total: squadPlayers.length,
    fit: allAnalytics.filter(a => a.status.availability === 'verfuegbar').length,
    partial: allAnalytics.filter(a => a.status.availability === 'teilweise').length,
    out: allAnalytics.filter(a => a.status.availability === 'ausfall').length,
    rate: squadPlayers.length > 0 ? Math.round((allAnalytics.filter(a => a.status.availability === 'verfuegbar').length / squadPlayers.length) * 100) : 100,
    unavailablePlayers: unavail.map(a => a.playerName),
  };

  const intensitySuggestion = computeIntensitySuggestion({ teamAverage, availability } as any, matchInDays);
  const riskAlerts = computeRiskAlerts(squadPlayers, allAnalytics);

  const parts: string[] = [];
  parts.push(`Kader: ${teamAverage.squadSize} Spieler | Fit: ${teamAverage.fitCount} | Teilweise: ${teamAverage.partialCount} | Ausfall: ${teamAverage.outCount}`);
  if (riskAlerts.length > 0) {
    parts.push(`${riskAlerts.length} Warnung(en): ${riskAlerts.filter(a => a.level === 'hoch').length} hoch, ${riskAlerts.filter(a => a.level === 'mittel').length} mittel`);
  }
  parts.push(`Intensität: ${intensitySuggestion.level} – ${intensitySuggestion.reason}`);

  return {
    teamAverage,
    positionBaselines,
    availability,
    intensitySuggestion,
    dailyGoal: `Durchschnittliche GPS-Werte im Blick behalten. Ziel: ${Math.round(POSITION_BENCHMARKS['ZM'].expectedDistanceKm)}km / Spieler.`,
    weeklyGoal: `70% des Kaders im grünen Bereich halten. ACWR zwischen 0.8–1.3.`,
    riskAlerts,
    teamRecommendation: parts.join(' | ')
  };
}

export function computeFullEngineUpdate(
  players: any[],
  physioEntries: any[],
  individualTrainingData: any[],
  competitiveMatches: any[]
): EngineUpdate {
  const today = new Date();
  let matchInDays: number | null = null;
  const todayStr = today.toISOString().split('T')[0];
  const upcoming = (competitiveMatches || [])
    .filter((m: any) => m.date && m.date > todayStr && !m.result)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  if (upcoming.length > 0) {
    const diffMs = new Date(upcoming[0].date).getTime() - today.getTime();
    matchInDays = Math.max(0, Math.ceil(diffMs / 86400000));
  }

  const squadPlayers = players.filter((p: any) => p.category === 'player');
  const playerAnalytics = squadPlayers.map(p => computePlayerAnalytics(p, physioEntries, individualTrainingData));

  for (const pa of playerAnalytics) {
    const recParts: string[] = [];
    recParts.push(pa.trainerRecommendation || computeTrainerRecommendation(pa.playerName, pa.position, pa.acwr, pa.rsaScore, pa.loadAmpel, pa.rtpRiskScore, pa.gpsBaseline));
    if (pa.rtpRiskScore >= 35) {
      recParts.push(`RTP: ${pa.rtpPhase} (Risiko ${pa.rtpRiskScore}/100). Freigaben: Medizin=${pa.rtpClearance.medical ? 'Ja' : 'Nein'}, Physio=${pa.rtpClearance.physio ? 'Ja' : 'Nein'}, Trainer=${pa.rtpClearance.trainer ? 'Ja' : 'Nein'}.`);
    }
    pa.trainerRecommendation = recParts.join(' ');
    pa.riskAnalysis = `ACWR ${pa.acwr.ratio} (${pa.acwr.status}) | RSA ${pa.rsaScore.score}/100 (${pa.rsaScore.status}) | HR-Erholung ${pa.hrRecovery.status} | RTP-Risiko ${pa.rtpRiskScore}/100`;
  }

  const team = computeTeamAnalytics(players, physioEntries, individualTrainingData, matchInDays);

  return {
    timestamp: new Date().toISOString(),
    players: playerAnalytics,
    team
  };
}

export function applyEngineToPlayerFields(player: any, analytics: PlayerAnalytics): any {
  const updated = { ...player };
  if (!player.loadAmpel || player.loadAmpel === '') {
    updated.loadAmpel = analytics.loadAmpel;
  }
  if (analytics.rtpRiskScore >= 35 && !player.status?.includes('Reha') && !player.status?.includes('Verletzt')) {
    updated.status = 'Vorsicht';
  }
  return updated;
}

export function applyEngineToIndividualRecord(record: any, analytics: PlayerAnalytics): any {
  const updated = { ...record };
  if (!record.loadAmpel) {
    updated.loadAmpel = analytics.loadAmpel;
  }
  if (!record.focus && analytics.acwr.status !== 'keine_daten') {
    updated.focus = `ACWR: ${analytics.acwr.ratio} | ${analytics.acwr.text}`;
  }
  if (!record.goals && analytics.rtpRiskScore < 30) {
    updated.goals = `Belastungs-Ampel: ${analytics.loadAmpel} | RSA: ${analytics.rsaScore.score}/100`;
  }
  return updated;
}

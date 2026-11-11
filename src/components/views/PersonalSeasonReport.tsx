import React, { useMemo } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Minus, Timer, Zap, Shield } from 'lucide-react';

/**
 * Persönlicher Saisonbericht ("DEIN PERSÖNLICHER SPIELERBERICHT").
 *
 * Rein lesende Auswertung: Es werden keine Daten gespeichert, geändert oder
 * gelöscht. Alle Werte stammen aus den bereits vorhandenen Quellen:
 *  - Einsatzminuten: MatchMinuteRecord.minutes (competetiveMinutes / testMinutes)
 *  - Messwerte je Analyse: trackerAcademyReports[].metrics
 *  - bisherige Gesamtzeit: player.einsatzzeitenGesamt (Fallback)
 *
 * Fehlt ein Wert, wird "keine Daten" ausgegeben und kein Trend berechnet.
 */

interface PersonalSeasonReportProps {
  player: any;
  reports?: any[];
  competitiveMatches?: any[];
  competitiveMinutes?: any[];
  testMatches?: any[];
  testMinutes?: any[];
}

type Trend = 'up' | 'down' | 'flat' | 'none';

const TREND_THRESHOLD_PERCENT = 3;

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatNumber = (value: number | null, digits = 1): string => {
  if (value === null) return 'keine Daten';
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const dateKey = (value: any): string => String(value || '').slice(0, 10);

const totalMinutesFromRecord = (record: any): Record<string, number> => {
  const source = record?.minutes || record?.matchMinutes || {};
  const result: Record<string, number> = {};
  Object.keys(source).forEach((key) => {
    const value = toNumber(source[key]);
    if (value !== null) result[String(key)] = value;
  });
  return result;
};

export const PersonalSeasonReport: React.FC<PersonalSeasonReportProps> = ({
  player,
  reports = [],
  competitiveMatches = [],
  competitiveMinutes = [],
  testMatches = [],
  testMinutes = [],
}) => {
  const model = useMemo(() => {
    if (!player) return null;

    const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
    const lastName = String(player.lastName || '').toLowerCase();

    // 1) Einsatzminuten je Spiel zusammenführen (Meisterschaft + Test)
    const allMatches = [...competitiveMatches, ...testMatches]
      .filter(Boolean)
      .map((match: any) => ({ ...match, date: dateKey(match.date) }))
      .sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const minutesRecord =
      [...competitiveMinutes, ...testMinutes].find(
        (record: any) => String(record?.playerId) === String(player.id)
      ) || null;

    const minutesByMatch = totalMinutesFromRecord(minutesRecord);

    const matchesWithMinutes = allMatches.map((match: any) => {
      const key = Object.keys(minutesByMatch).find((k) => k === String(match.id));
      const minutes = key ? minutesByMatch[key] : null;
      return { match, minutes };
    });

    const playedMatches = matchesWithMinutes.filter(
      (entry) => entry.minutes !== null && entry.minutes > 0
    );

    // 2) Heutiges Spiel = letzter Einsatz mit Minuten
    const todayEntry = playedMatches.length > 0 ? playedMatches[playedMatches.length - 1] : null;
    const todayMatch = todayEntry?.match || null;
    const todayMinutes = todayEntry?.minutes ?? null;

    // 3) Berichte des Spielers (nur vorhandene Messwerte zählen)
    const playerReports = (reports || [])
      .filter((report: any) => {
        if (!report) return false;
        if (report.playerId && String(report.playerId) === String(player.id)) return true;
        const name = String(report.playerName || '').toLowerCase();
        return lastName.length > 0 && name.includes(lastName);
      })
      .map((report: any) => ({
        raw: report,
        date: dateKey(report.analysisDate || report.createdAt),
        metrics: report.metrics || {},
      }))
      .sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const todayReport =
      (todayMatch && playerReports.find((r: any) => r.date === todayMatch.date)?.raw) ||
      (playerReports.length > 0 ? playerReports[playerReports.length - 1].raw : null);

    const previousReports = playerReports.filter((r: any) => r.raw !== todayReport);

    // 4) Minuten zu einem Bericht finden (über das Datum)
    const minutesForDate = (date: string): number | null => {
      const entry = matchesWithMinutes.find((item: any) => item.match.date === date);
      return entry?.minutes ?? null;
    };

    const metricsOf = (report: any) => report?.metrics || {};

    const distanceKm = (report: any): number | null => toNumber(metricsOf(report).totalDistanceKm);
    const sprintCount = (report: any): number | null => toNumber(metricsOf(report).sprintCount);
    const highSpeedMeters = (report: any): number | null =>
      toNumber(metricsOf(report).highSpeedDistanceMeters);
    const maxSpeed = (report: any): number | null => toNumber(metricsOf(report).maxSpeedKmh);

    const intensity = (report: any): number | null => {
      const km = distanceKm(report);
      const minutes = minutesForDate(dateKey(report?.analysisDate || report?.createdAt));
      if (km === null || minutes === null || minutes <= 0) return null;
      return (km * 1000) / minutes;
    };

    const average = (values: Array<number | null>): number | null => {
      const usable = values.filter((v): v is number => v !== null);
      if (usable.length === 0) return null;
      return usable.reduce((sum, v) => sum + v, 0) / usable.length;
    };

    const trend = (today: number | null, averageValue: number | null): Trend => {
      if (today === null || averageValue === null || averageValue === 0) return 'none';
      const deviation = ((today - averageValue) / Math.abs(averageValue)) * 100;
      if (Math.abs(deviation) < TREND_THRESHOLD_PERCENT) return 'flat';
      return deviation > 0 ? 'up' : 'down';
    };

    // 5) Saisonwerte (heute zählt genau einmal: bisher + heute)
    const seasonMinutesFromMatches = matchesWithMinutes.reduce(
      (sum, entry) => sum + (entry.minutes && entry.minutes > 0 ? entry.minutes : 0),
      0
    );
    const fallbackSeasonMinutes = toNumber(player.einsatzzeitenGesamt) || 0;
    const seasonMinutesTotal =
      seasonMinutesFromMatches > 0 ? seasonMinutesFromMatches : fallbackSeasonMinutes;
    const minutesBeforeToday =
      todayMinutes !== null ? Math.max(0, seasonMinutesTotal - todayMinutes) : seasonMinutesTotal;

    const manualPlayed = toNumber(minutesRecord?.manualPlayedGames);
    const manualTotal = toNumber(minutesRecord?.manualTotalGames);
    const playedGames = manualPlayed !== null ? manualPlayed : playedMatches.length;
    const totalGames = manualTotal !== null ? manualTotal : allMatches.length;

    // 6) Kumulierte Messwerte
    const cumulativeKm =
      playerReports.reduce((sum: number, entry: any) => sum + (distanceKm(entry.raw) || 0), 0) || null;
    const cumulativeSprints =
      playerReports.reduce((sum: number, entry: any) => sum + (sprintCount(entry.raw) || 0), 0) || null;

    // 7) Saisonrekord Topspeed
    const seasonTopSpeed = playerReports.reduce<number | null>((best: number | null, entry: any) => {
      const value = maxSpeed(entry.raw);
      if (value === null) return best;
      return best === null ? value : Math.max(best, value);
    }, null);

    // 8) Vergleichswerte (Saisonschnitt ohne das heutige Spiel)
    const todayDistance = distanceKm(todayReport);
    const todaySprints = sprintCount(todayReport);
    const todayHighSpeed = highSpeedMeters(todayReport);
    const todayIntensity = intensity(todayReport);
    const todayTopSpeed = maxSpeed(todayReport);

    const averageDistance = average(previousReports.map((r: any) => distanceKm(r.raw)));
    const averageSprints = average(previousReports.map((r: any) => sprintCount(r.raw)));
    const averageHighSpeed = average(previousReports.map((r: any) => highSpeedMeters(r.raw)));
    const averageIntensity = average(previousReports.map((r: any) => intensity(r.raw)));

    // 9) Fehlende Daten sammeln
    const missing: string[] = [];
    if (todayMinutes === null) missing.push('Einsatzminuten des letzten Spiels');
    if (todayReport === null) missing.push('Tracker-Messwerte des letzten Spiels');
    if (previousReports.length === 0) missing.push('Vergleichswerte aus früheren Spielen');
    if (todayDistance === null) missing.push('Laufleistung heute');
    if (todayIntensity === null) missing.push('Intensität heute (m/min)');
    if (todayHighSpeed === null) missing.push('High-Speed-Lauf heute');
    if (todaySprints === null) missing.push('Sprints heute');
    if (todayTopSpeed === null) missing.push('Topspeed heute');

    // 10) Coaching-Feedback – ausschließlich aus vorhandenen Zahlen
    const strengths: string[] = [];
    if (todayMinutes !== null && todayMinutes > 0) {
      strengths.push(`Du hast heute ${formatNumber(todayMinutes, 0)} Minuten auf dem Platz gestanden.`);
    }
    if (todayDistance !== null && averageDistance !== null && todayDistance > averageDistance) {
      strengths.push(
        `Deine Laufleistung lag mit ${formatNumber(todayDistance)} km über deinem Saisonschnitt von ${formatNumber(averageDistance)} km.`
      );
    }
    if (todaySprints !== null && averageSprints !== null && todaySprints > averageSprints) {
      strengths.push(
        `Du hast ${formatNumber(todaySprints, 0)} Sprints gemacht – mehr als in deinem Schnitt (${formatNumber(averageSprints, 0)}).`
      );
    }
    if (todayTopSpeed !== null && seasonTopSpeed !== null && todayTopSpeed >= seasonTopSpeed) {
      strengths.push(
        `Mit ${formatNumber(todayTopSpeed)} km/h hast du deinen Saison-Bestwert erreicht oder gehalten.`
      );
    }
    if (strengths.length === 0) {
      strengths.push('Für heute liegen keine Messwerte vor – dein Einsatz zählt trotzdem.');
    }

    const focus: string[] = [];
    if (todayIntensity !== null && averageIntensity !== null && todayIntensity < averageIntensity) {
      focus.push(
        `Achte im nächsten Spiel auf kurze, explosive Antritte – deine Intensität lag mit ${formatNumber(todayIntensity, 0)} m/min unter deinem Schnitt (${formatNumber(averageIntensity, 0)} m/min).`
      );
    }
    if (todaySprints !== null && averageSprints !== null && todaySprints < averageSprints) {
      focus.push(
        `Nimm dir im nächsten Spiel ein, zwei Sprints mehr vor – dein Schnitt liegt bei ${formatNumber(averageSprints, 0)}.`
      );
    }
    if (todayHighSpeed !== null && averageHighSpeed !== null && todayHighSpeed < averageHighSpeed) {
      focus.push(
        `Halte die hohen Laufanteile stabil – heute ${formatNumber(todayHighSpeed, 0)} m, dein Schnitt ${formatNumber(averageHighSpeed, 0)} m.`
      );
    }
    if (focus.length === 0) {
      focus.push(
        'Bleib bei deinem Aufwärm- und Regenerationsprogramm – so hältst du dein Niveau über die ganze Saison.'
      );
    }

    return {
      playerName,
      todayMatch,
      todayMinutes,
      minutesBeforeToday,
      seasonMinutesTotal,
      playedGames,
      totalGames,
      cumulativeKm,
      cumulativeSprints,
      seasonTopSpeed,
      today: {
        distance: todayDistance,
        intensity: todayIntensity,
        highSpeed: todayHighSpeed,
        sprints: todaySprints,
        topSpeed: todayTopSpeed,
      },
      average: {
        distance: averageDistance,
        intensity: averageIntensity,
        highSpeed: averageHighSpeed,
        sprints: averageSprints,
      },
      trend: {
        distance: trend(todayDistance, averageDistance),
        intensity: trend(todayIntensity, averageIntensity),
        highSpeed: trend(todayHighSpeed, averageHighSpeed),
        sprints: trend(todaySprints, averageSprints),
      },
      strengths: strengths.slice(0, 2),
      focus: focus.slice(0, 2),
      missing: Array.from(new Set(missing)),
    };
  }, [player, reports, competitiveMatches, competitiveMinutes, testMatches, testMinutes]);

  if (!player || !model) {
    return (
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-8 text-center text-[#94A3B8]">
        Kein Spieler ausgewählt.
      </div>
    );
  }

  const TrendIcon: React.FC<{ value: Trend }> = ({ value }) => {
    if (value === 'up') return <ArrowUpRight size={14} className="text-[#10B981]" />;
    if (value === 'down') return <ArrowDownRight size={14} className="text-[#F59E0B]" />;
    if (value === 'flat') return <Minus size={14} className="text-[#94A3B8]" />;
    return <span className="text-[10px] text-[#64748B]">–</span>;
  };

  const rows: Array<{
    label: string;
    today: string;
    average: string;
    trend: Trend;
    icon: React.ReactNode;
  }> = [
    {
      label: 'Laufleistung',
      today: model.today.distance === null ? 'keine Daten' : `${formatNumber(model.today.distance)} km`,
      average: model.average.distance === null ? 'keine Daten' : `${formatNumber(model.average.distance)} km`,
      trend: model.trend.distance,
      icon: <Activity size={14} />,
    },
    {
      label: 'Intensität',
      today:
        model.today.intensity === null
          ? 'keine Daten'
          : `${formatNumber(model.today.intensity, 0)} m/min${
              model.todayMinutes !== null && model.todayMinutes < 10 ? ' (kleine Stichprobe)' : ''
            }`,
      average:
        model.average.intensity === null
          ? 'keine Daten'
          : `${formatNumber(model.average.intensity, 0)} m/min`,
      trend: model.trend.intensity,
      icon: <Timer size={14} />,
    },
    {
      label: 'High-Speed-Lauf',
      today:
        model.today.highSpeed === null
          ? 'keine Daten'
          : `${formatNumber(model.today.highSpeed, 0)} m`,
      average:
        model.average.highSpeed === null
          ? 'keine Daten'
          : `${formatNumber(model.average.highSpeed, 0)} m`,
      trend: model.trend.highSpeed,
      icon: <Zap size={14} />,
    },
    {
      label: 'Sprints (>24 km/h)',
      today:
        model.today.sprints === null ? 'keine Daten' : `${formatNumber(model.today.sprints, 0)}`,
      average:
        model.average.sprints === null ? 'keine Daten' : `${formatNumber(model.average.sprints, 0)}`,
      trend: model.trend.sprints,
      icon: <Zap size={14} />,
    },
    {
      label: 'Topspeed',
      today:
        model.today.topSpeed === null ? 'keine Daten' : `${formatNumber(model.today.topSpeed)} km/h`,
      average:
        model.seasonTopSpeed === null
          ? 'keine Daten'
          : `${formatNumber(model.seasonTopSpeed)} km/h (Saisonrekord)`,
      trend: 'none',
      icon: <TrendIcon value="flat" />,
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Kopf */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06B6D4]">
              Dein persönlicher Spielerbericht
            </p>
            <h2 className="text-xl font-black text-[#F8FAFC] mt-1">
              {model.playerName || 'Spieler'}{' '}
              <span className="text-[#94A3B8] text-base">
                #{player.number ?? player.rückennummer ?? '–'}
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">{player.position || 'Position nicht hinterlegt'}</p>
          </div>
          <div className="text-right text-xs text-[#94A3B8]">
            {model.todayMatch ? (
              <>
                <p className="font-black text-[#F8FAFC] uppercase text-[11px]">
                  {model.todayMatch.opponent || 'Letztes Spiel'}
                </p>
                <p>{model.todayMatch.date || 'Datum nicht hinterlegt'}</p>
              </>
            ) : (
              <p className="italic">Kein Einsatz mit Minuten gefunden</p>
            )}
          </div>
        </div>
      </div>

      {/* Einsatzzeit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black">Einsatzzeit heute</p>
          <p className="text-2xl font-black text-[#F8FAFC] mt-1">
            {model.todayMinutes === null ? 'keine Daten' : `${formatNumber(model.todayMinutes, 0)} Min`}
          </p>
        </div>
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black">
            Saisonspielzeit bis heute
          </p>
          <p className="text-2xl font-black text-[#F8FAFC] mt-1">
            {formatNumber(model.seasonMinutesTotal, 0)} Min
          </p>
          <p className="text-[10px] text-[#64748B] mt-1">
            davort {formatNumber(model.minutesBeforeToday, 0)} Min + heute
          </p>
        </div>
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black">Einsätze</p>
          <p className="text-2xl font-black text-[#F8FAFC] mt-1">
            {formatNumber(model.playedGames, 0)}
            <span className="text-sm text-[#94A3B8]"> / {formatNumber(model.totalGames, 0)} Spielen</span>
          </p>
        </div>
      </div>

      {/* Tabelle */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#334155] flex items-center gap-2">
          <Shield size={14} className="text-[#06B6D4]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
            Heute vs. dein Saisonschnitt
          </h3>
        </div>
        <div className="divide-y divide-[#1E293B]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center"
            >
              <div className="flex items-center gap-2 text-[#94A3B8] text-xs font-bold uppercase tracking-wider">
                {row.icon}
                {row.label}
              </div>
              <div className="text-sm font-black text-[#F8FAFC]">{row.today}</div>
              <div className="text-xs text-[#94A3B8]">{row.average}</div>
              <div className="flex items-center justify-end">
                <TrendIcon value={row.trend} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kumuliert */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black">
            Gesamtdistanz (kumuliert)
          </p>
          <p className="text-lg font-black text-[#F8FAFC] mt-1">
            {model.cumulativeKm === null ? 'keine Daten' : `${formatNumber(model.cumulativeKm)} km`}
          </p>
        </div>
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black">
            Gesamtsprints (kumuliert)
          </p>
          <p className="text-lg font-black text-[#F8FAFC] mt-1">
            {model.cumulativeSprints === null
              ? 'keine Daten'
              : formatNumber(model.cumulativeSprints, 0)}
          </p>
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC] mb-3">
          Dein Coaching-Feedback
        </h3>
        <div className="space-y-3 text-sm text-[#F8FAFC]">
          <p>
            <span className="font-black text-[#10B981]">Was heute stark war: </span>
            {model.strengths.join(' ')}
          </p>
          <p>
            <span className="font-black text-[#F59E0B]">Worauf du im nächsten Spiel achten kannst: </span>
            {model.focus.join(' ')}
          </p>
        </div>
      </div>

      {/* Fehlende Daten */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-black mb-2">
          Fehlende Daten für diesen Bericht
        </p>
        {model.missing.length === 0 ? (
          <p className="text-xs text-[#10B981]">Alle Werte vorhanden.</p>
        ) : (
          <ul className="text-xs text-[#94A3B8] list-disc list-inside space-y-0.5">
            {model.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PersonalSeasonReport;

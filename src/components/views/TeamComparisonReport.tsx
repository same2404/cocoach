import React, { useMemo, useState } from 'react';
import { Users, TrendingUp, Activity, Timer, Zap, Shield } from 'lucide-react';

/**
 * Mannschaftsvergleich – rein lesende Auswertung.
 *
 * Bewusst getrennt vom persönlichen Saisonbericht: Der persönliche Bericht
 * vergleicht nur den Spieler mit sich selbst. Hier werden die Spieler
 * untereinander verglichen. Es werden keine Daten gespeichert oder geändert.
 */

interface TeamComparisonReportProps {
  players?: any[];
  selectedPlayerId?: string;
  reports?: any[];
  competitiveMatches?: any[];
  competitiveMinutes?: any[];
  testMatches?: any[];
  testMinutes?: any[];
}

type SortKey = 'minutes' | 'games' | 'distance' | 'intensity' | 'highSpeed' | 'sprints' | 'topSpeed';

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const format = (value: number | null, digits = 1): string => {
  if (value === null) return '–';
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const dateKey = (value: any): string => String(value || '').slice(0, 10);

const average = (values: Array<number | null>): number | null => {
  const usable = values.filter((v): v is number => v !== null);
  if (usable.length === 0) return null;
  return usable.reduce((sum, v) => sum + v, 0) / usable.length;
};

export const TeamComparisonReport: React.FC<TeamComparisonReportProps> = ({
  players = [],
  selectedPlayerId,
  reports = [],
  competitiveMatches = [],
  competitiveMinutes = [],
  testMatches = [],
  testMinutes = [],
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('minutes');

  const rows = useMemo(() => {
    const squad = (players || []).filter((player: any) => {
      const category = String(player?.category || 'player').toLowerCase();
      return category === 'player' || category === 'spieler';
    });

    const allMatches = [...competitiveMatches, ...testMatches]
      .filter(Boolean)
      .map((match: any) => ({ ...match, date: dateKey(match.date) }));

    const minuteRecords = [...competitiveMinutes, ...testMinutes].filter(Boolean);

    const data = squad.map((player: any) => {
      const lastName = String(player?.lastName || '').toLowerCase();
      const record = minuteRecords.find(
        (item: any) => String(item?.playerId) === String(player?.id)
      );

      const source = record?.minutes || record?.matchMinutes || {};
      const minutesByMatch: Record<string, number> = {};
      Object.keys(source).forEach((key) => {
        const value = toNumber(source[key]);
        if (value !== null) minutesByMatch[String(key)] = value;
      });

      const matchMinutes = allMatches.map((match: any) => minutesByMatch[String(match.id)] ?? null);
      const totalMinutes = matchMinutes.reduce((sum, value) => sum + (value || 0), 0);
      const games = matchMinutes.filter((value) => value !== null && value > 0).length;

      const ownReports = (reports || [])
        .filter((report: any) => {
          if (!report) return false;
          if (report.playerId && String(report.playerId) === String(player?.id)) return true;
          const name = String(report.playerName || '').toLowerCase();
          return lastName.length > 0 && name.includes(lastName);
        })
        .map((report: any) => ({
          date: dateKey(report.analysisDate || report.createdAt),
          metrics: report.metrics || {},
        }));

      const intensityFor = (report: { date: string; metrics: any }): number | null => {
        const km = toNumber(report.metrics.totalDistanceKm);
        const entry = allMatches.find((match: any) => match.date === report.date);
        const minutes = entry ? minutesByMatch[String(entry.id)] ?? null : null;
        if (km === null || minutes === null || minutes <= 0) return null;
        return (km * 1000) / minutes;
      };

      const topSpeeds = ownReports
        .map((report) => toNumber(report.metrics.maxSpeedKmh))
        .filter((value): value is number => value !== null);

      return {
        id: player.id,
        name: `${player.lastName || ''}${player.firstName ? ` (${player.firstName.charAt(0)}.)` : ''}`.trim(),
        number: player.number ?? player.rückennummer ?? null,
        position: player.position || '–',
        minutes: totalMinutes,
        games,
        distance: average(ownReports.map((report) => toNumber(report.metrics.totalDistanceKm))),
        intensity: average(ownReports.map(intensityFor)),
        highSpeed: average(
          ownReports.map((report) => toNumber(report.metrics.highSpeedDistanceMeters))
        ),
        sprints: average(ownReports.map((report) => toNumber(report.metrics.sprintCount))),
        topSpeed: topSpeeds.length > 0 ? Math.max(...topSpeeds) : null,
      };
    });

    return data.sort((a, b) => {
      const pick = (row: typeof a, key: SortKey): number => {
        const value = row[key];
        return value === null ? -1 : (value as number);
      };
      return pick(b, sortKey) - pick(a, sortKey);
    });
  }, [players, reports, competitiveMatches, competitiveMinutes, testMatches, testMinutes, sortKey]);

  const team = useMemo(
    () => ({
      minutes: average(rows.map((row) => row.minutes)),
      games: average(rows.map((row) => row.games)),
      distance: average(rows.map((row) => row.distance)),
      intensity: average(rows.map((row) => row.intensity)),
      highSpeed: average(rows.map((row) => row.highSpeed)),
      sprints: average(rows.map((row) => row.sprints)),
      topSpeed: average(rows.map((row) => row.topSpeed)),
    }),
    [rows]
  );

  const maxMinutes = rows.reduce((max, row) => Math.max(max, row.minutes), 0);

  const columns: Array<{ key: SortKey; label: string; icon: React.ReactNode }> = [
    { key: 'games', label: 'Spiele', icon: <Shield size={12} /> },
    { key: 'minutes', label: 'Minuten', icon: <TrendingUp size={12} /> },
    { key: 'distance', label: 'Ø km', icon: <Activity size={12} /> },
    { key: 'intensity', label: 'Ø m/min', icon: <Timer size={12} /> },
    { key: 'highSpeed', label: 'Ø High-Speed', icon: <Zap size={12} /> },
    { key: 'sprints', label: 'Ø Sprints', icon: <Zap size={12} /> },
    { key: 'topSpeed', label: 'Top km/h', icon: <Activity size={12} /> },
  ];

  if (rows.length === 0) {
    return (
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-8 text-center text-[#94A3B8]">
        Keine Spieler im Kader gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06B6D4]">
            Mannschaftsvergleich
          </p>
          <h2 className="text-lg font-black text-[#F8FAFC] mt-1 flex items-center gap-2">
            <Users size={18} className="text-[#06B6D4]" /> Datenvergleich im Kader
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Sortierung per Klick auf eine Spalte. Werte sind Durchschnitte je Spieler über alle
            erfassten Analysen; Spalten ohne Messwerte zeigen „–“.
          </p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-[#64748B] font-black">
          {rows.length} Spieler
        </div>
      </div>

      <div className="bg-[#121824] border border-[#334155] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 border-b border-[#334155]">#</th>
                <th className="p-3 border-b border-[#334155]">Spieler</th>
                <th className="p-3 border-b border-[#334155]">Position</th>
                {columns.map((column) => (
                  <th key={column.key} className="p-3 border-b border-[#334155] text-center">
                    <button
                      type="button"
                      onClick={() => setSortKey(column.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider font-black transition-colors cursor-pointer ${
                        sortKey === column.key ? 'text-[#06B6D4]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                      title={`Nach ${column.label} sortieren`}
                    >
                      {column.icon}
                      {column.label}
                    </button>
                  </th>
                ))}
                <th className="p-3 border-b border-[#334155] min-w-[120px]">Anteil Minuten</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {rows.map((row, index) => {
                const isSelected = selectedPlayerId && String(row.id) === String(selectedPlayerId);
                const share = maxMinutes > 0 ? (row.minutes / maxMinutes) * 100 : 0;
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#06B6D4]/10 text-[#F8FAFC]' : 'bg-[#121824] text-[#E2E8F0] hover:bg-[#1E293B]'
                    }`}
                  >
                    <td className="p-3 text-[#64748B] font-bold">{index + 1}</td>
                    <td className="p-3 font-black uppercase text-[#F8FAFC] whitespace-nowrap">
                      {row.name}
                      <span className="text-[#64748B] font-bold ml-1">
                        {row.number !== null ? `#${row.number}` : ''}
                      </span>
                      {isSelected && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#06B6D4] text-[#0A0E17] font-black uppercase">
                          Auswahl
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[#94A3B8] whitespace-nowrap">{row.position}</td>
                    <td className="p-3 text-center font-bold">{row.games}</td>
                    <td className="p-3 text-center font-black text-[#06B6D4]">{row.minutes}</td>
                    <td className="p-3 text-center">{format(row.distance)}</td>
                    <td className="p-3 text-center">{format(row.intensity, 0)}</td>
                    <td className="p-3 text-center">{format(row.highSpeed, 0)}</td>
                    <td className="p-3 text-center">{format(row.sprints, 0)}</td>
                    <td className="p-3 text-center">{format(row.topSpeed)}</td>
                    <td className="p-3">
                      <div className="h-2 w-full bg-[#0F172A] rounded-full overflow-hidden border border-[#334155]">
                        <div
                          className="h-full bg-[#06B6D4]"
                          style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0F172A] text-[#94A3B8] font-black uppercase text-[10px] tracking-wider">
                <td className="p-3" colSpan={3}>
                  Mannschaftsschnitt
                </td>
                <td className="p-3 text-center">{format(team.games, 0)}</td>
                <td className="p-3 text-center text-[#06B6D4]">{format(team.minutes, 0)}</td>
                <td className="p-3 text-center">{format(team.distance)}</td>
                <td className="p-3 text-center">{format(team.intensity, 0)}</td>
                <td className="p-3 text-center">{format(team.highSpeed, 0)}</td>
                <td className="p-3 text-center">{format(team.sprints, 0)}</td>
                <td className="p-3 text-center">{format(team.topSpeed)}</td>
                <td className="p-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-[#64748B] px-1">
        Hinweis: Der persönliche Saisonbericht bleibt bewusst ohne Mitspieler-Vergleich. Dieser
        Vergleich ist eine separate, rein lesende Ansicht.
      </p>
    </div>
  );
};

export default TeamComparisonReport;

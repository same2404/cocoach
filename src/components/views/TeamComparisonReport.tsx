import React, { useMemo, useRef, useState } from 'react';
import { Users, TrendingUp, Activity, Timer, Zap, Shield, Printer, CheckCircle2 } from 'lucide-react';

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
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

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

  /**
   * PDF-Export über den System-Druckdialog.
   * Bewusst ohne Canvas-Rasterung: Die Tabelle wird als echte, druckbare
   * HTML-Tabelle übergeben – dadurch bleiben alle Werte scharf und der Export
   * bleibt auch bei vielen Spielern sofort reaktionsfähig.
   * Es werden ausschließlich bereits vorhandene Werte ausgegeben.
   */
  const handleExportPDF = () => {
    const printNode = printAreaRef.current;
    if (!printNode) return;

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      setPrintMessage('Bitte Pop-ups erlauben – dann öffnet sich der Druckdialog.');
      return;
    }

    // Stylesheet-Links müssen absolut sein: Im neuen Druckfenster (about:blank)
    // würde ein relatives "./assets/....css" sonst nicht geladen.
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => {
        if (el instanceof HTMLLinkElement) {
          const link = el.cloneNode(false) as HTMLLinkElement;
          const href = el.getAttribute('href') || document.baseURI;
          link.href = new URL(href, document.baseURI).href;
          return link.outerHTML;
        }
        return el.outerHTML;
      })
      .join('\n');
    const sortLabel = columns.find((column) => column.key === sortKey)?.label || 'Minuten';
    const createdAt = new Date().toLocaleString('de-DE');

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Teamvergleich FC Auggen</title>
${styles}
<style>
  @page { size: A4 landscape; margin: 8mm; }
  html, body { background: #ffffff !important; margin: 0; padding: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #0f172a !important; }
  button, [data-print-hide] { display: none !important; }
  [data-print-only] { display: inline !important; }
  .rounded-2xl { border-radius: 0 !important; }
  .shadow-2xl, .shadow-lg { box-shadow: none !important; }
  .print-head { font-family: Arial, sans-serif; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
  .print-head h1 { font-size: 16px; margin: 0 0 2px 0; color: #0f172a !important; }
  .print-head p { font-size: 10px; margin: 0; color: #334155 !important; }
  table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
  th, td { border: 1px solid #cbd5e1 !important; padding: 4px 5px !important; }
  th, td, th *, td * { color: #0f172a !important; }
  thead tr { background: #e2e8f0 !important; }
  tbody tr { background: #ffffff !important; }
  tfoot tr { background: #f1f5f9 !important; }
  tr { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="print-head">
    <h1>Teamvergleich – FC Auggen</h1>
    <p>Sortiert nach: ${sortLabel} &nbsp;|&nbsp; ${rows.length} Spieler &nbsp;|&nbsp; Erstellt: ${createdAt}</p>
  </div>
  ${printNode.outerHTML}
</body>
</html>`);
    printWindow.document.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        printWindow.focus();
        printWindow.print();
        setPrintMessage('Druckdialog geöffnet – dort „Als PDF speichern“ wählen.');
      } catch (err) {
        console.error('PDF print error:', err);
        setPrintMessage('Druckdialog konnte nicht geöffnet werden. Bitte Strg+P nutzen.');
      }
    };

    printWindow.onload = () => window.setTimeout(triggerPrint, 300);
    // Fallback: auch wenn onload nicht feuert, öffnet sich der Druckdialog.
    window.setTimeout(triggerPrint, 1200);
  };

  if (rows.length === 0) {
    return (
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-8 text-center text-[#94A3B8]">
        Keine Spieler im Kader gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {printMessage && (
        <div data-print-hide className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg">
          <CheckCircle2 size={16} />
          <span>{printMessage}</span>
        </div>
      )}
      <div ref={printAreaRef} className="space-y-5">
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
        <div className="flex items-center gap-3">
          <div className="text-right text-[10px] uppercase tracking-wider text-[#64748B] font-black">
            {rows.length} Spieler
          </div>
          <button
            type="button"
            data-print-hide="true"
            onClick={handleExportPDF}
            title="Teamvergleich als PDF speichern oder drucken"
            className="flex items-center gap-2 bg-[#06B6D4] hover:bg-[#0891B2] text-[#0A0E17] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.35)]"
          >
            <Printer size={16} />
            <span>PDF / Drucken</span>
          </button>
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
                      data-print-hide="true"
                      onClick={() => setSortKey(column.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider font-black transition-colors cursor-pointer ${
                        sortKey === column.key ? 'text-[#06B6D4]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                      title={`Nach ${column.label} sortieren`}
                    >
                      {column.icon}
                      {column.label}
                    </button>
                    <span data-print-only className="hidden">{column.label}</span>
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
    </div>
  );
};

export default TeamComparisonReport;

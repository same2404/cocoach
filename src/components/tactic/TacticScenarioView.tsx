/**
 * TacticScenarioView — Wiederverwendbarer 1:1-Taktik-Renderer (SVG)
 *
 * Rendert ein TacticScenario (aus tacticScenarios.ts) exakt nach der Vorgabe:
 *   - volles Spielfeld ('full') oder eine Spielfeldhälfte ('half')
 *   - Spieler als farbige Punkte mit Nummer (own=Blau, opp=Rot, gk=Grün)
 *   - Zonen als rotierte Ellipsen/Rechtecke mit Label
 *   - Lauf-/Pass-Pfeile (durchgezogen = Ball/Pass, gestrichelt = Lauf)
 *
 * Koordinatenraum 0-100 in X und Y. Wird von der Taktiktafel UND der
 * Präsentation verwendet (eine gemeinsame Quelle).
 *
 * `editable`: Zonen und Spieler können frei gezogen werden, Zonen können
 * hinzugefügt (Farbe wählbar) und per Doppelklick gelöscht werden. Die
 * Bearbeitung ist kontrolliert (draftZones/draftPlayers + onDraftChange),
 * damit der Editor die Änderungen pro Slide persistieren kann.
 */
import React, { useRef, useState } from 'react';
import { TacticScenario, ScenarioZone, ScenarioArrow, ScenarioPlayer } from '../../lib/tacticScenarios';

const S = 1000; // viewBox-Größe (1000 x 1000)

const TEAM_COLORS: Record<string, string> = {
  own: '#3B82F6',
  opp: '#EF4444',
  gk: '#22C55E',
};

export const EDIT_ZONE_COLORS = [
  { color: '#FACC15', name: 'Gelb' },
  { color: '#EF4444', name: 'Rot' },
  { color: '#3B82F6', name: 'Blau' },
  { color: '#22C55E', name: 'Grün' },
  { color: '#F97316', name: 'Orange' },
  { color: '#A855F7', name: 'Lila' },
];

/* ═════════════ Spielfeld-Grundgerüst ═════════════ */

function FullPitch() {
  return (
    <g>
      <rect x="10" y="10" width="980" height="980" fill="none" stroke="#10B981" strokeWidth="6" opacity="0.55" rx="6" />
      {/* Mittellinie + Kreis */}
      <line x1="10" y1="500" x2="990" y2="500" stroke="#10B981" strokeWidth="4" opacity="0.4" />
      <circle cx="500" cy="500" r="100" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.4" />
      <circle cx="500" cy="500" r="8" fill="#10B981" opacity="0.5" />
      {/* Oberer Strafraum (gegnerisches Tor oben) */}
      <rect x="350" y="10" width="300" height="200" fill="none" stroke="#10B981" strokeWidth="5" opacity="0.5" />
      <rect x="420" y="10" width="160" height="90" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.45" />
      {/* Unterer Strafraum (eigenes Tor unten) */}
      <rect x="350" y="790" width="300" height="200" fill="none" stroke="#10B981" strokeWidth="5" opacity="0.5" />
      <rect x="420" y="900" width="160" height="90" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.45" />
      {/* Eckbögen */}
      <path d="M 10 10 A 30 30 0 0 1 40 10" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
      <path d="M 990 10 A 30 30 0 0 0 960 10" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
      <path d="M 10 990 A 30 30 0 0 0 40 990" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
      <path d="M 990 990 A 30 30 0 0 1 960 990" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
    </g>
  );
}

function HalfPitch() {
  // Eine Spielfeldhälfte: Y=0 = angegriffene Torlinie (oben), Y=100 = Mittellinie (unten)
  return (
    <g>
      <rect x="10" y="10" width="980" height="980" fill="none" stroke="#10B981" strokeWidth="6" opacity="0.55" rx="6" />
      {/* Torlinie oben (angegriffen) */}
      <line x1="10" y1="10" x2="990" y2="10" stroke="#10B981" strokeWidth="6" opacity="0.6" />
      {/* Mittellinie unten */}
      <line x1="10" y1="990" x2="990" y2="990" stroke="#10B981" strokeWidth="5" opacity="0.55" />
      {/* Strafraum + Fünfmeterraum oben */}
      <rect x="250" y="10" width="500" height="220" fill="none" stroke="#10B981" strokeWidth="5" opacity="0.5" />
      <rect x="350" y="10" width="300" height="85" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.45" />
      {/* Torlinien-Tor */}
      <rect x="420" y="2" width="160" height="16" fill="#10B981" opacity="0.7" />
      {/* Eckbögen oben */}
      <path d="M 10 10 A 35 35 0 0 1 45 10" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
      <path d="M 990 10 A 35 35 0 0 0 955 10" fill="none" stroke="#10B981" strokeWidth="4" opacity="0.5" />
    </g>
  );
}

/* ═════════════ Spieler, Zonen, Pfeile ═════════════ */

const pct = (v: number) => (v / 100) * S;

const ZONE_STROKE = 'rgba(255,255,255,0.6)';

function ZoneShape({ zone }: { zone: ScenarioZone }) {
  const cx = pct(zone.cx);
  const cy = pct(zone.cy);
  const rx = pct(zone.rx);
  const ry = pct(zone.ry);
  const angle = zone.angle ?? 0;
  const transform = angle ? `rotate(${angle} ${cx} ${cy})` : undefined;
  if (zone.shape === 'rect') {
    return (
      <rect
        x={cx - rx}
        y={cy - ry}
        width={rx * 2}
        height={ry * 2}
        fill={zone.color}
        stroke={ZONE_STROKE}
        strokeWidth="3"
        strokeDasharray="10 7"
        rx="10"
        transform={transform}
        opacity="0.9"
      />
    );
  }
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={zone.color}
      stroke={ZONE_STROKE}
      strokeWidth="3"
      strokeDasharray="10 7"
      transform={transform}
      opacity="0.9"
    />
  );
}

function makeArrowMarkerId(a: ScenarioArrow, i: number) {
  return `ts-arrow-${i}-${(a.color || '#94a3b8').replace(/[^a-zA-Z0-9]/g, '')}`;
}

function Arrow({ arrow, idx }: { arrow: ScenarioArrow; idx: number }) {
  const x1 = pct(arrow.from[0]);
  const y1 = pct(arrow.from[1]);
  const x2 = pct(arrow.to[0]);
  const y2 = pct(arrow.to[1]);
  const color = arrow.color || '#94A3B8';
  // Verkürze Linie geringfügig am Ende, damit die Pfeilspitze nicht am Punkt liegt
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ex = x2 - (dx / len) * 12;
  const ey = y2 - (dy / len) * 12;
  const solid = arrow.style !== 'dashed';
  const id = makeArrowMarkerId(arrow, idx);
  return (
    <g>
      <defs>
        <marker id={id} markerWidth="11" markerHeight="11" refX="9" refY="5.5" orient="auto">
          <polygon points="0 0, 11 5.5, 0 11" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth="6"
        strokeDasharray={solid ? 'none' : '14 12'}
        markerEnd={`url(#${id})`}
        strokeLinecap="round"
      />
    </g>
  );
}

function Player({ num, x, y, team, pos }: { num: string; x: number; y: number; team: string; pos?: string }) {
  const cx = pct(x);
  const cy = pct(y);
  const fill = TEAM_COLORS[team] || '#64748B';
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r="26" fill={fill} stroke="#ffffff" strokeWidth="5" opacity="0.95" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="24"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
      >
        {num}
      </text>
      {pos && (
        <text
          y="44"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="17"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {pos}
        </text>
      )}
    </g>
  );
}

/* ═════════════ Haupt-Komponente ═════════════ */

interface Props {
  scenario: TacticScenario;
  className?: string;
  /** Animations-Läufe hervorheben (Kinder-/TV-Modus) */
  highlightArrows?: boolean;
  /** Editier-Modus aktivieren: Zonen & Spieler ziehen, Zonen adden/löschen */
  editable?: boolean;
  /** Extern verwaltete (persistierte) Zonen-Änderungen — sonst Original aus Szenario */
  draftZones?: ScenarioZone[];
  /** Extern verwaltete (persistierte) Spieler-Positionen — sonst Original aus Szenario */
  draftPlayers?: ScenarioPlayer[];
  /** Wird bei jeder Änderung der Drafts aufgerufen (kontrollierte Komponente) */
  onDraftChange?: (zones: ScenarioZone[], players: ScenarioPlayer[]) => void;
}

type DragTarget = { kind: 'zone' | 'player'; index: number } | null;

export function TacticScenarioView({
  scenario,
  className,
  highlightArrows,
  editable,
  draftZones,
  draftPlayers,
  onDraftChange,
}: Props) {
  const horizontal = scenario.view === 'half' && scenario.orientation === 'horizontal';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragTarget>(null);
  const [zoneColor, setZoneColor] = useState<string>(EDIT_ZONE_COLORS[0].color);

  const zones = draftZones ?? scenario.zones;
  const players = draftPlayers ?? scenario.players;

  const commit = (nextZones: ScenarioZone[], nextPlayers: ScenarioPlayer[]) => {
    if (onDraftChange) onDraftChange(nextZones, nextPlayers);
  };

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / S;
    const ox = (rect.width - S * scale) / 2;
    const oy = (rect.height - S * scale) / 2;
    const cx = e.clientX - rect.left - ox;
    const cy = e.clientY - rect.top - oy;
    return {
      x: Math.max(2, Math.min(98, (cx / (S * scale || 1)) * 100)),
      y: Math.max(2, Math.min(98, (cy / (S * scale || 1)) * 100)),
    };
  };

  const onPointerDownPlayer = (e: React.PointerEvent, i: number) => {
    if (!editable) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'player', index: i });
  };

  const onPointerDownZone = (e: React.PointerEvent, i: number) => {
    if (!editable) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'zone', index: i });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editable || !drag) return;
    const { x, y } = toCanvas(e);
    if (drag.kind === 'zone') {
      const next = zones.map((z, i) => (i === drag.index ? { ...z, cx: x, cy: y } : z));
      commit(next, players);
    } else {
      const next = players.map((p, i) => (i === drag.index ? { ...p, x, y } : p));
      commit(zones, next);
    }
  };

  const onPointerUp = () => setDrag(null);

  const addZone = () => {
    const label = `Zone ${zones.length + 1}`;
    commit([...zones, { cx: 50, cy: 35, rx: 15, ry: 9, angle: 0, color: zoneColor, label, shape: 'ellipse' }], players);
  };

  const deleteZone = (i: number) => {
    commit(zones.filter((_, zi) => zi !== i), players);
  };

  const zoneShapeTransform = (z: ScenarioZone, editableZone: boolean) => {
    const cx = pct(z.cx);
    const cy = pct(z.cy);
    const rot = z.angle ? `rotate(${z.angle} ${cx} ${cy})` : '';
    const ring = editableZone ? ' brightness(1.25)' : '';
    return {
      transform: `${rot}${ring}`,
    };
  };

  return (
    <div className="relative">
      {editable && (
        <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span className="bg-slate-950/90 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow pointer-events-auto">
            ✍️ Ziehen & Zonen setzen
          </span>
          {(editable && (
            <div className="flex items-center gap-1 bg-slate-950/90 border border-amber-400/40 rounded-lg px-1.5 py-1 pointer-events-auto">
              {EDIT_ZONE_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setZoneColor(c.color)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${zoneColor === c.color ? 'border-white scale-110' : 'border-slate-600 hover:scale-110'}`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          ))}
          <button
            type="button"
            title="Neue Zone hinzufügen"
            onClick={addZone}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] uppercase px-2 py-1 rounded-lg shadow pointer-events-auto cursor-pointer flex items-center gap-1"
          >
            + Zone
          </button>
          <span className="bg-slate-950/90 border border-slate-700 text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg shadow pointer-events-auto">
            Zonen & Spieler frei ziehen · Doppelklick auf Zone = löschen
          </span>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${S} ${S}`}
        className={className || 'w-full h-full'}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'linear-gradient(180deg,#063826 0%,#031e15 100%)' }}
        onPointerMove={editable ? onPointerMove : undefined}
        onPointerUp={editable ? onPointerUp : undefined}
        onPointerLeave={editable ? onPointerUp : undefined}
      >
        {/* Rasenstreifen */}
        <defs>
          <pattern id="ts-grass" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="transparent" />
          </pattern>
        </defs>
        <g opacity="0.06">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={i * (S / 12)} y="0" width={S / 24} height={S} fill="#16a34a" />
          ))}
        </g>

        <g transform={horizontal ? 'rotate(-90 500 500)' : undefined}>
          {scenario.view === 'half' ? <HalfPitch /> : <FullPitch />}

          {/* Pfeile unter den Spielern */}
          {scenario.arrows.map((a, i) => (
            <Arrow key={i} arrow={a} idx={i} />
          ))}

          {/* Zonen */}
          {zones.map((z, i) => (
            <g key={i} onPointerDown={editable ? (e) => onPointerDownZone(e, i) : undefined} onDoubleClick={editable ? (e) => { e.stopPropagation(); deleteZone(i); } : undefined}>
              <ZoneShape zone={z} />
              {editable && (
                <circle cx={pct(z.cx)} cy={pct(z.cy)} r="46" fill="transparent" style={{ ...zoneShapeTransform(z, true), cursor: 'grab' }} />
              )}
            </g>
          ))}

          {/* Zonen-Labels */}
          {zones.map((z, i) =>
            z.label ? (
              <text
                key={`l${i}`}
                x={pct(z.cx)}
                y={pct(z.cy)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="24"
                fontWeight="900"
                fontFamily="Inter, sans-serif"
                opacity="0.95"
                transform={z.angle ? `rotate(${z.angle} ${pct(z.cx)} ${pct(z.cy)})` : undefined}
                style={editable ? { pointerEvents: 'none' } : undefined}
              >
                {z.label}
              </text>
            ) : null,
          )}

          {/* Spieler */}
          {players.map((p, i) => (
            <g
              key={i}
              onPointerDown={editable ? (e) => onPointerDownPlayer(e, i) : undefined}
              style={editable ? { cursor: 'grab' } : undefined}
            >
              <Player num={p.num} x={p.x} y={p.y} team={p.team} pos={p.pos} />
            </g>
          ))}
        </g>

        {(scenario.note || highlightArrows) && (
          <text
            x={S / 2}
            y={S - 24}
            textAnchor="middle"
            fill="#86efac"
            fontSize="22"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {scenario.note || ''}
          </text>
        )}
      </svg>
    </div>
  );
}

export default TacticScenarioView;
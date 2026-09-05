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
 */
import React from 'react';
import { TacticScenario, ScenarioZone, ScenarioArrow } from '../../lib/tacticScenarios';

const S = 1000; // viewBox-Größe (1000 x 1000)

const TEAM_COLORS: Record<string, string> = {
  own: '#3B82F6',
  opp: '#EF4444',
  gk: '#22C55E',
};

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

const ZONE_STROKE = 'rgba(255,255,255,0.6)';

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
}

export function TacticScenarioView({ scenario, className, highlightArrows }: Props) {
  const horizontal = scenario.view === 'half' && scenario.orientation === 'horizontal';
  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      className={className || 'w-full h-full'}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: 'linear-gradient(180deg,#063826 0%,#031e15 100%)' }}
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
        {scenario.zones.map((z, i) => (
          <ZoneShape key={i} zone={z} />
        ))}

        {/* Zonen-Labels */}
        {scenario.zones.map((z, i) =>
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
            >
              {z.label}
            </text>
          ) : null,
        )}

        {/* Spieler */}
        {scenario.players.map((p, i) => (
          <Player key={i} num={p.num} x={p.x} y={p.y} team={p.team} pos={p.pos} />
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
  );
}

export default TacticScenarioView;

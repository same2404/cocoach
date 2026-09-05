import React, { useRef, useCallback } from 'react';
import { Download, Image, FileText } from 'lucide-react';

interface Player {
  x: number;
  y: number;
  number: string;
  name: string;
  color: string;
}

interface RunPath {
  x1: number; y1: number; x2: number; y2: number; color: string;
}

interface Zone {
  x: number; y: number; w: number; h: number; color: string;
}

interface TacticalDiagramProps {
  title: string;
  subtitle?: string;
  players: Player[];
  runPaths?: RunPath[];
  zones?: Zone[];
  ballPath?: { x: number; y: number }[];
  ballPosition?: { x: number; y: number };
  clubName?: string;
  formation?: string;
  notes?: string;
  width?: number;
  height?: number;
  showOpponent?: boolean;
  opponentPlayers?: Player[];
}

export const TacticalPitch: React.FC<TacticalDiagramProps> = ({
  title,
  subtitle,
  players,
  runPaths = [],
  zones = [],
  ballPath = [],
  ballPosition,
  clubName = '',
  formation = '',
  notes = '',
  width = 500,
  height = 350,
  showOpponent = false,
  opponentPlayers = [],
}) => {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: '#063826', borderRadius: '12px' }}
    >
      {/* Pitch markings */}
      <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.4" rx="4" />
      <circle cx={width / 2} cy={height / 2} r="40" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.25" />
      <circle cx={width / 2} cy={height / 2} r="2" fill="#10B981" opacity="0.4" />

      {/* Penalty areas */}
      <rect x={width / 2 - 60} y="10" width="120" height="60" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.3" />
      <rect x={width / 2 - 35} y="10" width="70" height="25" fill="none" stroke="#10B981" strokeWidth="0.8" opacity="0.25" />
      <rect x={width / 2 - 60} y={height - 70} width="120" height="60" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.3" />
      <rect x={width / 2 - 35} y={height - 35} width="70" height="25" fill="none" stroke="#10B981" strokeWidth="0.8" opacity="0.25" />

      {/* Goals */}
      <rect x={width / 2 - 25} y="5" width="50" height="6" fill="none" stroke="#10B981" strokeWidth="1.2" opacity="0.5" rx="1" />
      <rect x={width / 2 - 25} y={height - 11} width="50" height="6" fill="none" stroke="#10B981" strokeWidth="1.2" opacity="0.5" rx="1" />

      {/* Center spot */}
      <line x1="10" y1={height / 2} x2={width - 10} y2={height / 2} stroke="#10B981" strokeWidth="1" opacity="0.2" strokeDasharray="4 4" />

      {/* Zones */}
      {zones.map((zone, i) => (
        <rect key={`z-${i}`} x={zone.x} y={zone.y} width={zone.w} height={zone.h}
          fill={zone.color} opacity="0.3" rx="4" stroke={zone.color} strokeWidth="1" strokeOpacity="0.5" />
      ))}

      {/* Run paths */}
      {runPaths.map((path, i) => (
        <g key={`r-${i}`}>
          <defs>
            <marker id={`dg-arrow-${i}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={path.color} />
            </marker>
          </defs>
          <line x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}
            stroke={path.color} strokeWidth="2" strokeDasharray="5 3"
            markerEnd={`url(#dg-arrow-${i})`} opacity="0.85" />
        </g>
      ))}

      {/* Ball path */}
      {ballPath.length > 1 && (
        <g>
          <defs>
            <marker id="dg-ball-arrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill="#F97316" />
            </marker>
          </defs>
          {ballPath.slice(1).map((pt, i) => (
            <line key={`bp-${i}`}
              x1={ballPath[i].x} y1={ballPath[i].y} x2={pt.x} y2={pt.y}
              stroke="#F97316" strokeWidth="2" strokeDasharray="3 2"
              markerEnd="url(#dg-ball-arrow)" opacity="0.9" />
          ))}
        </g>
      )}

      {/* Ball position */}
      {ballPosition && (
        <g>
          <circle cx={ballPosition.x} cy={ballPosition.y} r="6" fill="#F97316" opacity="0.9">
            <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x={ballPosition.x + 9} y={ballPosition.y + 4} fill="#F97316" fontSize="8" fontWeight="bold">⚽</text>
        </g>
      )}

      {/* Opponent players */}
      {showOpponent && opponentPlayers.map((p, i) => (
        <g key={`opp-${i}`}>
          <circle cx={p.x} cy={p.y} r="12" fill="#334155" opacity="0.8" stroke="#64748B" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fill="#CBD5E1" fontSize="10" fontWeight="black">{p.number}</text>
        </g>
      ))}

      {/* Own players */}
      {players.map((p, i) => (
        <g key={`p-${i}`}>
          <circle cx={p.x} cy={p.y} r="13" fill={p.color || '#e94560'} opacity="0.95" stroke="white" strokeWidth="2" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="black">{p.number || i + 1}</text>
          {p.name && (
            <text x={p.x} y={p.y + 25} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" opacity="0.8">{p.name}</text>
          )}
        </g>
      ))}

      {/* Title bar */}
      <rect x="0" y="0" width={width} height="24" fill="#0a0f1a" opacity="0.85" />
      <text x="12" y="16" fill="white" fontSize="10" fontWeight="black" fontFamily="Arial, sans-serif">{title}</text>
      {formation && <text x={width - 12} y="16" textAnchor="end" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">{formation}</text>}

      {/* Footer */}
      <rect x="0" y={height - 20} width={width} height="20" fill="#0a0f1a" opacity="0.85" />
      <text x="12" y={height - 7} fill="#64748B" fontSize="7" fontFamily="Arial, sans-serif">{clubName} • CoCoach Tactical</text>
      {subtitle && <text x={width - 12} y={height - 7} textAnchor="end" fill="#64748B" fontSize="7" fontFamily="Arial, sans-serif">{subtitle}</text>}

      {/* Notes */}
      {notes && (
        <g>
          <text x="12" y={height - 28} fill="white" fontSize="7" fontFamily="Arial, sans-serif" opacity="0.6">{notes}</text>
        </g>
      )}
    </svg>
  );
};

export const exportSvgAsPng = (svgElement: SVGSVGElement, filename: string = 'tactical-diagram.png') => {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new window.Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    ctx?.scale(2, 2);
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    a.click();
  };
  img.src = url;
};

export const exportSvgAsFile = (svgElement: SVGSVGElement, filename: string = 'tactical-diagram.svg') => {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

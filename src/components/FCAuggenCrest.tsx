import React from 'react';

interface FCAuggenCrestProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  layout?: 'icon' | 'horizontal';
  mode?: 'photo' | 'crest';
}

export const FCAuggenCrest: React.FC<FCAuggenCrestProps> = ({ 
  className = '', 
  size = 64,
  showText = false,
  layout = 'icon',
  mode = 'photo'
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 64;

  if (mode === 'photo') {
    return (
      <div className={`inline-flex ${layout === 'horizontal' ? 'flex-row items-center gap-3' : 'flex-col items-center justify-center'} ${className}`}>
        <svg 
          width={numericSize * 1.3} 
          height={numericSize} 
          viewBox="0 0 320 220" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="rounded-xl shadow-lg border border-slate-700/80 transition-transform hover:scale-105 duration-200 overflow-hidden"
        >
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="40%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="grassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="30%" stopColor="#22C55E" />
              <stop offset="70%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>
            <linearGradient id="redJersey" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Background: Sky and Pitch */}
          <rect x="0" y="0" width="320" height="90" fill="url(#skyGrad)" />
          {/* Background Clubhouse / Fence Outline */}
          <rect x="10" y="25" width="120" height="40" fill="#64748B" opacity="0.6" rx="2" />
          <polygon points="10,25 70,10 130,25" fill="#475569" opacity="0.6" />
          <rect x="150" y="15" width="80" height="50" fill="#94A3B8" opacity="0.5" rx="3" />
          {/* Pitch Fence */}
          <line x1="0" y1="85" x2="320" y2="85" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />

          {/* Green Grass Pitch */}
          <rect x="0" y="85" width="320" height="135" fill="url(#grassGrad)" />
          {/* Grass Field Stripes */}
          <rect x="0" y="105" width="320" height="20" fill="#16A34A" opacity="0.3" />
          <rect x="0" y="145" width="320" height="25" fill="#16A34A" opacity="0.3" />
          <rect x="0" y="190" width="320" height="30" fill="#15803D" opacity="0.4" />

          {/* ---------------- FC AUGGEN TEAM HUDDLE PLAYERS ---------------- */}

          {/* Player #13 (Left) */}
          <g>
            <path d="M 85 130 Q 75 160 82 190 L 92 190 Q 90 165 95 135 Z" fill="#DC2626" />
            <path d="M 78 125 L 105 130 L 100 165 L 75 160 Z" fill="url(#redJersey)" />
            <text x="88" y="152" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">13</text>
            <circle cx="90" cy="112" r="9" fill="#FCA5A5" />
          </g>

          {/* Player #5 (Back Left) */}
          <g>
            <path d="M 120 100 L 140 102 L 138 135 L 115 132 Z" fill="url(#redJersey)" />
            <text x="125" y="122" fill="#FFFFFF" fontSize="14" fontWeight="900" fontFamily="sans-serif">5</text>
            <circle cx="128" cy="88" r="8" fill="#FCA5A5" />
          </g>

          {/* Player #18 (Center Back - Focal Point) */}
          <g>
            <path d="M 145 92 L 175 92 L 172 138 L 142 138 Z" fill="url(#redJersey)" stroke="#B91C1C" strokeWidth="1" />
            <text x="150" y="120" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="sans-serif">18</text>
            {/* FC AUGGEN Text on Jersey */}
            <text x="146" y="102" fill="#FFFFFF" fontSize="6" fontWeight="800" letterSpacing="0.5">FC AUGGEN</text>
            <circle cx="158" cy="80" r="10" fill="#475569" /> {/* Dark Hair */}
            {/* White Shorts & Red Socks */}
            <rect x="143" y="138" width="14" height="20" fill="#FFFFFF" />
            <rect x="160" y="138" width="14" height="20" fill="#FFFFFF" />
            <rect x="145" y="158" width="10" height="25" fill="#DC2626" />
            <rect x="162" y="158" width="10" height="25" fill="#DC2626" />
          </g>

          {/* Player #22 (Right Back - Focal Point) */}
          <g>
            <path d="M 195 90 L 230 100 L 222 142 L 188 135 Z" fill="url(#redJersey)" stroke="#B91C1C" strokeWidth="1" />
            <text x="200" y="122" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="sans-serif">22</text>
            <text x="198" y="102" fill="#FFFFFF" fontSize="6" fontWeight="800">FC</text>
            <circle cx="210" cy="76" r="10" fill="#FDE047" /> {/* Blonde Hair */}
            {/* White Shorts & Red Socks */}
            <rect x="190" y="135" width="15" height="20" fill="#FFFFFF" />
            <rect x="208" y="138" width="15" height="20" fill="#FFFFFF" />
            <rect x="192" y="155" width="11" height="28" fill="#DC2626" />
            <rect x="210" y="158" width="11" height="28" fill="#DC2626" />
          </g>

          {/* Goalkeeper in Blue/Green (Center Inside Huddle) */}
          <circle cx="178" cy="95" r="9" fill="#1E293B" />
          <rect x="172" y="104" width="12" height="25" fill="#0284C7" />

          {/* Player Right Side (#12 / Forward) */}
          <g>
            <path d="M 235 110 L 255 120 L 245 155 L 225 145 Z" fill="url(#redJersey)" />
            <circle cx="242" cy="98" r="8" fill="#FCA5A5" />
            <rect x="230" y="145" width="18" height="15" fill="#FFFFFF" />
            <rect x="232" y="160" width="10" height="25" fill="#DC2626" />
          </g>

          {/* Arms Over Shoulders Connecting Huddle Circle */}
          <path d="M 90 128 Q 120 110 148 108" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
          <path d="M 148 102 Q 180 98 205 102" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
          <path d="M 205 102 Q 230 110 242 120" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />

          {/* FC AUGGEN Overlay Badge Banner at Bottom */}
          <rect x="0" y="185" width="320" height="35" fill="rgba(15, 23, 42, 0.85)" />
          <text x="160" y="208" fill="#FFFFFF" fontSize="14" fontWeight="900" fontFamily="sans-serif" letterSpacing="3" textAnchor="middle">
            FC AUGGEN MANNSCHAFT
          </text>
        </svg>

        {(showText || layout === 'horizontal') && (
          <div className={layout === 'horizontal' ? 'flex flex-col text-left' : 'mt-1 text-center'}>
            <span className="font-black italic uppercase tracking-wider text-sm md:text-base text-slate-900 dark:text-white">
              FC AUGGEN
            </span>
            {showText && (
              <span className="font-bold uppercase tracking-widest text-[9px] text-slate-500 block -mt-0.5">
                Team-Foto 2026/27
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Crest Mode
  return (
    <div className={`inline-flex ${layout === 'horizontal' ? 'flex-row items-center gap-3' : 'flex-col items-center justify-center'} ${className}`}>
      <svg 
        width={numericSize} 
        height={numericSize} 
        viewBox="0 0 200 230" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md transition-transform hover:scale-105 duration-200"
      >
        {/* Arched Top Text: FC AUGGEN */}
        <path id="crestArchTextPath" d="M 30 38 Q 100 12 170 38" fill="none" />
        <text fill="#000000" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
          <textPath href="#crestArchTextPath" startOffset="50%" textAnchor="middle">
            FC AUGGEN
          </textPath>
        </text>

        {/* Shield Background / Base (Clean White) */}
        <path 
          d="M 38 48 C 38 48, 100 38, 162 48 C 165 115 152 175 100 216 C 48 175 35 115 38 48 Z" 
          fill="#FFFFFF"
        />

        {/* Top-Left Black Horizontal Curved Bars ('F' Stripes) */}
        <path 
          d="M 38 52 C 55 45 78 43 85 46 C 85 46 83 60 76 61 C 62 58 48 60 39 67 Z" 
          fill="#000000" 
        />
        <path 
          d="M 39 74 C 52 68 68 67 72 70 C 72 70 70 82 65 83 C 54 80 44 82 39 90 Z" 
          fill="#000000" 
        />

        {/* Bottom-Left Curved Outline Stripes (Black Outer, Red Inner) */}
        <path 
          d="M 42 118 C 40 152 56 182 98 214 C 92 206 32 170 36 122 Z" 
          fill="#000000" 
        />
        <path 
          d="M 50 118 C 48 148 64 176 100 204 C 95 198 42 165 44 122 Z" 
          fill="#E21B4D" 
        />

        {/* Center Grape Cluster (Weintraube - Auggen Symbol) */}
        <g fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path 
            d="M 100 68 C 92 56 100 46 108 46 C 114 54 108 64 100 68 Z" 
            fill="#000000" 
          />
          <path d="M 100 68 C 98 74 96 78 96 82" strokeWidth="2.5" />

          <circle cx="90" cy="90" r="7.5" fill="#FFFFFF" />
          <circle cx="106" cy="90" r="7.5" fill="#FFFFFF" />
          <circle cx="82" cy="104" r="7.5" fill="#FFFFFF" />
          <circle cx="98" cy="104" r="7.5" fill="#FFFFFF" />
          <circle cx="114" cy="104" r="7.5" fill="#FFFFFF" />
          <circle cx="90" cy="118" r="7.5" fill="#FFFFFF" />
          <circle cx="106" cy="118" r="7.5" fill="#FFFFFF" />
          <circle cx="98" cy="132" r="7.5" fill="#FFFFFF" />
        </g>

        {/* Right Side Bold Red Stylized 'A' */}
        <g fill="#E21B4D">
          <path 
            d="M 122 48 
               L 162 48 
               C 165 95 162 145 158 195 
               L 138 195 
               C 142 160 144 120 144 92 
               L 128 92 
               L 120 128 
               L 100 128 
               L 122 48 Z" 
          />
          <polygon points="134,60 150,60 146,80 134,80" fill="#FFFFFF" />
          <path 
            d="M 100 128 
               C 92 148 88 168 112 190 
               C 122 198 135 204 148 208 
               C 135 200 120 190 114 175 
               C 108 160 112 145 118 128 Z" 
          />
        </g>
      </svg>

      {(showText || layout === 'horizontal') && (
        <div className={layout === 'horizontal' ? 'flex flex-col text-left' : 'mt-1 text-center'}>
          <span className="font-black italic uppercase tracking-wider text-sm md:text-base text-slate-900 dark:text-white">
            FC AUGGEN
          </span>
          {showText && (
            <span className="font-bold uppercase tracking-widest text-[9px] text-slate-500 block -mt-0.5">
              1921 e.V.
            </span>
          )}
        </div>
      )}
    </div>
  );
};




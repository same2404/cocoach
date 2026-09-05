import React from 'react';
import { Palette } from 'lucide-react';

export const UniformView: React.FC = () => {
  const [primaryColor, setPrimaryColor] = React.useState('#ff0000');
  const [secondaryColor, setSecondaryColor] = React.useState('#ffffff');

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center md:items-start watermark-bg">
      <div className="flex-1 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Trikot-Designer</h2>
          <p className="text-slate-500 text-sm">Gestalte das offizielle FC Auggen Trikot für die Saison 26/27.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#1E293B] rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg shadow-inner border border-slate-100" style={{ backgroundColor: primaryColor }} />
              <span className="text-sm font-medium">Primärfarbe</span>
            </div>
            <input 
              type="color" 
              value={primaryColor} 
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-8 h-8 cursor-pointer rounded overflow-hidden border-none"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#1E293B] rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg shadow-inner border border-slate-100" style={{ backgroundColor: secondaryColor }} />
              <span className="text-sm font-medium">Sekundärfarbe</span>
            </div>
            <input 
              type="color" 
              value={secondaryColor} 
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-8 h-8 cursor-pointer rounded overflow-hidden border-none"
            />
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 items-start">
          <Palette className="w-5 h-5 text-emerald-600 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            Die gewählten Farben werden automatisch auf alle Team-Assets und die Stadion-Visualisierung angewendet.
          </p>
        </div>
      </div>

      <div className="w-full max-w-[300px] aspect-[4/5] bg-slate-100 rounded-3xl flex items-center justify-center p-8 relative shadow-inner">
        {/* Simple Jersey SVG */}
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl">
          <path 
            d="M20,20 L80,20 L95,50 L85,55 L80,45 L80,110 L20,110 L20,45 L15,55 L5,50 Z" 
            fill={primaryColor} 
            stroke="#000" 
            strokeWidth="1"
          />
          <rect x="35" y="20" width="30" height="90" fill={secondaryColor} opacity="0.2" />
          <circle cx="50" cy="40" r="10" fill={secondaryColor} opacity="0.5" />
          <text x="50" y="85" textAnchor="middle" fill={secondaryColor} fontSize="20" fontWeight="bold" fontFamily="sans-serif">10</text>
        </svg>
      </div>
    </div>
  );
};

import React from 'react';

interface PlayerDotProps {
  number: number;
  name: string;
  role: string;
  x: number;
  y: number;
}

export const PlayerDot: React.FC<PlayerDotProps> = ({ number, name, role, x, y }) => {
  return (
    <div 
      className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-pointer">
        <span className="text-black font-bold text-xs md:text-sm">{number}</span>
      </div>
      <div className="mt-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {name} ({role})
      </div>
      <div className="text-[10px] text-white font-bold drop-shadow-md md:text-xs">
        {role}
      </div>
    </div>
  );
};

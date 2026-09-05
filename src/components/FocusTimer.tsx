import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Clock, Target, Coffee, Zap } from 'lucide-react';

type TimerMode = 'work' | 'short_break' | 'long_break';

interface TimerConfig {
  work: number;
  shortBreak: number;
  longBreak: number;
  rounds: number;
}

const PRESETS: Record<string, TimerConfig> = {
  pomodoro: { work: 25, shortBreak: 5, longBreak: 15, rounds: 4 },
  training: { work: 45, shortBreak: 10, longBreak: 20, rounds: 2 },
  halftime: { work: 15, shortBreak: 5, longBreak: 10, rounds: 3 },
  sprint: { work: 15, shortBreak: 3, longBreak: 8, rounds: 4 },
};

const MODE_CONFIG: Record<TimerMode, { label: string; color: string; icon: React.ReactNode }> = {
  work: { label: 'Arbeit', color: '#EF4444', icon: <Zap size={16} /> },
  short_break: { label: 'Kurze Pause', color: '#10B981', icon: <Coffee size={16} /> },
  long_break: { label: 'Lange Pause', color: '#3B82F6', icon: <Coffee size={16} /> },
};

interface FocusTimerProps {
  onClose?: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  const [preset, setPreset] = useState('pomodoro');
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const config = PRESETS[preset];
  const modeConfig = MODE_CONFIG[mode];
  const totalTime = mode === 'work' ? config.work * 60 : mode === 'short_break' ? config.shortBreak * 60 : config.longBreak * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = mode === 'work' ? 800 : 600;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  }, [mode, soundEnabled]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    const duration = newMode === 'work' ? config.work * 60 : newMode === 'short_break' ? config.shortBreak * 60 : config.longBreak * 60;
    setTimeLeft(duration);
  }, [config]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playAlarm();
          if (mode === 'work') {
            setCompletedPomodoros(p => p + 1);
            setTotalWorkTime(t => t + config.work * 60);
            if (currentRound >= config.rounds) {
              setCurrentRound(1);
              switchMode('long_break');
            } else {
              setCurrentRound(r => r + 1);
              switchMode('short_break');
            }
          } else {
            switchMode('work');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, currentRound, config, playAlarm, switchMode]);

  const reset = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(config.work * 60);
    setCurrentRound(1);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm mx-auto">
      {/* Preset Selector */}
      <div className="flex gap-1.5 mb-5">
        {Object.entries(PRESETS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setPreset(key); setTimeLeft(val.work * 60); setIsRunning(false); setMode('work'); setCurrentRound(1); }}
            className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-lg transition-all ${
              preset === key ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {key === 'pomodoro' ? '25/5' : key === 'training' ? '45/10' : key === 'halftime' ? '15/5' : '15/3'}
          </button>
        ))}
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        {(['work', 'short_break', 'long_break'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-bold uppercase transition-all ${
              mode === m ? 'text-white' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
            }`}
            style={mode === m ? { backgroundColor: `${modeConfig.color}22`, border: `1px solid ${modeConfig.color}44` } : {}}
          >
            {MODE_CONFIG[m].icon}
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={modeConfig.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white font-mono">{formatTime(timeLeft)}</span>
          <span className="text-[9px] text-slate-500 mt-1">{modeConfig.label} • Runde {currentRound}/{config.rounds}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={reset} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg transition-all active:scale-95"
          style={{ backgroundColor: modeConfig.color }}
        >
          {isRunning ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
        </button>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all">
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
          <div className="text-lg font-black text-white">{completedPomodoros}</div>
          <div className="text-[8px] text-slate-500 uppercase">Fertig</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
          <div className="text-lg font-black text-white">{Math.floor(totalWorkTime / 60)}m</div>
          <div className="text-[8px] text-slate-500 uppercase">Arbeitszeit</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
          <div className="text-lg font-black text-white">{currentRound}/{config.rounds}</div>
          <div className="text-[8px] text-slate-500 uppercase">Runde</div>
        </div>
      </div>
    </div>
  );
};

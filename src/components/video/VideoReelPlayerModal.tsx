import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  ListOrdered, 
  Layers, 
  Shield, 
  Target, 
  Users, 
  Film,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { TacticalVideoClip, VideoCategory } from '../views/VideoAnalysisView';

interface VideoReelPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mode: 'category' | 'master';
  analysisType: 'team' | 'opponent';
  clips: TacticalVideoClip[];
  categoryNotes?: Record<string, { note: string; focusPriority?: string }>;
}

export const VideoReelPlayerModal: React.FC<VideoReelPlayerModalProps> = ({
  isOpen,
  onClose,
  title,
  mode,
  analysisType,
  clips,
  categoryNotes = {}
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(true);
  const [clipCurrentTime, setClipCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentClip = clips[currentIndex];

  // Helper time format
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync video time when current clip changes
  useEffect(() => {
    if (!isOpen || !videoRef.current || !currentClip) return;
    videoRef.current.currentTime = currentClip.startTime;
    setClipCurrentTime(currentClip.startTime);
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, isOpen, currentClip]);

  // Update playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle continuous video progression
  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentClip) return;
    const cur = videoRef.current.currentTime;
    setClipCurrentTime(cur);

    if (cur >= currentClip.endTime) {
      if (currentIndex < clips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // End of playlist
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReplayCurrent = () => {
    if (!videoRef.current || !currentClip) return;
    videoRef.current.currentTime = currentClip.startTime;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handlePrevClip = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNextClip = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!isOpen || clips.length === 0 || !currentClip) return null;

  const activeCategoryNote = categoryNotes[currentClip.category]?.note;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-2 sm:p-4 backdrop-blur-md overflow-hidden text-white">
        
        {/* Top Header Bar */}
        <div className="p-3.5 bg-[#181F2E] border border-[#2A3447] rounded-xl flex items-center justify-between gap-4 mb-3 shadow-xl">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-md ${
              analysisType === 'team' ? 'bg-[#10B981] text-black' : 'bg-[#EF4444] text-white'
            }`}>
              {analysisType === 'team' ? <Shield size={14} /> : <Target size={14} />}
              <span>{analysisType === 'team' ? 'FC Auggen Team-Analyse' : 'Gegner-Analyse & Scouting'}</span>
            </span>

            <div>
              <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs font-normal text-[#94A3B8]">
                  • Szene {currentIndex + 1} von {clips.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlaylist(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showPlaylist ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50' : 'bg-[#20293A] text-[#94A3B8] border border-[#334155]'
              }`}
            >
              <ListOrdered size={14} />
              <span className="hidden sm:inline">Playlist</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-[#20293A] hover:bg-rose-950/80 text-[#94A3B8] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content (Player + Sidebar Playlist) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          
          {/* Left Column: Player & HUD */}
          <div className="flex-1 flex flex-col bg-[#131A26] border border-[#2A3447] rounded-2xl overflow-hidden shadow-2xl">
            
            {/* 16:9 Video Canvas Frame */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src={currentClip.videoUrl}
                autoPlay
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNextClip}
              />

              {/* Top Video Overlay: Category & Marking Badge */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-black/80 backdrop-blur-md text-[#10B981] border border-[#10B981]/40 rounded-lg text-xs font-black uppercase tracking-wider">
                    {currentClip.category}
                  </span>
                  {currentClip.assignedPlayerName && (
                    <span className="px-2.5 py-1 bg-blue-950/90 text-blue-200 border border-blue-500/50 rounded-lg text-xs font-bold">
                      👤 {currentClip.assignedPlayerName}
                    </span>
                  )}
                </div>

                {currentClip.colorMarking !== 'none' && (
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                    currentClip.colorMarking === 'green' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-950/50' : 'bg-rose-500 text-white shadow-lg shadow-rose-950/50'
                  }`}>
                    {currentClip.colorMarking === 'green' ? '✓ Gute Aktion' : '⚠ Fehler'}
                  </span>
                )}
              </div>

              {/* Bottom Video Overlay: Timing */}
              <div className="absolute bottom-3 left-3 pointer-events-none px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-xs font-mono font-bold text-white border border-white/10">
                ⏱ {formatTime(clipCurrentTime)} (Szene: {formatTime(currentClip.startTime)} - {formatTime(currentClip.endTime)})
              </div>
            </div>

            {/* Video Controls Toolbar */}
            <div className="p-3 bg-[#1A2232] border-t border-[#2A3447] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevClip}
                  disabled={currentIndex === 0}
                  className="p-2 bg-[#252E42] hover:bg-[#323D57] disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                  title="Vorherige Szene"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                </button>

                <button
                  onClick={handleReplayCurrent}
                  className="p-2 bg-[#252E42] hover:bg-[#323D57] rounded-lg transition-all cursor-pointer text-[#94A3B8] hover:text-white"
                  title="Aktuelle Szene wiederholen"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={handleNextClip}
                  disabled={currentIndex === clips.length - 1}
                  className="p-2 bg-[#252E42] hover:bg-[#323D57] disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                  title="Nächste Szene"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Playback Speeds */}
              <div className="flex items-center gap-1 bg-[#101726] p-1 rounded-lg border border-[#2A3447]">
                {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      playbackRate === speed ? 'bg-[#10B981] text-black font-black' : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Notes & Trainer Conclusions HUD */}
            <div className="p-4 space-y-3 overflow-y-auto bg-[#141B26]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Scene Note */}
                <div className="p-3.5 bg-[#1B2333] border border-[#2A3447] rounded-xl space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">
                    Taktische Notiz zur Szene ({formatTime(currentClip.startTime)} - {formatTime(currentClip.endTime)})
                  </div>
                  <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                    {currentClip.tacticalNote || 'Keine spezifische Notiz für diesen Clip hinterlegt.'}
                  </p>
                </div>

                {/* Category Trainer Fazit */}
                <div className="p-3.5 bg-[#1B2333] border border-[#2A3447] rounded-xl space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#38BDF8]">
                    Trainer-Fazit zu „{currentClip.category}"
                  </div>
                  <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                    {activeCategoryNote || 'Kein übergeordnetes Trainer-Fazit für diese Kategorie eingetragen.'}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Interactive Playlist Drawer */}
          {showPlaylist && (
            <div className="w-full lg:w-80 bg-[#131A26] border border-[#2A3447] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
              <div className="p-3.5 bg-[#1A2232] border-b border-[#2A3447] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film size={16} className="text-[#10B981]" />
                  <span className="text-xs font-black uppercase tracking-wide text-white">
                    Szenen-Ablauf ({clips.length})
                  </span>
                </div>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px] lg:max-h-none">
                {clips.map((c, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={c.id || idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                        isActive 
                          ? 'bg-[#1E293B] border-[#10B981] ring-2 ring-[#10B981]/50 text-white' 
                          : 'bg-[#161D2B] border-[#252E42] text-slate-400 hover:bg-[#1C2536] hover:text-slate-200'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-md bg-black/50 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-black uppercase tracking-wide truncate text-[#10B981]">
                            {c.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatTime(c.startTime)}-{formatTime(c.endTime)}
                          </span>
                        </div>

                        {c.assignedPlayerName && (
                          <div className="text-[10px] text-blue-300 font-bold">
                            👤 {c.assignedPlayerName}
                          </div>
                        )}

                        {c.tacticalNote && (
                          <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                            {c.tacticalNote}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </AnimatePresence>
  );
};

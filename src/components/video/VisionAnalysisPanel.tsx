import React, { useState, useCallback } from 'react';
import { Camera, Loader2, Eye, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeImageWithVision, VisionAnalysisResult } from '../../services/visionAnalysis';

interface VisionAnalysisPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  clubName: string;
  players: any[];
}

export const VisionAnalysisPanel: React.FC<VisionAnalysisPanelProps> = ({ videoRef, clubName, players }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTime, setSelectedTime] = useState(0);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current) {
      setError('Kein Video geladen');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas nicht verfügbar');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      const analysisResult = await analyzeImageWithVision(base64);
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen');
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoRef]);

  const captureMultipleFrames = useCallback(async () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const frames: string[] = [];
      const durations = [0, 15, 30, 45, 60];

      for (const t of durations) {
        if (t <= video.duration) {
          video.currentTime = t;
          await new Promise(r => setTimeout(r, 500));
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            frames.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
          }
        }
      }

      if (frames.length > 0) {
        const lastFrame = frames[frames.length - 1];
        const analysisResult = await analyzeImageWithVision(lastFrame);
        setResult(analysisResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multi-Frame-Analyse fehlgeschlagen');
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoRef]);

  return (
    <div className="bg-gradient-to-br from-[#0A0E17] via-[#0a0f2e] to-[#0A0E17] border border-[#8B5CF6]/30 rounded-2xl p-4 shadow-2xl">
      <div
        className="flex items-center gap-2 mb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#8B5CF6]">Vision-Analyse (Bilderkennung)</span>
        <span className="text-[8px] text-[#64748B] ml-auto">Formationserkennung • Spieler-Tracking • KI-gestützt</span>
        {isExpanded ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <p className="text-[9px] text-[#94A3B8]">
            Die KI analysiert Screenshots aus dem Video und erkennt automatisch: Formationen, Trikotnummern, Ballposition und Spielphase.
          </p>

          {/* Controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={captureAndAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3 py-2 bg-[#8B5CF6] text-white rounded-xl text-[9px] font-bold uppercase disabled:opacity-50 hover:bg-[#7C3AED] transition-all"
            >
              {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              Aktuellen Frame analysieren
            </button>
            <button
              onClick={captureMultipleFrames}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E293B] text-[#94A3B8] rounded-xl text-[9px] font-bold uppercase disabled:opacity-50 hover:bg-[#334155] transition-all border border-[#334155]"
            >
              {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              5 Frames automatisch
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#EF4444]" />
              <span className="text-[9px] text-[#FCA5A5]">{error}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#10B981]" />
                <span className="text-[9px] font-bold text-[#10B981]">Analyse abgeschlossen</span>
                <span className="text-[8px] text-[#64748B]">• Konfidenz: {Math.round(result.confidence * 100)}%</span>
              </div>

              {/* Description */}
              <div className="bg-[#0F172A] rounded-xl p-3">
                <div className="text-[8px] text-[#8B5CF6] font-bold uppercase mb-1">Beschreibung</div>
                <p className="text-[11px] text-[#CBD5E1]">{result.description}</p>
              </div>

              {/* Game Phase */}
              <div className="flex gap-2">
                <div className="bg-[#0F172A] rounded-xl p-2 flex-1 text-center">
                  <div className="text-[8px] text-[#64748B] uppercase">Spielphase</div>
                  <div className="text-[11px] font-bold text-white capitalize">{result.gamePhase}</div>
                </div>
                {result.ballPosition && (
                  <div className="bg-[#0F172A] rounded-xl p-2 flex-1 text-center">
                    <div className="text-[8px] text-[#64748B] uppercase">Ballposition</div>
                    <div className="text-[11px] font-bold text-white">
                      x: {result.ballPosition.x.toFixed(2)} • y: {result.ballPosition.y.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Formations */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0F172A] rounded-xl p-3 border border-[#10B981]/20">
                  <div className="text-[8px] text-[#10B981] font-bold uppercase mb-2">🏠 {clubName} ({result.formations.home.name})</div>
                  <div className="space-y-1">
                    {result.formations.home.positions.slice(0, 6).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        {p.number && <span className="text-[#F59E0B] font-mono font-bold">#{p.number}</span>}
                        <span className="text-[#CBD5E1]">{p.player}</span>
                        <span className="text-[#64748B] ml-auto">{p.x.toFixed(2)},{p.y.toFixed(2)}</span>
                      </div>
                    ))}
                    {result.formations.home.positions.length > 6 && (
                      <div className="text-[8px] text-[#64748B]">+{result.formations.home.positions.length - 6} weitere</div>
                    )}
                  </div>
                </div>
                <div className="bg-[#0F172A] rounded-xl p-3 border border-[#EF4444]/20">
                  <div className="text-[8px] text-[#EF4444] font-bold uppercase mb-2">✈️ Gegner ({result.formations.away.name})</div>
                  <div className="space-y-1">
                    {result.formations.away.positions.slice(0, 6).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        {p.number && <span className="text-[#F59E0B] font-mono font-bold">#{p.number}</span>}
                        <span className="text-[#CBD5E1]">{p.player}</span>
                        <span className="text-[#64748B] ml-auto">{p.x.toFixed(2)},{p.y.toFixed(2)}</span>
                      </div>
                    ))}
                    {result.formations.away.positions.length > 6 && (
                      <div className="text-[8px] text-[#64748B]">+{result.formations.away.positions.length - 6} weitere</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detected Players */}
              {result.players.length > 0 && (
                <div className="bg-[#0F172A] rounded-xl p-3">
                  <div className="text-[8px] text-[#60A5FA] font-bold uppercase mb-2">Erkannte Spieler ({result.players.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.players.slice(0, 12).map((p, i) => (
                      <div key={i} className="bg-[#1E293B] rounded-lg px-2 py-1 text-[8px] flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.team === 'home' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        {p.number && <span className="font-mono font-bold text-[#F59E0B]">#{p.number}</span>}
                        <span className="text-[#CBD5E1]">{p.name}</span>
                        <span className="text-[#64748B]">{p.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

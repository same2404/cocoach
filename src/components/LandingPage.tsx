// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldHalf, LayoutDashboard, LayoutGrid, Target, MonitorPlay, Users,
  CalendarRange, Wallet, Activity, Sparkles, PlayCircle, ChevronDown, X, Play,
  Shield, Trophy, MapPin
} from 'lucide-react';

const CLUB_RED = '#C00000';

interface DemoScene {
  id: string;
  start: number;
  end: number;
  label: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const SCENES: DemoScene[] = [
  { id: 'intro', start: 0.0, end: 2.0, label: 'Intro', title: 'CoCoach', subtitle: 'Die moderne Fußball-App', icon: ShieldHalf },
  { id: 'design', start: 2.0, end: 5.0, label: 'Design', title: 'Modernes Design. Klare Struktur.', subtitle: 'Startseite mit sauberer UI', icon: LayoutDashboard },
  { id: 'funktionen', start: 5.0, end: 8.0, label: 'Funktionen', title: 'Alle Funktionen in einem System.', subtitle: 'Taktik, Kader, Training, Finanzen & mehr', icon: LayoutGrid },
  { id: 'taktik', start: 8.0, end: 11.0, label: 'Taktiktafel', title: 'Taktik & Formation – live anpassbar.', subtitle: '100 % manuell · frei gezeichnet', icon: Target },
  { id: 'tv', start: 11.0, end: 14.0, label: 'Präsentation TV', title: 'Professionelle TV-Präsentation.', subtitle: 'Startelf, Bank & Spielsystem im Broadcast-Look', icon: MonitorPlay },
  { id: 'kader', start: 14.0, end: 17.0, label: 'Kaderplanung', title: 'Kader modern verwalten.', subtitle: 'Spielerprofile & Rollen-Zuordnung', icon: Users },
  { id: 'training', start: 17.0, end: 20.0, label: 'Trainingsplanung', title: 'Training perfekt organisiert.', subtitle: 'Kalender, Inhalte & automatische Spielerübernahme', icon: CalendarRange },
  { id: 'budget', start: 20.0, end: 23.0, label: 'Budget', title: 'Finanzen klar im Blick.', subtitle: 'Einnahmen / Ausgaben im Überblick', icon: Wallet },
  { id: 'report', start: 23.0, end: 26.0, label: 'Spielerbericht + Tracker', title: 'Analyse & Feedback in Echtzeit.', subtitle: 'Bewertung nach Tracker-Daten', icon: Activity },
  { id: 'outro', start: 26.0, end: 28.0, label: 'Outro', title: 'CoCoach', subtitle: 'Die Zukunft des Fußballmanagements', icon: Trophy },
];

const FEATURES = [
  { icon: Target, title: 'Taktiktafel', text: 'Laufwege, Ballwege, Passarten & Spielaufbau – zu 100 % manuell und frei gezeichnet. Keine Analyse-Engine-Vorgaben.' },
  { icon: MonitorPlay, title: 'TV-Präsentation', text: 'Startelf, Bank und Spielsystem professionell präsentieren – im Broadcast-Look.' },
  { icon: Users, title: 'Kaderplanung', text: 'Spielerprofile, Rollen-Zuordnung und Einsatzplanung modern und zentral verwaltet.' },
  { icon: CalendarRange, title: 'Trainingsplanung', text: 'Kalender, Trainingsinhalte und automatische Spielerübernahme – alles an einem Ort.' },
  { icon: Wallet, title: 'Budget & Finanzen', text: 'Einnahmen und Ausgaben finanziell sauber im Überblick.' },
  { icon: Activity, title: 'Tracker & Analyse', text: 'Spielerberichte mit Bewertung nach Tracker-Daten – Feedback in Echtzeit.' },
];

const SCENE_VISUALS: Record<string, string> = {
  intro: 'radial-gradient(circle at 30% 30%, rgba(192,0,0,0.55), rgba(192,0,0,0.15) 45%, transparent 70%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.08), transparent 60%)',
  design: 'linear-gradient(160deg, #0A0E17 0%, #111c30 55%, #0A0E17 100%)',
  funktionen: 'linear-gradient(160deg, #0A0E17 0%, #1a0f0f 40%, #0A0E17 100%)',
  taktik: 'linear-gradient(160deg, #0A0E17 0%, #16221c 55%, #0A0E17 100%)',
  tv: 'linear-gradient(160deg, #0A0E17 0%, #1c1021 55%, #0A0E17 100%)',
  kader: 'linear-gradient(160deg, #0A0E17 0%, #101a28 55%, #0A0E17 100%)',
  training: 'linear-gradient(160deg, #0A0E17 0%, #1a1c10 55%, #0A0E17 100%)',
  budget: 'linear-gradient(160deg, #0A0E17 0%, #172110 45%, #0A0E17 100%)',
  report: 'linear-gradient(160deg, #0A0E17 0%, #131b2a 55%, #0A0E17 100%)',
  outro: 'radial-gradient(circle at 50% 45%, rgba(192,0,0,0.6), rgba(192,0,0,0.05) 55%, transparent 80%)',
};

function useAnimatedDemo() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    startRef.current = null;
    let last = 0;
    const loop = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const tt = elapsed % 28;
      if (Math.abs(tt - last) > 0.05) { last = tt; setT(tt); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing]);

  return { t, playing, setPlaying };
}

const fmtTime = (s: number) => `00:${String(Math.min(59, Math.floor(s))).padStart(2, '0')}`;

function MiniField() {
  return (
    <div className="w-24 h-16 rounded border border-white/25 relative overflow-hidden shrink-0">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-10 border border-white/20 rounded-full" />
      {[[18, 28], [38, 58], [58, 28], [78, 58]].map(([x, y], i) => (
        <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-[#C00000]" style={{ left: `${x}%`, top: `${y}%`, boxShadow: '0 0 6px rgba(192,0,0,0.9)' }} />
      ))}
      <div className="absolute w-1.5 h-1.5 bg-white rounded-full" style={{ left: '50%', top: '55%', boxShadow: '0 0 6px rgba(255,255,255,0.9)' }} />
    </div>
  );
}

export const LandingPage: React.FC = () => {
  const { t, playing, setPlaying } = useAnimatedDemo();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);

  const landingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?page=landing`;
  }, []);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(landingUrl, { errorCorrectionLevel: 'M', margin: 1, width: 240, color: { dark: '#050505', light: '#ffffff' } })
      .then((url) => { if (alive) setQrDataUrl(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, [landingUrl]);

  const sceneIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < SCENES.length; i++) {
      if (t >= SCENES[i].start && t < SCENES[i].end) { idx = i; break; }
      if (i === SCENES.length - 1 && t >= SCENES[i].end) idx = i;
    }
    return idx;
  }, [t]);

  const scene = SCENES[sceneIndex];
  const timelineEnd = SCENES[SCENES.length - 1].end;

  return (
    <div className="min-h-screen bg-[#060912] text-[#F5F5F5] font-sans overflow-x-hidden">
      {/* HERO */}
      <header className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 20%, rgba(192,0,0,0.28), transparent 55%), radial-gradient(circle at 80% 80%, rgba(192,0,0,0.12), transparent 45%), radial-gradient(circle at 15% 75%, rgba(255,255,255,0.05), transparent 40%)' }} />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#C00000] via-[#8a0000] to-black flex items-center justify-center shadow-2xl mx-auto mb-6"
            style={{ boxShadow: '0 0 40px rgba(192,0,0,0.5)' }}>
            <ShieldHalf className="w-14 h-14 text-white" strokeWidth={1.6} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70 mb-3">COCOACH · DEMO</p>
          <h1 className="font-black uppercase tracking-tight text-5xl sm:text-6xl md:text-7xl leading-none">
            <span className="text-white">CO</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#C00000]">COACH</span>
          </h1>
          <p className="text-2xl sm:text-3xl font-black mt-2 tracking-wide">26/27 <span className="text-[#C00000]">·</span> DEMO VIDEO</p>
          <p className="text-white/60 text-sm sm:text-base mt-4 max-w-xl mx-auto font-medium">
            Die moderne Fußball-App – Taktiktafel, TV-Präsentation, Kader, Training, Budget & Tracker-Analyse in einem professionellen System.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#demo" className="flex items-center gap-2 bg-gradient-to-r from-[#C00000] to-[#960000] text-white font-black uppercase tracking-wider text-sm px-7 py-3.5 rounded-full shadow-lg hover:scale-105 transition-transform"
            style={{ boxShadow: '0 8px 30px rgba(192,0,0,0.45)' }}>
            <PlayCircle className="w-5 h-5" /> Jetzt Demo-Video ansehen
          </a>
          <a href="#features" className="flex items-center gap-2 border border-white/25 text-white/90 font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded-full hover:border-white/60 transition-colors">
            Funktionen <ChevronDown className="w-4 h-4" />
          </a>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-white/40 animate-bounce" />
        </motion.div>
      </header>

      {/* DEMO VIDEO / ANIMATED SHOWREEL */}
      <section id="demo" className="relative py-20 px-6 scroll-mt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0f1a] to-transparent" />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ff2d2d] mb-2">DEMO · 00:00–00:28</p>
            <h2 className="text-3xl sm:text-4xl font-black uppercase">CoCoach – Demo Video</h2>
            <p className="text-white/60 text-sm mt-2 font-medium">TV-Broadcast-Look · dynamisch · mit fließenden Übergängen</p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-video bg-black shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(192,0,0,0.25)' }}>
            {/* Real video slot (Docker: datei in public/ ablegen) */}
            {!videoFailed && (
              <video
                className="absolute inset-0 w-full h-full object-contain"
                src="/demo-video-v3.mp4"
                poster=""
                preload="metadata"
                playsInline
                controls
                onError={() => setVideoFailed(true)}
              />
            )}
            {videoFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                <AnimatePresence mode="wait">
                  <motion.div key={scene.id} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.5 }} className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <div className="absolute inset-0" style={{ background: SCENE_VISUALS[scene.id] }} />
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                      <Shield className="w-3.5 h-3.5 text-[#ff2d2d]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/80">CoCoach · Demo</span>
                    </div>
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                      <span className="text-[10px] font-mono text-white/80">
                        {fmtTime(scene.start)} – {fmtTime(scene.end)}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-3 mb-4">
                      <MiniField />
                      <scene.icon className="w-10 h-10 text-white/95" strokeWidth={1.4} />
                    </div>
                    <h3 className="relative text-2xl sm:text-4xl font-black uppercase tracking-tight max-w-2xl">{scene.title}</h3>
                    <p className="relative text-white/65 text-sm sm:text-base mt-3 font-medium">{scene.subtitle}</p>
                  </motion.div>
                </AnimatePresence>

                {/* TIME PROGRESS */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                  <div className="h-full bg-gradient-to-r from-[#C00000] to-[#ff2d2d] transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, (t / timelineEnd) * 100))}%` }} />
                </div>

                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors"
                >
                  {playing ? <X className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? 'Stopp' : 'Abspielen'}
                </button>
              </div>
            )}
          </div>

          {/* OVERLAY HINT */}
          <div className="inline-flex items-center gap-2 bg-[#0c0f1a] border border-white/10 rounded-full px-4 py-2 mt-4 text-[10px] font-bold text-white/55 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#ff2d2d]" />
            Hinweis: Auf dem Handy QR-Code gleich unten scannen – du gelangst direkt hierher.
          </div>
        </div>
      </section>

      {/* STORYBOARD TIMELINE */}
      <section className="relative py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ff2d2d] mb-2">STORYBOARD</p>
            <h2 className="text-3xl sm:text-4xl font-black uppercase">Die 10 Szenen des Democlips</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SCENES.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.04 }} className="flex items-start gap-4 bg-[#0d101c]/80 border border-white/10 rounded-xl p-4 hover:border-[#C00000]/60 transition-colors">
                <div className="flex flex-col items-center">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C00000] to-[#7a0000] flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-white" strokeWidth={1.6} />
                  </span>
                  <span className="text-[9px] font-mono font-bold text-white/50 mt-1.5 whitespace-nowrap">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#ff2d2d] mb-1">{s.label}</p>
                  <p className="text-sm font-black leading-snug">{s.title}</p>
                  <p className="text-white/55 text-xs mt-1">{s.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-16 px-6 scroll-mt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0f1a] to-transparent" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ff2d2d] mb-2">FUNKTIONEN</p>
            <h2 className="text-3xl sm:text-4xl font-black uppercase">Alles in einem System</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.05 }} className="bg-[#0d101c]/90 border border-white/10 rounded-xl p-5 hover:border-[#C00000]/50 hover:shadow-lg hover:shadow-[#C00000]/10 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C00000] to-[#7a0000] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-white" strokeWidth={1.6} />
                </div>
                <h3 className="font-black uppercase tracking-wide text-sm mb-1.5">{f.title}</h3>
                <p className="text-white/60 text-xs leading-relaxed font-medium">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* QR CODE + BADGE */}
      <section id="qr" className="relative py-20 px-6 scroll-mt-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-[#C00000]/40 bg-gradient-to-b from-[#0d101c] to-[#090b14] overflow-hidden" style={{ boxShadow: '0 0 60px rgba(192,0,0,0.18)' }}>
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 sm:p-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-[#C00000]/15 border border-[#C00000]/40 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-[#ff2d2d] mb-5">
                  <MapPin className="w-3 h-3" /> QR-CODE & BADGE
                </div>
                <h2 className="text-3xl sm:text-4xl font-black uppercase leading-tight">Zum Democlip<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#C00000]">Direkt aufs Handy</span></h2>
                <p className="text-white/65 text-sm mt-4 font-medium">
                  Scanne den Code mit deiner Handy-Kamera – du landest direkt auf dieser Seite mit dem Demo-Video. Perfekt für Team, Eltern und Sponsoren.
                </p>
                <p className="mt-6 inline-flex items-center gap-2 font-black uppercase tracking-widest text-white bg-[#C00000] px-5 py-2.5 rounded-full text-xs"
                  style={{ boxShadow: '0 6px 20px rgba(192,0,0,0.4)' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Jetzt Demo-Video ansehen
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  {qrDataUrl
                    ? <img src={qrDataUrl} alt="QR-Code zur Demo-Site" className="w-52 h-52" />
                    : <div className="w-52 h-52 flex items-center justify-center text-white/30 text-xs font-bold">QR wird erzeugt...</div>}
                </div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest max-w-[220px] text-center leading-relaxed">
                  Jetzt Demo-Video ansehen
                </p>
              </div>
            </div>

            {/* Badge trennung */}
            <div className="border-t border-white/10 p-6 flex flex-wrap items-center justify-center gap-4 text-center">
              <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-full px-4 py-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C00000]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Schwarz</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-full px-4 py-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Weiß</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-full px-4 py-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C00000]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Rot</span>
              </div>
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Unsere Vereinsfarben</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-14 px-6 border-t border-white/10 text-center">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 100%, rgba(192,0,0,0.25), transparent 60%)' }} />
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-[#C00000] to-black flex items-center justify-center mb-4">
            <ShieldHalf className="w-8 h-8 text-white" strokeWidth={1.6} />
          </div>
          <p className="font-black uppercase tracking-wide text-xl">CoCoach – Die Zukunft des Fußballmanagements</p>
          <p className="text-white/45 text-xs mt-3 font-medium">Pilotprojekt 26/27 · Demo Video · Alle Funktionen in einem System</p>
          <p className="text-white/25 text-[10px] mt-2">© 2026 CoCoach. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};
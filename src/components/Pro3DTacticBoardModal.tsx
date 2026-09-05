import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { useClub } from '../contexts/ClubContext';
import { 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Sparkles, 
  Activity, 
  Compass, 
  X, 
  Sliders, 
  Zap, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut,
  ArrowRightLeft,
  BookOpen,
  ShieldAlert,
  Target,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
  Check,
  ArrowRight,
  ExternalLink,
  Grid,
  TrendingUp,
  Database,
  UserCheck
} from 'lucide-react';
import { 
  TacticalFormation, 
  GamePhase, 
  TacticalPhilosophy,
  BuildUpVariant,
  FORMATION_REPOSITORY, 
  TACTICAL_PHILOSOPHIES,
  BUILD_UP_VARIANTS,
  generateProTrainerAnalysis,
  compareFormations, 
  FormationComparison,
  LOAD_STROKE_WIDTH,
  PHASE_COLOR,
  SET_PIECES_DATABASE,
  generatePlayerScoutingProfile,
  PlayerScoutingProfile,
  SetPieceVariant
} from '../utils/tacticalAnalysisEngine';

interface Pro3DTacticBoardModalProps {
  players: Player[];
  matches?: any[];
  analyses?: any[];
  onClose: () => void;
  initialSituation?: string;
}

export const Pro3DTacticBoardModal: React.FC<Pro3DTacticBoardModalProps> = ({
  players,
  matches = [],
  analyses = [],
  onClose,
  initialSituation = 'umschalten'
}) => {
  const { activeClub } = useClub();
  const [phase, setPhase] = useState<GamePhase>(
    initialSituation === 'ballverlust' || initialSituation === 'pressing'
      ? 'gegen_ball'
      : initialSituation === 'umschalten'
      ? 'umschalten'
      : 'mit_ball'
  );
  const [formation, setFormation] = useState<TacticalFormation>('4-2-3-1');
  const [previousFormation, setPreviousFormation] = useState<TacticalFormation>('4-2-3-1');
  const [is3DPerspective, setIs3DPerspective] = useState<boolean>(true);
  const [tiltAngle, setTiltAngle] = useState<number>(18); // 0 (2D), 18 (Flach), 28 (Steil)
  const [zoomLevel, setZoomLevel] = useState<number>(1.15); // Pitch zoom level default set higher (115%)
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showLoadZones, setShowLoadZones] = useState<boolean>(true);
  const [selectedPlayerPos, setSelectedPlayerPos] = useState<string>('ST');
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [philosophy, setPhilosophy] = useState<TacticalPhilosophy>('positionsspiel');
  const [buildUpVariant, setBuildUpVariant] = useState<BuildUpVariant>('sechser');
  const [showTrainerAnalysisModal, setShowTrainerAnalysisModal] = useState<boolean>(false);
  const [showTrainerHUD, setShowTrainerHUD] = useState<boolean>(true);

  // New PROFI Agent states
  const [isMatrixView, setIsMatrixView] = useState<boolean>(false); // Simultaneous 4-Systems Matrix
  const [showMatchAndStandardsModal, setShowMatchAndStandardsModal] = useState<boolean>(false);
  const [selectedScoutingProfile, setSelectedScoutingProfile] = useState<PlayerScoutingProfile | null>(null);
  const [activeSetPieceCategory, setActiveSetPieceCategory] = useState<'Ecke' | 'Freistoß' | 'Einwurf'>('Ecke');

  const [isVerticalPitch, setIsVerticalPitch] = useState<boolean>(true); // Default VERTICAL pitch orientation as requested!
  const [selectedMatchReportId, setSelectedMatchReportId] = useState<string | number | null>(analyses[0]?.id || matches[0]?.id || null);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // Coordinate mapping from Horizontal (800x520) to Vertical (520x800)
  const mapPoint = (x: number, y: number, isVert: boolean) => {
    if (!isVert) return { x, y };
    return { x: y, y: 800 - x };
  };

  const mapPathD = (d: string, isVert: boolean) => {
    if (!isVert) return d;
    return d.replace(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (match, p1, p2, p3, p4) => {
      const x = parseFloat(p1 || p3);
      const y = parseFloat(p2 || p4);
      if (isNaN(x) || isNaN(y)) return match;
      const m = mapPoint(x, y, true);
      return `${m.x} ${m.y}`;
    });
  };

  // Animation Frame Loop
  useEffect(() => {
    let frameId: number;
    if (isAnimating) {
      const step = () => {
        setAnimProgress((prev) => (prev + 0.008) % 1);
        frameId = requestAnimationFrame(step);
      };
      frameId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(frameId);
  }, [isAnimating]);

  // Toast auto-clear
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Current formation data repository
  const currentFormationData = FORMATION_REPOSITORY[formation] || FORMATION_REPOSITORY['4-2-3-1'];
  const runProfiles = currentFormationData.positions;

  // Selected Match Analysis
  const selectedAnalysis = analyses.find((a: any) => a.id === selectedMatchReportId) || analyses[0] || null;
  const selectedMatch = matches.find((m: any) => m.id === selectedMatchReportId || m.opponent === selectedAnalysis?.opponent) || matches[0] || null;

  // Formation Comparison when changing formation
  const handleFormationChange = (newFormation: TacticalFormation) => {
    if (newFormation !== formation) {
      setPreviousFormation(formation);
      setFormation(newFormation);
      setShowComparisonModal(true);
    }
  };

  const comparison: FormationComparison = compareFormations(previousFormation, formation);
  const proAnalysis = generateProTrainerAnalysis(formation, phase, philosophy, buildUpVariant, selectedPlayerPos);

  // Open Player Scouting profile for a position key
  const handleOpenPlayerScouting = (posKey: string) => {
    setSelectedPlayerPos(posKey);
    const profile = generatePlayerScoutingProfile(posKey, players);
    setSelectedScoutingProfile(profile);
  };

  // Apply match report tactic onto tactic board
  const applyMatchplanToBoard = (match: any, analysis?: any) => {
    const opp = match?.opponent || analysis?.opponent || 'Verbandsliga Gegner';
    let targetVariant: BuildUpVariant = 'fluegel_lang';
    const textSample = `${analysis?.openingPlay || ''} ${analysis?.transitionOffensive || ''} ${match?.tacticalNotes || ''}`.toLowerCase();
    
    if (textSample.includes('6er') || textSample.includes('drehpunkt')) {
      targetVariant = 'sechser';
    } else if (textSample.includes('sechzehner') || textSample.includes('strafraum')) {
      targetVariant = 'sechzehner';
    } else if (textSample.includes('außen') || textSample.includes('flügel') || textSample.includes('av')) {
      targetVariant = 'av_fluegel';
    } else {
      targetVariant = 'fluegel_lang';
    }

    setBuildUpVariant(targetVariant);
    setPhase('mit_ball');
    setActiveToast(`Taktik & Spielaufbau aus Spielbericht vs ${opp} geladen!`);
  };

  // Calculate animated position along SVG path
  const getPointOnPathProgress = (pathD: string, progress: number) => {
    const mappedD = mapPathD(pathD, isVerticalPitch);
    const numbers = mappedD.match(/-?\d+(\.\d+)?/g)?.map(Number) || [260, 400];
    if (numbers.length >= 4) {
      const startX = numbers[0];
      const startY = numbers[1];
      const endX = numbers[numbers.length - 2];
      const endY = numbers[numbers.length - 1];
      const midX = numbers.length >= 6 ? numbers[2] : (startX + endX) / 2;
      const midY = numbers.length >= 6 ? numbers[3] : (startY + endY) / 2;

      const t = progress;
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
      return { x, y };
    }
    return { x: 260, y: 400 };
  };

  const ALL_FORMATIONS: TacticalFormation[] = ['4-4-2', '4-2-3-1', '4-1-4-1', '3-4-3'];

  return (
    <div className={`fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-2 sm:p-4 text-white font-sans overflow-hidden select-none ${isFullscreen ? 'p-0' : ''}`}>
      {/* TOAST BANNER */}
      {activeToast && (
        <div className="absolute top-20 right-6 z-[200] bg-emerald-500 text-slate-950 font-black uppercase text-xs px-4 py-2.5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-200 flex items-center gap-2">
          <CheckCircle2 size={16} /> {activeToast}
        </div>
      )}

      {/* HEADER CONTROL BAR - SLEEK & UNCLUTTERED */}
      <div className="bg-slate-900 border-2 sm:border-4 border-black p-2.5 sm:p-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
        {/* TITLE & LOGO */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-600 text-white border-2 border-black font-black flex items-center justify-center shadow-sm shrink-0 rounded">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              PROFI-TAKTIK <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded border border-black font-mono">BUNDESLIGA MODUS</span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold hidden md:flex items-center gap-2">
              <span>3D-Taktiktafel & Matrix (4 Systeme)</span> • 
              <span className="text-emerald-400 flex items-center gap-1"><Database size={12} /> Firestore Synced</span>
            </p>
          </div>
        </div>

        {/* QUICK TOGGLE BUTTONS & CONTROLS */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          
          {/* SIMULTANEOUS 4-SYSTEMS MATRIX TOGGLE */}
          <button
            onClick={() => setIsMatrixView(!isMatrixView)}
            className={`px-3 py-1 rounded border-2 border-black text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
              isMatrixView ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
            title="Alle 4 Spielsysteme (4-4-2, 4-2-3-1, 4-1-4-1, 3-4-3) gleichzeitig visualisieren"
          >
            <Grid size={14} /> ⚡ 4-Systeme Matrix
          </button>

          {/* STANDARDS & MATCHDATEN MODAL BUTTON */}
          <button
            onClick={() => setShowMatchAndStandardsModal(true)}
            className="px-3 py-1 rounded border-2 border-black bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            title="Standards (Ecken, Freistöße, Einwürfe) & Matchdaten laden"
          >
            <Target size={14} /> 🎯 Matchdaten & Standards
          </button>

          {/* ORIENTATION TOGGLE (VERTIKAL vs HORIZONTAL) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setIsVerticalPitch(true)}
              className={`px-2 py-1 rounded font-black uppercase transition-all flex items-center gap-1 ${
                isVerticalPitch ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-300 hover:text-white'
              }`}
              title="Vertikale Längsfeld-Ansicht (Standard Profi-Taktiktafel)"
            >
              ↕ Vertikal
            </button>
            <button
              onClick={() => setIsVerticalPitch(false)}
              className={`px-2 py-1 rounded font-black uppercase transition-all flex items-center gap-1 ${
                !isVerticalPitch ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-300 hover:text-white'
              }`}
              title="Horizontale Breitfeld-Ansicht"
            >
              ↔ Horizontal
            </button>
          </div>

          {/* PERSPECTIVE & ANGLE SELECTOR */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-mono">
            <button
              onClick={() => { setIs3DPerspective(false); setTiltAngle(0); }}
              className={`px-2 py-1 rounded font-black uppercase transition-all ${
                !is3DPerspective ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-300 hover:text-white'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => { setIs3DPerspective(true); setTiltAngle(18); }}
              className={`px-2 py-1 rounded font-black uppercase transition-all ${
                is3DPerspective && tiltAngle === 18 ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-300 hover:text-white'
              }`}
            >
              3D 18°
            </button>
            <button
              onClick={() => { setIs3DPerspective(true); setTiltAngle(28); }}
              className={`px-2 py-1 rounded font-black uppercase transition-all ${
                is3DPerspective && tiltAngle === 28 ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-300 hover:text-white'
              }`}
            >
              3D 28°
            </button>
          </div>

          {/* ZOOM CONTROLS */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.75, Math.round((prev - 0.1) * 100) / 100))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
              title="Verkleinern"
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-xs px-1 text-amber-300 font-black min-w-[34px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(2.2, Math.round((prev + 0.1) * 100) / 100))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
              title="Vergrößern"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => { setZoomLevel(1.15); setTiltAngle(18); setIs3DPerspective(true); }}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-300"
              title="Zurücksetzen"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* ANIMATION SIMULATION */}
          <button
            onClick={() => setIsAnimating(!isAnimating)}
            className={`px-2 py-1 rounded border border-black text-xs font-black uppercase flex items-center gap-1 transition-all shadow-sm ${
              isAnimating ? 'bg-emerald-500 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {isAnimating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAnimating ? 'Pause' : 'Play'}</span>
          </button>

          {/* HEATMAP CLOUD */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2 py-1 rounded border border-black text-xs font-black uppercase flex items-center gap-1 transition-all ${
              showHeatmap ? 'bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-slate-400'
            }`}
            title="3D-Heatmap Farbwolke ein/aus"
          >
            <Flame size={13} /> Heatmap
          </button>

          {/* SIDEBAR TOGGLE */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`px-2 py-1 rounded border border-black text-xs font-black uppercase flex items-center gap-1 transition-all ${
              isSidebarCollapsed ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Seitenleiste einklappen für maximale Spielfeld-Größe"
          >
            <Maximize2 size={13} />
            <span>{isSidebarCollapsed ? 'Menü' : 'Feld Max'}</span>
          </button>

          {/* FULLSCREEN TOGGLE */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-black rounded transition-colors"
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild aktivieren'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="p-1 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 border border-black rounded transition-colors"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* UNIFIED INTERACTIVE 3D TAKTIKTAFEL BOARD */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 my-3 overflow-hidden">
          
          {/* LEFT PANEL: SPIELPHASEN, FORMATIONEN & FORMATIONVERGLEICH */}
          {!isSidebarCollapsed && (
            <div className="bg-slate-900 border-4 border-black p-3 rounded shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              
              {/* SPIELPHASEN (MIT BALL / GEGEN BALL / UMSCHALTEN) */}
              <div>
                <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 mb-2">
                  <Zap size={14} /> SPIELPHASE (LAUFWEGE & BELASTUNG):
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'mit_ball', label: '🔵 MIT BALL (Offensiv)', color: 'bg-blue-600 text-white' },
                    { id: 'gegen_ball', label: '🔴 GEGEN DEN BALL (Defensiv & Pressing)', color: 'bg-red-600 text-white' },
                    { id: 'umschalten', label: '🟡 UMSCHALTEN (Blitzangriff / Rückzug)', color: 'bg-amber-500 text-black font-black' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPhase(p.id as GamePhase)}
                      className={`w-full text-left p-2 rounded border-2 border-black text-xs font-black uppercase transition-all flex items-center justify-between ${
                        phase === p.id ? `${p.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-[1.02]` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{p.label}</span>
                      {phase === p.id && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* FORMATION PRESETS (ALL 4 PRIMARY FORMATIONS) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <Sliders size={14} /> FORMATION WÄHLEN:
                  </label>
                  <button
                    onClick={() => setShowComparisonModal(true)}
                    className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded border border-black uppercase hover:bg-red-500 flex items-center gap-1"
                  >
                    <ArrowRightLeft size={12} /> Vergleich
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_FORMATIONS.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFormationChange(f)}
                      className={`p-2 rounded border-2 border-black text-xs font-black uppercase text-center transition-all ${
                        formation === f ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* SPIELAUFBAU-VARIANTE */}
              <div>
                <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 mb-2">
                  <Layers size={14} /> SPIELAUFBAU-VARIANTE:
                </label>
                <select
                  value={buildUpVariant}
                  onChange={(e) => setBuildUpVariant(e.target.value as BuildUpVariant)}
                  className="w-full bg-slate-950 border-2 border-black p-2 rounded text-xs font-black uppercase text-amber-300 focus:outline-none focus:border-amber-400"
                >
                  {(Object.keys(BUILD_UP_VARIANTS) as BuildUpVariant[]).map((vKey) => (
                    <option key={vKey} value={vKey}>
                      {BUILD_UP_VARIANTS[vKey].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MATCHDATEN & STANDARDS BUTTON */}
              <button
                onClick={() => setShowMatchAndStandardsModal(true)}
                className="w-full p-2.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Target size={16} /> 🎯 Standards & Matchdaten
              </button>

              {/* TRAINER-ANALYSE PROFI-BUTTON */}
              <button
                onClick={() => setShowTrainerAnalysisModal(true)}
                className="w-full p-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-black rounded text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <BookOpen size={16} /> Profi-Trainer Analyse öffnen
              </button>

              {/* POSITION PROFILE SELECTOR */}
              <div>
                <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 mb-2">
                  <Compass size={14} /> SPIELER-ANALYSE (11 SPIELER):
                </label>
                <div className="flex flex-wrap gap-1">
                  {runProfiles.map((prof) => (
                    <button
                      key={prof.positionKey}
                      onClick={() => handleOpenPlayerScouting(prof.positionKey)}
                      className={`px-2.5 py-1 rounded border border-black text-[11px] font-black uppercase transition-all ${
                        selectedPlayerPos === prof.positionKey
                          ? 'bg-red-600 text-white shadow-sm ring-2 ring-amber-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {prof.positionKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR INTENSITY & LOAD LEGEND */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-700 space-y-1.5 text-[10px] font-mono">
                <span className="text-amber-300 font-bold uppercase block">BELASTUNGSANZEIGE & LINIENFARBEN</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  <span>Blau = MIT Ball (Offensiv)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                  <span>Rot = GEGEN den Ball (Defensiv)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                  <span>Gelb = Umschaltbewegung</span>
                </div>
              </div>
            </div>
          )}

          {/* CENTER & RIGHT: VOLLFELD-TAKTIKTAFEL 3D OR 4-SYSTEME MATRIX */}
          <div className={`${isSidebarCollapsed ? 'lg:col-span-4' : 'lg:col-span-3'} flex flex-col gap-3 h-full overflow-hidden transition-all duration-300`}>
            
            {/* SIMULTANEOUS 4-SYSTEMS MATRIX VIEW */}
            {isMatrixView ? (
              <div className="flex-1 bg-slate-950 border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between border-b-2 border-slate-800 pb-2 gap-2">
                  <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                    <Grid size={18} /> SIMULTANE 4-SYSTEME MATRIX (4-4-2, 4-2-3-1, 4-1-4-1, 3-4-3)
                  </h3>
                  
                  {/* Phase Switcher for Matrix */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
                    <button
                      onClick={() => setPhase('mit_ball')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded transition-all ${
                        phase === 'mit_ball' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔵 Mit Ball
                    </button>
                    <button
                      onClick={() => setPhase('gegen_ball')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded transition-all ${
                        phase === 'gegen_ball' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔴 Gegen den Ball
                    </button>
                    <button
                      onClick={() => setPhase('umschalten')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded transition-all ${
                        phase === 'umschalten' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🟡 Umschalten
                    </button>
                  </div>
                </div>

                {/* 2x2 MATRIX GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  {ALL_FORMATIONS.map((fKey) => {
                    const fData = FORMATION_REPOSITORY[fKey] || FORMATION_REPOSITORY['4-2-3-1'];
                    const isSelectedForm = formation === fKey;

                    return (
                      <div 
                        key={fKey}
                        className={`bg-slate-900 border-2 ${isSelectedForm ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-800'} p-3 rounded-xl flex flex-col gap-2 relative group hover:border-slate-500 transition-all`}
                      >
                        {/* HEADER FOR EACH MINI SYSTEM */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                            {fData.name}
                          </span>
                          <button
                            onClick={() => { setFormation(fKey); setIsMatrixView(false); }}
                            className="text-[10px] bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded border border-black uppercase shadow-sm transition-all"
                          >
                            Hauptansicht
                          </button>
                        </div>

                        {/* TACTICAL METRICS BADGES */}
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                            Pressing: {fData.pressingHeight}
                          </span>
                          <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                            Kompaktheit: {fData.kompaktheit}
                          </span>
                        </div>

                        {/* MINI PITCH SVG */}
                        <div className="w-full h-[240px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative flex items-center justify-center">
                          <svg viewBox="0 0 520 800" className="w-full h-full drop-shadow">
                            <rect x="0" y="0" width="520" height="800" fill="#0f381e" rx="12" />
                            <rect x="30" y="40" width="460" height="720" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />
                            <line x1="30" y1="400" x2="490" y2="400" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />
                            <circle cx="260" cy="400" r="60" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />
                            <rect x="145" y="40" width="230" height="120" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
                            <rect x="145" y="640" width="230" height="120" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" />

                            {/* RUN PATHS */}
                            {fData.positions.map((p) => {
                              const rawD = phase === 'mit_ball' ? p.pathDMitBall : phase === 'gegen_ball' ? p.pathDGegenBall : p.pathDUmschalten;
                              const mappedD = mapPathD(rawD, true);
                              return (
                                <g key={`m-${fKey}-${p.positionKey}`}>
                                  <path
                                    d={mappedD}
                                    fill="none"
                                    stroke={PHASE_COLOR[phase]}
                                    strokeWidth={p.strokeWidth}
                                    opacity={0.7}
                                  />
                                </g>
                              );
                            })}

                            {/* PLAYER NODES */}
                            {fData.positions.map((p) => {
                              const m = mapPoint(p.nodeCoords2D.x, p.nodeCoords2D.y, true);
                              return (
                                <g key={`mnode-${fKey}-${p.positionKey}`}>
                                  <circle cx={m.x} cy={m.y} r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                                  <text x={m.x} y={m.y + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="monospace">
                                    {p.positionKey}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* PRIMARY SINGLE 3D PITCH CONTAINER WITH PERSPECTIVE TILT */
              <div className="flex-1 bg-slate-950 border-2 sm:border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-auto custom-scrollbar flex items-center justify-center p-3 sm:p-6">
                {/* BACKGROUND GRADIENT */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950/80 to-slate-950 pointer-events-none" />

                {/* 3D TRANSFORMED STAGE */}
                <div 
                  className="relative transition-transform duration-300 ease-out origin-center shrink-0"
                  style={{
                    transform: is3DPerspective ? `rotateX(${tiltAngle}deg) scale(${zoomLevel})` : `rotateX(0deg) scale(${zoomLevel})`,
                    transformStyle: 'preserve-3d',
                    width: isVerticalPitch ? '520px' : '800px',
                    height: isVerticalPitch ? '780px' : '520px'
                  }}
                >
                  {/* SVG PITCH GROUND WITH OFFICIAL MARKINGS */}
                  <svg viewBox={isVerticalPitch ? "0 0 520 800" : "0 0 800 520"} className="w-full h-full drop-shadow-2xl overflow-visible">
                    {/* PITCH GRASS BACKGROUND & STRIPES */}
                    <rect x="0" y="0" width={isVerticalPitch ? "520" : "800"} height={isVerticalPitch ? "800" : "520"} fill="#0f381e" rx="16" />
                    
                    {/* Grass Stripes */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      isVerticalPitch ? (
                        <rect key={i} x="0" y={i * 80} width="520" height="40" fill="#144726" opacity="0.4" />
                      ) : (
                        <rect key={i} x={i * 80} y="0" width="40" height="520" fill="#144726" opacity="0.4" />
                      )
                    ))}

                    {/* OUTLINE & BOUNDARIES */}
                    {isVerticalPitch ? (
                      <>
                        <rect x="30" y="40" width="460" height="720" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <line x1="30" y1="400" x2="490" y2="400" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <circle cx="260" cy="400" r="70" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <circle cx="260" cy="400" r="4" fill="#ffffff" />

                        {/* BOTTOM GOAL BOX (AUGGEN EIGENES TOR) */}
                        <rect x="145" y="630" width="230" height="130" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <rect x="200" y="715" width="120" height="45" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                        <circle cx="260" cy="665" r="3" fill="#ffffff" />
                        <path d="M 215 630 A 70 70 0 0 1 305 630" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />

                        {/* TOP GOAL BOX (GEGNER PENALTY AREA) */}
                        <rect x="145" y="40" width="230" height="130" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <rect x="200" y="40" width="120" height="45" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                        <circle cx="260" cy="135" r="3" fill="#ffffff" />
                        <path d="M 215 170 A 70 70 0 0 0 305 170" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                      </>
                    ) : (
                      <>
                        <rect x="40" y="30" width="720" height="460" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <line x1="400" y1="30" x2="400" y2="490" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <circle cx="400" cy="260" r="70" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <circle cx="400" cy="260" r="4" fill="#ffffff" />

                        {/* LEFT GOAL BOX */}
                        <rect x="40" y="145" width="130" height="230" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <rect x="40" y="200" width="45" height="120" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                        <circle cx="135" cy="260" r="3" fill="#ffffff" />
                        <path d="M 170 215 A 70 70 0 0 1 170 305" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />

                        {/* RIGHT GOAL BOX */}
                        <rect x="630" y="145" width="130" height="230" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
                        <rect x="715" y="200" width="45" height="120" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                        <circle cx="665" cy="260" r="3" fill="#ffffff" />
                        <path d="M 630 215 A 70 70 0 0 0 630 305" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                      </>
                    )}

                    {/* HEATMAP CLOUD OVERLAY */}
                    {showHeatmap && (
                      <defs>
                        <radialGradient id="heatGradient" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                    )}
                    {showHeatmap && runProfiles.map((p) => 
                      p.heatmapCoords.map((h, i) => {
                        const m = mapPoint(h.x, h.y, isVerticalPitch);
                        return (
                          <circle 
                            key={`${p.positionKey}-h-${i}`} 
                            cx={m.x} 
                            cy={m.y} 
                            r={h.r} 
                            fill="url(#heatGradient)" 
                            className="animate-pulse"
                          />
                        );
                      })
                    )}

                    {/* RUN CURVES (SVG PATHS) FOR ALL 11 POSITIONS */}
                    {runProfiles.map((p) => {
                      const isSelected = selectedPlayerPos === p.positionKey;
                      const rawPathD = phase === 'mit_ball' ? p.pathDMitBall : phase === 'gegen_ball' ? p.pathDGegenBall : p.pathDUmschalten;
                      const pathD = mapPathD(rawPathD, isVerticalPitch);
                      const lineColor = PHASE_COLOR[phase];
                      const strokeWidth = showLoadZones ? p.strokeWidth : 5;

                      return (
                        <g key={`run-${p.positionKey}`}>
                          {/* PATH LINE WITH LOAD-BASED STROKE WIDTH */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={isSelected ? '#f59e0b' : lineColor}
                            strokeWidth={isSelected ? strokeWidth + 3 : strokeWidth}
                            strokeDasharray={phase === 'gegen_ball' ? '8,4' : 'none'}
                            opacity={isSelected ? 1 : 0.75}
                            className="transition-all duration-300"
                          />

                          {/* ANIMATED PULSING NODE MARKER ALONG PATH */}
                          {isAnimating && (
                            <circle
                              cx={getPointOnPathProgress(rawPathD, animProgress).x}
                              cy={getPointOnPathProgress(rawPathD, animProgress).y}
                              r={isSelected ? 7 : 5}
                              fill={isSelected ? '#fbbf24' : lineColor}
                              className="animate-pulse"
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* 3D PLAYER NODES (11 FC AUGGEN PLAYERS) */}
                    {runProfiles.map((p) => {
                      const isSelected = selectedPlayerPos === p.positionKey;
                      const { x: nodeX, y: nodeY } = mapPoint(p.nodeCoords2D.x, p.nodeCoords2D.y, isVerticalPitch);

                      return (
                        <g 
                          key={`node-${p.positionKey}`}
                          onClick={() => handleOpenPlayerScouting(p.positionKey)}
                          className="cursor-pointer group"
                        >
                          {/* SELECTION GLOW */}
                          {isSelected && (
                            <circle cx={nodeX} cy={nodeY} r="24" fill="#f59e0b" opacity="0.35" className="animate-ping" />
                          )}

                          {/* PLAYER NODE DISK */}
                          <circle 
                            cx={nodeX} 
                            cy={nodeY} 
                            r={isSelected ? 18 : 15} 
                            fill={isSelected ? '#ef4444' : '#1e293b'} 
                            stroke={isSelected ? '#fbbf24' : '#38bdf8'} 
                            strokeWidth={isSelected ? 3.5 : 2}
                            className="transition-all transform group-hover:scale-110"
                          />

                          {/* POSITION TEXT LABEL */}
                          <text
                            x={nodeX}
                            y={nodeY + 4}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={isSelected ? "12" : "10"}
                            fontWeight="900"
                            fontFamily="monospace"
                            pointerEvents="none"
                          >
                            {p.positionKey}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* OVERLAY TRAINER HUD (TACTICAL COCKPIT ON PITCH) */}
                  {showTrainerHUD && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 border-2 border-black p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs border-amber-400/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-600 border border-black flex items-center justify-center font-black text-white shrink-0">
                          {selectedPlayerPos}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-amber-400 uppercase tracking-wider">
                              POSITION {selectedPlayerPos} ({phase.toUpperCase()})
                            </span>
                            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              Belastung: {proAnalysis.loadProfileSummary.split('Belastungsstufe')[1] || 'Hoch'}
                            </span>
                          </div>
                          <p className="text-slate-200 font-medium text-[11px] mt-0.5">
                            {phase === 'mit_ball' ? currentFormationData.positions.find(p=>p.positionKey===selectedPlayerPos)?.trainerAdviceMitBall : currentFormationData.positions.find(p=>p.positionKey===selectedPlayerPos)?.trainerAdviceGegenBall}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPlayerScouting(selectedPlayerPos)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-black uppercase text-xs flex items-center gap-1 shadow-sm transition-all shrink-0"
                        >
                          <UserCheck size={14} /> Spieler-Profil
                        </button>
                        <button
                          onClick={() => setShowTrainerAnalysisModal(true)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg font-black uppercase text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
                        >
                          <BookOpen size={14} /> Trainer-Analyse ({formation})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BOTTOM TRAINER EXECUTIVE SUMMARY & QUICK TACTICAL PRESETS */}
            <div className="bg-slate-900 border-4 border-black p-3 rounded shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-400 text-black border-2 border-black font-black flex items-center justify-center rounded">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    TAKTIK & SPIELAUFBAU STATUS
                  </h4>
                  <p className="text-xs text-slate-200 font-bold">
                    Formation: <span className="text-amber-300 font-mono">{formation}</span> • Aufbau: <span className="text-emerald-400">{proAnalysis.buildUpDetails.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setBuildUpVariant('fluegel_lang');
                    setPhase('mit_ball');
                    setActiveToast('Variante: Flügel Lang (ST weicht aus, 10er rückt nach) aktiviert!');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white border-2 border-black rounded text-xs font-black uppercase flex items-center gap-1 shadow-sm transition-all"
                >
                  <Zap size={14} /> Spezial-Aufbau (Flügel + ST + 10er)
                </button>
                <button
                  onClick={() => setShowTrainerAnalysisModal(true)}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <BookOpen size={14} /> Vollanalyse Öffnen
                </button>
              </div>
            </div>

          </div>
        </div>

      {/* MATCHDATEN & STANDARDS MODAL */}
      {showMatchAndStandardsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-black p-6 rounded-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full text-white space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 text-white border-2 border-black flex items-center justify-center font-black">
                  <Target size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-amber-400 tracking-wider">
                    MATCHDATEN & STANDARDS-ANALYSE (ECKEN, FREISTÖSSE, EINWÜRFE)
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    Verbandsliga Match-Planer & Einstudierte Standard-Varianten mit Erfolgsquote
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMatchAndStandardsModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-red-600 rounded text-slate-300 border border-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* MATCH REPORT SELECTION */}
            {matches.length > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-lg border-2 border-black flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-amber-400" />
                  <span className="text-xs font-black uppercase">SPIELBERICHT WÄHLEN:</span>
                </div>
                <select
                  value={selectedMatchReportId || ''}
                  onChange={(e) => {
                    setSelectedMatchReportId(e.target.value);
                    const selM = matches.find((m: any) => m.id === e.target.value);
                    if (selM) applyMatchplanToBoard(selM);
                  }}
                  className="bg-slate-900 border-2 border-black text-amber-300 text-xs font-bold p-2 rounded focus:outline-none"
                >
                  {matches.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      vs. {m.opponent || 'Gegner'} ({m.date || 'Aktuell'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* SET-PIECE CATEGORY TABS */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              {(['Ecke', 'Freistoß', 'Einwurf'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveSetPieceCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-black uppercase text-xs border-2 transition-all ${
                    activeSetPieceCategory === cat
                      ? 'bg-amber-400 text-slate-950 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {cat === 'Ecke' ? '⛳ ECKEN' : cat === 'Freistoß' ? '⚽ FREISTÖSSE' : '🖐️ EINWÜRFE'}
                </button>
              ))}
            </div>

            {/* SET PIECE VARIANTS DISPLAY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SET_PIECES_DATABASE.filter(s => s.category === activeSetPieceCategory).map((sp) => (
                <div key={sp.id} className="bg-slate-950 border-2 border-black p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-black text-amber-300 text-xs uppercase">{sp.name}</h4>
                    <span className="bg-emerald-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded border border-black">
                      {sp.erfolgsquote}% Erfolgsquote
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-200">
                    <strong className="text-amber-400 block text-[11px] uppercase">Ablauf & Staffelung:</strong>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                      {sp.executionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="text-slate-400">Zielzone: <strong className="text-white">{sp.targetZone}</strong></span>
                    <span className="text-amber-300">Beteiligt: {sp.participatingPositions.join(', ')}</span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-slate-300 italic">
                    💡 Trainer-Tipp: {sp.trainerNote}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowMatchAndStandardsModal(false)}
                className="bg-amber-400 hover:bg-amber-500 text-black font-black uppercase px-5 py-2.5 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER SCOUTING & PERFORMANCE OVERLAY */}
      {selectedScoutingProfile && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-black p-6 rounded-xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full text-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 text-white font-black border-2 border-black flex items-center justify-center text-sm">
                  {selectedScoutingProfile.positionKey}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-amber-400">
                    {selectedScoutingProfile.playerName}
                  </h3>
                  <span className="text-xs text-slate-300 font-mono font-bold">
                    Position: {selectedScoutingProfile.positionKey} • Note: {selectedScoutingProfile.matchRating} / 10
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedScoutingProfile(null)}
                className="p-1.5 bg-slate-800 hover:bg-red-600 rounded text-slate-300 border border-black"
              >
                <X size={18} />
              </button>
            </div>

            {/* PERFORMANCE METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[9px] uppercase block">Laufdistanz</span>
                <span className="text-amber-300 font-black text-sm">{selectedScoutingProfile.runDistanceKm} km</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[9px] uppercase block">Passquote</span>
                <span className="text-emerald-400 font-black text-sm">{selectedScoutingProfile.passAccuracyPct}%</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[9px] uppercase block">Zweikampf</span>
                <span className="text-blue-400 font-black text-sm">{selectedScoutingProfile.tackleWinPct}%</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[9px] uppercase block">Sprints (&gt;25km/h)</span>
                <span className="text-red-400 font-black text-sm">{selectedScoutingProfile.sprintsCount}</span>
              </div>
            </div>

            {/* STRENGTHS */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
              <strong className="text-amber-300 block text-[11px] uppercase">Top-Stärken & Profiling:</strong>
              <ul className="list-disc list-inside space-y-1 text-slate-200">
                {selectedScoutingProfile.topStrengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* LEVEL 3 EVALUATION MANDATORY SENTENCE */}
            <div className="bg-red-950/70 p-3 rounded-lg border border-red-500 text-amber-300 text-xs font-mono font-bold italic text-center">
              {selectedScoutingProfile.level3MandatorySentence}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedScoutingProfile(null)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black uppercase px-4 py-2 rounded border-2 border-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMATION COMPARISON MODAL */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-black p-5 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-black uppercase text-amber-400 flex items-center gap-2">
                <ArrowRightLeft size={20} /> UNTERSCHIEDS-ANALYSE: {comparison.fromFormation} ➔ {comparison.toFormation}
              </h3>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="p-1 bg-slate-800 hover:bg-red-600 rounded text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="font-bold text-amber-300 block mb-1 uppercase">ZUSAMMENFASSUNG FORMATIONSWECHSEL:</span>
                <p className="text-slate-200 leading-relaxed">{comparison.summaryText}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded border border-blue-900">
                  <span className="font-bold text-blue-400 block mb-1 uppercase">VERÄNDERUNGEN MIT BALL:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {comparison.mitBallChanges.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950 p-3 rounded border border-red-900">
                  <span className="font-bold text-red-400 block mb-1 uppercase">VERÄNDERUNGEN GEGEN DEN BALL:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {comparison.gegenBallChanges.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="bg-amber-400 hover:bg-amber-500 text-black font-black uppercase px-4 py-2 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Verstanden & Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFI TRAINER-ANALYSE MODAL */}
      {showTrainerAnalysisModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-black p-6 rounded-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full text-white space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 text-white border-2 border-black flex items-center justify-center font-black">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-amber-400 tracking-wider">
                    PROFI-TRAINER ANALYSE & EMPFEHLUNGEN
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    {activeClub.name} Taktik-Engine • Formation {formation} • {proAnalysis.philosophyDetails.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTrainerAnalysisModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-red-600 rounded text-slate-300 border border-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tactical Badges */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <span className="bg-blue-600 text-white px-2.5 py-1 rounded border border-black font-bold">
                Formation: {formation}
              </span>
              <span className="bg-amber-500 text-black px-2.5 py-1 rounded border border-black font-black">
                Phase: {phase.toUpperCase()}
              </span>
              <span className="bg-red-600 text-white px-2.5 py-1 rounded border border-black font-bold">
                Position: {selectedPlayerPos}
              </span>
              <span className="bg-emerald-600 text-white px-2.5 py-1 rounded border border-black font-bold">
                {proAnalysis.philosophyDetails.name}
              </span>
            </div>

            {/* Analysis Sections */}
            <div className="space-y-4 text-xs">
              
              {/* 1. SPIELAUFBAU (MIT BALL) */}
              <div className="bg-slate-950 p-4 rounded border-2 border-blue-600 space-y-2">
                <h4 className="font-black text-blue-400 uppercase text-xs flex items-center gap-2">
                  <Target size={16} /> 1. SPIELAUFBAU (MIT BALL)
                </h4>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {proAnalysis.mitBallSummary}
                </p>
                <div className="pt-2 border-t border-slate-800 text-slate-300 font-mono">
                  <strong className="text-amber-300">Variante:</strong> {proAnalysis.buildUpDetails.name}<br />
                  <strong className="text-amber-300">Ziel:</strong> {proAnalysis.buildUpDetails.goal}
                </div>
              </div>

              {/* 2. GEGEN DEN BALL & PRESSING */}
              <div className="bg-slate-950 p-4 rounded border-2 border-red-600 space-y-2">
                <h4 className="font-black text-red-400 uppercase text-xs flex items-center gap-2">
                  <ShieldAlert size={16} /> 2. GEGEN DEN BALL (DEFENSIV & PRESSING)
                </h4>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {proAnalysis.gegenBallSummary}
                </p>
              </div>

              {/* 3. UMSCHALTEN */}
              <div className="bg-slate-950 p-4 rounded border-2 border-amber-500 space-y-2">
                <h4 className="font-black text-amber-400 uppercase text-xs flex items-center gap-2">
                  <Zap size={16} /> 3. UMSCHALTBEWEGUNG & COMPACTNESS
                </h4>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {proAnalysis.umschaltSummary}
                </p>
              </div>

              {/* 4. BELASTUNGSPROFIL */}
              <div className="bg-slate-950 p-4 rounded border-2 border-emerald-600 space-y-2">
                <h4 className="font-black text-emerald-400 uppercase text-xs flex items-center gap-2">
                  <Activity size={16} /> 4. BELASTUNGSANALYSE FOR POSITION {selectedPlayerPos}
                </h4>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {proAnalysis.loadProfileSummary}
                </p>
              </div>

              {/* 5. KONKRETE TRAINER-EMPFEHLUNGEN */}
              <div className="bg-slate-950 p-4 rounded border-2 border-amber-400 space-y-2">
                <h4 className="font-black text-amber-300 uppercase text-xs flex items-center gap-2">
                  <Award size={16} /> 5. KONKRETE TRAINER-EMPFEHLUNGEN
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 font-medium">
                  {proAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* LEVEL 3 EVALUATION MANDATORY SENTENCE */}
              <div className="bg-red-950/60 p-3 rounded border border-red-500 text-amber-300 font-mono text-center font-bold italic">
                {proAnalysis.level3Sentence}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowTrainerAnalysisModal(false)}
                className="bg-amber-400 hover:bg-amber-500 text-black font-black uppercase px-5 py-2.5 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Analyse Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { VideoClip, Spieler, Player } from '../types';
import { 
  Video, 
  Plus, 
  Trash2, 
  Play, 
  ExternalLink, 
  X, 
  Upload, 
  Film, 
  Tag, 
  User, 
  Clock, 
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const getEmbedVideoUrl = (url: string): { type: 'iframe' | 'video' | 'link'; embedUrl: string } => {
  if (!url) return { type: 'link', embedUrl: '' };
  
  const cleanUrl = url.trim();

  // YouTube
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: 'iframe', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };
  }
  
  // Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: 'iframe', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  }

  // Direct video formats (or blob / data URL)
  if (
    cleanUrl.startsWith('data:video') || 
    cleanUrl.startsWith('blob:') || 
    /\.(mp4|webm|ogg|mov)($|\?)/i.test(cleanUrl)
  ) {
    return { type: 'video', embedUrl: cleanUrl };
  }

  return { type: 'link', embedUrl: cleanUrl };
};

interface VideoSectionProps {
  title?: string;
  subtitle?: string;
  categoryFilter?: 'Spiel-Analyse' | 'Gegner-Analyse' | 'Spieler-Momente' | 'Training' | 'Taktik' | 'Sonstiges' | 'ALL';
  clips?: VideoClip[];
  onUpdateClips: (clips: VideoClip[]) => void;
  players?: (Spieler | Player)[];
  defaultCategory?: 'Spiel-Analyse' | 'Gegner-Analyse' | 'Spieler-Momente' | 'Training' | 'Taktik' | 'Sonstiges';
  accentColor?: string;
}

export const VideoSection: React.FC<VideoSectionProps> = ({
  title = "Video-Analyse & Highlight-Szenen",
  subtitle = "Analysen, Gegner-Videos und Spieler-Momente im Überblick",
  categoryFilter = 'ALL',
  clips = [],
  onUpdateClips,
  players = [],
  defaultCategory = 'Spiel-Analyse',
  accentColor = '#C00000'
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeClip, setActiveClip] = useState<VideoClip | null>(null);

  // New clip form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Spiel-Analyse' | 'Gegner-Analyse' | 'Spieler-Momente' | 'Training' | 'Taktik' | 'Sonstiges'>(defaultCategory);
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTimestamp, setNewTimestamp] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [fileUploading, setFileUploading] = useState(false);

  const filteredClips = categoryFilter === 'ALL' 
    ? clips 
    : clips.filter(c => c.category === categoryFilter);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploading(true);
    // Create local object URL for instant high-perf playback
    const blobUrl = URL.createObjectURL(file);
    setNewUrl(blobUrl);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    setFileUploading(false);
  };

  const handleAddClip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    const clip: VideoClip = {
      id: `vid_${Date.now()}`,
      title: newTitle.trim() || 'Video-Ausschnitt',
      category: newCategory,
      url: newUrl.trim(),
      description: newDescription.trim(),
      timestamp: newTimestamp.trim(),
      playerNames: selectedPlayers,
      createdAt: new Date().toLocaleDateString('de-DE')
    };

    onUpdateClips([...clips, clip]);
    
    // Reset
    setNewTitle('');
    setNewUrl('');
    setNewDescription('');
    setNewTimestamp('');
    setSelectedPlayers([]);
    setIsAddModalOpen(false);
  };

  const handleDeleteClip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateClips(clips.filter(c => c.id !== id));
    if (activeClip?.id === id) {
      setActiveClip(null);
    }
  };

  const togglePlayerSelection = (pName: string) => {
    if (selectedPlayers.includes(pName)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== pName));
    } else {
      setSelectedPlayers([...selectedPlayers, pName]);
    }
  };

  return (
    <div className="bg-[#1E293B] border-4 border-black p-4 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-4 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-black text-white rounded-none">
            <Video size={20} className="text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider italic flex items-center gap-2">
              {title}
            </h3>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {subtitle} ({filteredClips.length} {filteredClips.length === 1 ? 'Video' : 'Videos'})
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-black hover:bg-red-700 text-white font-black uppercase text-xs px-4 py-2 flex items-center gap-2 transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]"
        >
          <Plus size={16} /> VIDEO HINZUFÜGEN
        </button>
      </div>

      {/* Video Grid */}
      {filteredClips.length === 0 ? (
        <div className="border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50">
          <Film size={32} className="mx-auto mb-2 opacity-30 text-slate-600" />
          <p className="text-xs font-black uppercase text-slate-400">Keine Videos oder Szenen in dieser Kategorie hinterlegt.</p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase text-red-600 hover:underline"
          >
            <Plus size={14} /> Jetzt Video oder Veo-Link eintragen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredClips.map((clip) => {
            const videoInfo = getEmbedVideoUrl(clip.url);
            
            return (
              <div 
                key={clip.id}
                onClick={() => setActiveClip(clip)}
                className="group border-2 border-black bg-slate-50 hover:bg-amber-50/50 transition-all cursor-pointer relative flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
              >
                {/* Thumbnail / Play Preview Box */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b-2 border-black">
                  {videoInfo.type === 'iframe' ? (
                    <iframe 
                      src={videoInfo.embedUrl.replace('?autoplay=1', '')} 
                      className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" 
                      title={clip.title}
                    />
                  ) : videoInfo.type === 'video' ? (
                    <video 
                      src={videoInfo.embedUrl} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <ExternalLink size={28} className="text-red-500 mb-1" />
                      <span className="text-[9px] font-black uppercase text-white/70 truncate max-w-full px-2">{clip.url}</span>
                    </div>
                  )}

                  {/* Play Overlay Icon */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play size={20} className="ml-1" />
                    </div>
                  </div>

                  {/* Category Tag */}
                  <span className="absolute top-2 left-2 bg-black/80 text-white text-[8px] font-black uppercase px-2 py-0.5 border border-white/20 backdrop-blur-sm">
                    {clip.category}
                  </span>

                  {/* Timestamp Badge */}
                  {clip.timestamp && (
                    <span className="absolute bottom-2 right-2 bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 flex items-center gap-1">
                      <Clock size={10} /> {clip.timestamp}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-tight line-clamp-1 group-hover:text-red-600 transition-colors">
                      {clip.title}
                    </h4>
                    {clip.description && (
                      <p className="text-[10px] text-slate-600 font-medium line-clamp-2 mt-1">
                        {clip.description}
                      </p>
                    )}
                  </div>

                  {/* Tagged Players */}
                  {clip.playerNames && clip.playerNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clip.playerNames.map((p, i) => (
                        <span key={i} className="bg-amber-200 text-amber-950 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-none border border-amber-400 flex items-center gap-0.5">
                          <User size={8} /> {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-1 text-[9px] font-bold text-slate-400">
                    <span>{clip.createdAt || 'Video'}</span>
                    <button 
                      onClick={(e) => handleDeleteClip(clip.id, e)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Lightbox Player Modal */}
      <AnimatePresence>
        {activeClip && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-4 border-white w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-neutral-900 border-b-2 border-white/20 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1">
                    {activeClip.category}
                  </span>
                  <div>
                    <h3 className="font-black text-sm uppercase italic tracking-wider">{activeClip.title}</h3>
                    {activeClip.timestamp && (
                      <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                        <Clock size={10} /> Szenen-Zeitpunkt: {activeClip.timestamp}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setActiveClip(null)}
                  className="text-white/60 hover:text-white p-1 hover:bg-[#1E293B]/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Video Player Display */}
              <div className="flex-1 bg-black aspect-video relative flex items-center justify-center">
                {(() => {
                  const info = getEmbedVideoUrl(activeClip.url);
                  if (info.type === 'iframe') {
                    return (
                      <iframe 
                        src={info.embedUrl} 
                        className="w-full h-full border-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        title={activeClip.title}
                      />
                    );
                  }
                  if (info.type === 'video') {
                    return (
                      <video 
                        src={info.embedUrl} 
                        controls 
                        autoPlay 
                        className="w-full h-full max-h-[60vh] object-contain"
                      />
                    );
                  }
                  return (
                    <div className="p-8 text-center text-white space-y-4">
                      <Video size={48} className="mx-auto text-red-500" />
                      <p className="font-black uppercase text-sm">Externes Analyse-Video</p>
                      <a 
                        href={activeClip.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs px-6 py-3 border-2 border-white"
                      >
                        <ExternalLink size={16} /> Video in neuem Tab / Veo öffnen
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer Description */}
              {(activeClip.description || (activeClip.playerNames && activeClip.playerNames.length > 0)) && (
                <div className="bg-neutral-900 border-t-2 border-white/20 p-4 text-white space-y-2">
                  {activeClip.description && (
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {activeClip.description}
                    </p>
                  )}
                  {activeClip.playerNames && activeClip.playerNames.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-[10px]">
                      <span className="font-black uppercase text-amber-400">Beteiligte Spieler:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeClip.playerNames.map((p, idx) => (
                          <span key={idx} className="bg-[#1E293B]/10 px-2 py-0.5 font-bold uppercase text-slate-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Video Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1E293B] border-4 border-black p-6 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b-4 border-black pb-3">
                <h3 className="font-black text-sm uppercase italic flex items-center gap-2">
                  <Film size={18} className="text-red-600" /> Video / Szenen-Ausschnitt Hinzufügen
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="hover:text-red-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddClip} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Titel / Szenenbezeichnung *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="z.B. Pressing-Muster 1. HZ, Gegner-Eckball, Noah Tor-Chance..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border-2 border-black p-2 text-xs font-bold focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* Category Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                      Kategorie *
                    </label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full border-2 border-black p-2 text-xs font-bold focus:outline-none focus:border-red-600"
                    >
                      <option value="Spiel-Analyse">Spiel-Analyse</option>
                      <option value="Gegner-Analyse">Gegner-Analyse</option>
                      <option value="Spieler-Momente">Spieler-Momente</option>
                      <option value="Training">Training</option>
                      <option value="Taktik">Taktik</option>
                      <option value="Sonstiges">Sonstiges</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                      Spielminute / Zeitstempel
                    </label>
                    <input 
                      type="text"
                      placeholder="z.B. Min. 24:10, 2. HZ"
                      value={newTimestamp}
                      onChange={(e) => setNewTimestamp(e.target.value)}
                      className="w-full border-2 border-black p-2 text-xs font-bold focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                {/* Mode Selector: URL vs Local File */}
                <div className="space-y-2">
                  <div className="flex border-2 border-black text-[10px] font-black uppercase">
                    <button 
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`flex-1 py-1.5 text-center ${uploadMode === 'url' ? 'bg-black text-white' : 'bg-slate-100 text-black'}`}
                    >
                      Video Link / Veo / YouTube
                    </button>
                    <button 
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex-1 py-1.5 text-center ${uploadMode === 'file' ? 'bg-black text-white' : 'bg-slate-100 text-black'}`}
                    >
                      Lokale Datei (MP4 / WebM)
                    </button>
                  </div>

                  {uploadMode === 'url' ? (
                    <div>
                      <input 
                        type="url"
                        placeholder="https://youtu.be/... oder Veo/Vimeo/MP4 Link"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="w-full border-2 border-black p-2 text-xs font-bold focus:outline-none focus:border-red-600"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-black p-4 text-center bg-slate-50 relative">
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload size={20} className="mx-auto mb-1 text-slate-500" />
                      <p className="text-[10px] font-black uppercase text-slate-600">
                        {newUrl ? 'Video-Datei ausgewählt!' : 'Video-Datei hierher ziehen oder klicken'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Analyse-Hinweise / Taktische Anmerkungen
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Was zeigt dieser Ausschnitt? Worauf soll geachtet werden?"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full border-2 border-black p-2 text-xs font-medium focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* Tagged Players Optional */}
                {players.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                      Spieler markieren (Spieler-Momente)
                    </label>
                    <div className="max-h-28 overflow-y-auto border-2 border-black p-2 bg-slate-50 flex flex-wrap gap-1 custom-scrollbar">
                      {players.map((p) => {
                        const name = ('name' in p && p.name) ? p.name : `${p.firstName} ${p.lastName}`;
                        const isSelected = selectedPlayers.includes(name);
                        return (
                          <button 
                            key={p.id}
                            type="button"
                            onClick={() => togglePlayerSelection(name)}
                            className={`text-[9px] font-black uppercase px-2 py-1 border transition-all ${isSelected ? 'bg-amber-400 text-black border-black font-black' : 'bg-[#1E293B] text-slate-700 border-slate-300'}`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border-2 border-black text-xs font-black uppercase hover:bg-slate-100"
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    disabled={!newUrl}
                    className="px-6 py-2 bg-red-600 text-white font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700 disabled:opacity-40"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

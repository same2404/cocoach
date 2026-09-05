import React, { useState } from 'react';
import { useClub } from '../contexts/ClubContext';
import { Shield, ChevronDown, Plus, Trash2, Settings, Eye, Edit3, Check, X, Bot } from 'lucide-react';

interface ClubSwitcherProps {
  onClubCreated?: (clubId: string, clubName: string, fbUrl?: string) => void;
}

export function ClubSwitcher({ onClubCreated }: ClubSwitcherProps) {
  const { clubs, activeClub, setActiveClubId, addClub, removeClub, isDemo } = useClub();
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFbUrl, setNewFbUrl] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const fbId = extractFbId(newFbUrl);
    const club = addClub({
      name: newName.trim(),
      shortName: newName.trim().split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase(),
      fbTeamId: fbId || undefined,
      isDemo: false,
    });
    setActiveClubId(club.id);
    const name = newName.trim();
    const fb = newFbUrl.trim();
    const web = newWebsite.trim();
    setNewName('');
    setNewFbUrl('');
    setNewWebsite('');
    setShowAdd(false);
    setIsOpen(false);
    if (onClubCreated) {
      setTimeout(() => onClubCreated(club.id, name, fb || undefined), 300);
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      removeClub(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all bg-slate-900 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800"
      >
        {isDemo ? (
          <Eye size={14} className="text-amber-400" />
        ) : (
          <Settings size={14} className="text-emerald-400" />
        )}
        <span className="text-xs font-bold text-white max-w-[140px] truncate">
          {activeClub.name}
        </span>
        {isDemo && (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            DEMO
          </span>
        )}
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
              Verein wechseln ({clubs.length})
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {clubs.map(club => (
              <div
                key={club.id}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all ${
                  club.id === activeClub.id
                    ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                    : 'hover:bg-slate-800 border-l-2 border-transparent'
                }`}
                onClick={() => {
                  setActiveClubId(club.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{club.name}</span>
                    {club.isDemo && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        DEMO
                      </span>
                    )}
                    {club.status === 'setup' && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        SETUP
                      </span>
                    )}
                  </div>
                  {club.league && (
                    <span className="text-[10px] text-slate-500">{club.league}</span>
                  )}
                </div>
                {club.id === activeClub.id && (
                  <Check size={14} className="text-emerald-400 shrink-0" />
                )}
                {!club.isDemo && club.id !== 'fc-auggen' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(club.id);
                    }}
                    className="p-1 rounded hover:bg-red-500/20 shrink-0"
                  >
                    {confirmDelete === club.id ? (
                      <span className="text-[9px] font-bold text-red-400">Löschen?</span>
                    ) : (
                      <Trash2 size={12} className="text-slate-500 hover:text-red-400" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 p-2">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all"
              >
                <Plus size={14} />
                Neuen Verein hinzufügen
              </button>
            ) : (
              <div className="space-y-2 p-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Vereinsname (z.B. SV Musterstadt)"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  value={newFbUrl}
                  onChange={e => setNewFbUrl(e.target.value)}
                  placeholder="fussball.de Team-URL (optional)"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={newWebsite}
                  onChange={e => setNewWebsite(e.target.value)}
                  placeholder="Vereinswebsite (optional, z.B. fc-auggen.de)"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Bot size={12} />
                    Erstellen & Daten laden
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setNewName(''); setNewFbUrl(''); setNewWebsite(''); }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[9px] text-slate-600">
                  Naomi lädt automatisch Daten von fussball.de, kicker.de & Vereinswebsite.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function extractFbId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/team\/([A-Z0-9]+)/i) || url.match(/([A-Z0-9]{20,})/);
  return match ? match[1] : null;
}

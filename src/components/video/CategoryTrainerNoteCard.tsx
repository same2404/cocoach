import React, { useState, useEffect } from 'react';
import { FileText, Check, AlertCircle, Bookmark } from 'lucide-react';
import { VideoCategory } from '../views/VideoAnalysisView';

export interface CategoryTrainerNote {
  id: string; // The category name, e.g. 'Spielaufbau'
  category: VideoCategory;
  note: string;
  focusPriority?: 'hoch' | 'mittel' | 'niedrig';
  updatedAt: string;
}

interface CategoryTrainerNoteCardProps {
  category: VideoCategory;
  noteData?: CategoryTrainerNote;
  onSave: (category: VideoCategory, noteText: string, priority?: 'hoch' | 'mittel' | 'niedrig') => Promise<void>;
}

export const CategoryTrainerNoteCard: React.FC<CategoryTrainerNoteCardProps> = ({
  category,
  noteData,
  onSave
}) => {
  const [text, setText] = useState<string>(noteData?.note || '');
  const [priority, setPriority] = useState<'hoch' | 'mittel' | 'niedrig'>(noteData?.focusPriority || 'mittel');
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  useEffect(() => {
    setText(noteData?.note || '');
    setPriority(noteData?.focusPriority || 'mittel');
  }, [noteData]);

  const handleBlur = async () => {
    await onSave(category, text, priority);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handlePriorityChange = async (p: 'hoch' | 'mittel' | 'niedrig') => {
    setPriority(p);
    await onSave(category, text, p);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#2A3447] bg-[#101726]/80 rounded-xl p-4 border border-[#242F42] space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-[#10B981]/20 text-[#10B981] rounded">
            <FileText size={15} />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Trainer-Fazit & Schwerpunkte zu „{category}"
          </span>
        </div>

        {/* Priority and Auto-save indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0A0E17] p-0.5 rounded-lg border border-[#2A3447]">
            <button
              type="button"
              onClick={() => handlePriorityChange('hoch')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                priority === 'hoch' ? 'bg-rose-500 text-white' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              🔴 Hohe Priorität
            </button>
            <button
              type="button"
              onClick={() => handlePriorityChange('mittel')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                priority === 'mittel' ? 'bg-amber-500 text-black font-black' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              🟡 Standard
            </button>
            <button
              type="button"
              onClick={() => handlePriorityChange('niedrig')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                priority === 'niedrig' ? 'bg-emerald-500 text-black font-black' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              🟢 Vorbildlich
            </button>
          </div>

          <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
            {savedStatus ? (
              <span className="text-[#10B981] font-bold flex items-center gap-0.5">
                <Check size={12} /> Gespeichert
              </span>
            ) : noteData?.updatedAt ? (
              <span>Aktualisiert: {new Date(noteData.updatedAt).toLocaleDateString('de-DE')}</span>
            ) : (
              <span>Wird automatisch gespeichert</span>
            )}
          </span>
        </div>
      </div>

      <textarea
        rows={2}
        placeholder={`Taktisches Fazit für die Mannschaft, Vorgaben zur Spielbesprechung oder Trainings-Schwerpunkte für „${category}" eintragen...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className="w-full p-2.5 bg-[#0A0E17] border border-[#2A3447] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#10B981] resize-y leading-relaxed"
      />
    </div>
  );
};

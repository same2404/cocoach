import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSyncedState } from '../../hooks/useSyncedState';
import { ExternalPerson, Player, TrainingSession, TrainingDocumentGlobal, TrainingDocumentContent } from '../../types';
import { isPlayer } from '../../utils/playerSorting';
import { useCollectionSync } from '../../hooks/useCollectionSync';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  Mail, 
  MessageCircle, 
  Calendar,
  Clock,
  Activity,
  Users,
  ChevronRight,
  ChevronLeft,
  FileText,
  Maximize2,
  Minimize2,
  X,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  History,
  User,
  UserPlus,
  Briefcase,
  Shield,
  ImageIcon,
  Share2,
  Upload,
  Printer,
  Loader2,
  BrainCircuit
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { fixOklchForHtml2Canvas } from '../../utils/pdfExportHelper';
import { 
  Document as DocxDocument, 
  Packer as DocxPacker, 
  Paragraph as DocxParagraph, 
  TextRun as DocxTextRun, 
  Table as DocxTable, 
  TableRow as DocxTableRow, 
  TableCell as DocxTableCell, 
  WidthType as DocxWidthType, 
  BorderStyle as DocxBorderStyle, 
  ImageRun as DocxImageRun, 
  AlignmentType as DocxAlignmentType, 
  HeadingLevel as DocxHeadingLevel 
} from 'docx';
import { sortPlayers } from '../../utils/playerSorting';
import { VideoSection } from '../VideoSection';
import { useClub } from '../../contexts/ClubContext';
import { apiFetch } from '../../lib/apiClient';

interface TrainingPlanningViewProps {
  players: Player[];
  attendance?: any[];
  selectedSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  competitiveMatches?: any[];
  testMatches?: any[];
}

const STOPWORDS = new Set([
  'der', 'die', 'das', 'und', 'mit', 'ein', 'eine', 'einen', 'einem', 'einer', 'für', 'auf', 'von', 'zum', 'zur',
  'den', 'dem', 'des', 'im', 'am', 'an', 'in', 'ist', 'sind', 'werden', 'wird', 'nicht', 'kein', 'keine', 'keinen',
  'als', 'bei', 'nach', 'aus', 'über', 'unter', 'durch', 'auch', 'oder', 'bitte', 'doch', 'noch', 'nur', 'man', 'wie',
  'was', 'sich', 'haben', 'hat', 'sein', 'waren', 'wäre', 'wurden', 'diese', 'dieser', 'dieses', 'ohne', 'gegen', 'vom',
  'beim', 'dazu', 'davor', 'danach', 'hier', 'dort', 'mehr', 'ohne', 'ihr', 'ihre', 'seiner', 'ihnen', 'dann', 'diese',
  'spieler', 'training', 'trainer', 'min', 'minuten', 'minute', 'sek', 'sekunden', 'team', 'gruppe', 'ball'
]);

const tokenize = (text: string): string[] => {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-zäöüß0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
};

const sessionText = (s: TrainingSession): string => {
  return [
    s.weeklyFocus,
    s.sessionFocus,
    s.content?.warmup,
    s.content?.main1,
    s.content?.main2,
    s.content?.closing,
    s.importantInfo,
    s.remarks
  ].filter(Boolean).join(' ');
};

const formatSessionShort = (date: string, weekday: string): string => {
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return `${weekday || ''} ${date || ''}`.trim();
  return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })} ${date ? '' : ''}`.trim();
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "white"; // Solid background in case of transparent png
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => {
        resolve(base64); // Fallback to original base64 if loading fails
      };
    };
    reader.onerror = error => reject(error);
  });
};

const compressImage = (base64: string, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "white"; // Handle transparency for jpeg
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // Fallback to original if compression fails
  });
};

const base64ToUint8Array = (base64: string) => {
  try {
    const parts = base64.split(',');
    const binaryString = window.atob(parts[1] || parts[0]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 conversion failed", e);
    return null;
  }
};

const ImageLightbox: React.FC<{
  image: string;
  onClose: () => void;
  onUpdate?: (newBase64: string) => void;
  isEditing?: boolean;
}> = ({ image, onClose, onUpdate, isEditing }) => {
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdate) {
      try {
        const base64 = await fileToBase64(file);
        onUpdate(base64);
      } catch (err) {
        console.error("Update failed", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute top-4 right-4 flex gap-4">
        {isEditing && onUpdate && (
          <>
            <button 
              onClick={handleRotate}
              className="p-3 bg-[#1E293B]/10 hover:bg-[#1E293B]/20 text-white rounded-full transition-colors flex items-center gap-2 font-black uppercase text-[10px]"
            >
              <RotateCw size={20} /> Rotieren
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex items-center gap-2 font-black uppercase text-[10px]"
            >
              <Upload size={20} /> Ersetzen
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </>
        )}
        <button 
          onClick={onClose}
          className="p-3 bg-[#1E293B]/10 hover:bg-[#1E293B]/20 text-white rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <img 
          src={image} 
          alt="Lightbox" 
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

const ImageUpload: React.FC<{ 
  onUpload: (base64: string | string[]) => void; 
  onDelete?: () => void;
  currentImage?: string;
  className?: string;
  label?: string;
  isEditing?: boolean;
}> = ({ onUpload, onDelete, currentImage, className, label, isEditing }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        const compressed = await compressImage(base64);
        onUpload(compressed);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!isEditing) return;
    
    // Try from items (Standard)
    const items = e.clipboardData.items;
    const imageBlobs: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) imageBlobs.push(blob);
      }
    }

    if (imageBlobs.length > 0) {
      try {
        const processed = await Promise.all(imageBlobs.map(async (blob) => {
          const base64 = await fileToBase64(blob);
          return compressImage(base64);
        }));
        if (processed.length === 1) {
          onUpload(processed[0]);
        } else {
          onUpload(processed);
        }
      } catch (err) {
        console.error("Paste failed", err);
      }
      return;
    }

    // Try from files (Fallback)
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles: File[] = [];
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        if (e.clipboardData.files[i].type.startsWith('image/')) {
          imageFiles.push(e.clipboardData.files[i]);
        }
      }
      if (imageFiles.length > 0) {
        try {
          const processed = await Promise.all(imageFiles.map(async (file) => {
            const base64 = await fileToBase64(file);
            return compressImage(base64);
          }));
          if (processed.length === 1) {
            onUpload(processed[0]);
          } else {
            onUpload(processed);
          }
        } catch (err) {
          console.error("Paste Fallback failed", err);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          imageFiles.push(files[i]);
        }
      }

      if (imageFiles.length > 0) {
        try {
          const processed = await Promise.all(imageFiles.map(async (file) => {
            const base64 = await fileToBase64(file);
            return compressImage(base64);
          }));
          if (processed.length === 1) {
            onUpload(processed[0]);
          } else {
            onUpload(processed);
          }
        } catch (err) {
          console.error("Drop failed", err);
        }
      }
    }
  };

  return (
    <div 
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={isEditing ? 0 : undefined}
      className={`relative transition-all outline-none focus-within:ring-2 focus-within:ring-blue-400 focus:ring-2 focus:ring-blue-400 ${isDragging ? 'bg-blue-50 ring-2 ring-blue-500 scale-102' : ''} ${className}`}
    >
      {currentImage ? (
        <>
          <div className="relative group border border-black/20 overflow-hidden w-full h-full">
            <img 
              src={currentImage} 
              alt="Training" 
              className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105" 
              referrerPolicy="no-referrer"
              onClick={() => setShowLightbox(true)}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Maximize2 size={24} className="text-white" />
            </div>
            {isEditing && (
              <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="bg-red-600 text-white p-1 hover:bg-neutral-800 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <div className="bg-blue-600 text-white p-1 cursor-pointer hover:bg-neutral-800 transition-colors relative" title="Ersetzen">
                    <Upload size={12} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
              </div>
            )}
          </div>
          {showLightbox && (
            <ImageLightbox 
              image={currentImage} 
              onClose={() => setShowLightbox(false)} 
              onUpdate={onUpload}
              isEditing={isEditing}
            />
          )}
        </>
      ) : isEditing ? (
        <div className="relative border-2 border-dashed border-black/10 hover:border-black/30 transition-colors flex flex-col items-center justify-center p-2 cursor-pointer group w-full h-full min-h-[100px]">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className={`absolute inset-0 opacity-0 cursor-pointer ${isDragging ? 'pointer-events-none' : ''}`}
          />
          <Upload size={14} className="mb-1 opacity-40 group-hover:opacity-100 transition-opacity" />
          <span className="text-[7px] font-black uppercase opacity-40 group-hover:opacity-100 transition-opacity text-center leading-tight px-1">
            {label || "HOCHLADEN / KLICKEN & STRG+V / DRAG & DROP"}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export const getCanonicalPlayerName = (p: Player | any): string => {
  if (!p) return 'Unbekannt';
  if (p.lastName && p.firstName) {
    return `${p.lastName}, ${p.firstName}`;
  }
  if (p.lastName) return p.lastName;
  if (p.firstName) return p.firstName;
  return (p as any).name || 'Unbekannt';
};

export const matchPlayerToMaster = (
  entry: { name: string; position?: string; category?: string } | null | undefined,
  masterPlayers: Player[]
): Player | null => {
  if (!entry || !entry.name) return null;
  const rawName = entry.name.trim().toLowerCase();
  const rawPos = (entry.position || '').trim().toUpperCase();
  const rawCat = (entry.category || '').trim().toLowerCase();

  // 1. Direct match on ID
  const idMatch = masterPlayers.find(p => p.id && p.id.toLowerCase() === rawName);
  if (idMatch) return idMatch;

  // 2. Direct full name or reverse name match
  const exact = masterPlayers.find(p => {
    const pLastName = (p.lastName || '').toLowerCase().trim();
    const pFirstName = (p.firstName || '').toLowerCase().trim();
    const pFullName1 = `${pLastName}, ${pFirstName}`;
    const pFullName2 = `${pLastName} ${pFirstName}`;
    const pFullName3 = `${pFirstName} ${pLastName}`;
    const pName = ((p as any).name || '').toLowerCase().trim();
    return (
      rawName === pFullName1 ||
      rawName === pFullName2 ||
      rawName === pFullName3 ||
      (pName && rawName === pName)
    );
  });
  if (exact) return exact;

  // 3. Ambiguous families FIRST: Dischinger & Ehret & Trogus vs Kobus
  if (rawName.includes('trogus')) {
    return masterPlayers.find(p => p.id === '12' || (p.lastName && p.lastName.toLowerCase() === 'trogus')) || null;
  }

  if (rawName.includes('ehret')) {
    if (rawName.includes('jonathan') || rawName.includes('joni') || rawPos.includes('OM') || rawPos.includes('10')) {
      return masterPlayers.find(p => p.id === '10' || (p.lastName?.toLowerCase() === 'ehret' && p.firstName?.toLowerCase() === 'jonathan')) || null;
    }
    if (rawName.includes('julian') || rawPos.includes('ZM') || rawPos.includes('8') || rawPos.includes('11') || rawPos.includes('6') || rawPos.includes('DM')) {
      return masterPlayers.find(p => p.id === '11' || (p.lastName?.toLowerCase() === 'ehret' && p.firstName?.toLowerCase() === 'julian')) || null;
    }
    return masterPlayers.find(p => p.id === '10' || p.id === '11') || null;
  }

  if (rawName.includes('dischinger') || rawName.includes('disch')) {
    if (rawName.includes('max') || rawPos.includes('IV') || rawPos.includes('4')) {
      return masterPlayers.find(p => p.id === '4' || (p.lastName?.toLowerCase() === 'dischinger' && p.firstName?.toLowerCase().startsWith('max'))) || null;
    }
    if (rawName.includes('milan') || rawPos.includes('ST') || rawPos.includes('26')) {
      return masterPlayers.find(p => p.id === 'dischinger_milan' || (p.lastName?.toLowerCase() === 'dischinger' && p.firstName?.toLowerCase() === 'milan')) || null;
    }
    if (rawName.includes('jonathan') || rawName.includes('joni') || rawPos.includes('RM') || rawPos.includes('RW') || rawPos.includes('19')) {
      return masterPlayers.find(p => p.id === '19' || (p.lastName?.toLowerCase() === 'dischinger' && p.firstName?.toLowerCase() === 'jonathan')) || null;
    }
    return masterPlayers.find(p => p.id === '4') || null;
  }

  // 4. Coaches & Officials / Staff
  if (rawName.includes('mütze') || rawName.includes('mutze')) {
    return masterPlayers.find(p => p.id === 'muetze' || (p.firstName && p.firstName.toLowerCase() === 'mütze')) || null;
  }
  if (rawName.includes('jungkeit') || rawName.includes('amin')) {
    return masterPlayers.find(p => p.id === 'jungkeit_amin' || (p.lastName && p.lastName.toLowerCase() === 'jungkeit')) || null;
  }
  if (rawName.includes('kobus') || (rawName.includes('marcel') && !rawName.includes('trogus'))) {
    return masterPlayers.find(p => p.id === 'kobus_marcel' || (p.lastName && p.lastName.toLowerCase() === 'kobus')) || null;
  }
  if (rawName.includes('zitzelsberger') || rawName.includes('klaus')) {
    return masterPlayers.find(p => p.id === 'zizelsberger_klaus' || (p.lastName && p.lastName.toLowerCase() === 'zitzelsberger')) || null;
  }
  if (rawName.includes('kiefl') || (rawName.includes('elias') && (rawCat.includes('coach') || rawCat.includes('staff') || rawPos.includes('TW') || rawPos.includes('TRAINER')))) {
    return masterPlayers.find(p => p.id === 'kiefl_tw' || (p.lastName && p.lastName.toLowerCase() === 'kiefl')) || null;
  }
  if (rawName.includes('brombacher') || rawName.includes('franziskar') || rawName.includes('franziska')) {
    return masterPlayers.find(p => p.id === 'brombacher_franziskar' || (p.lastName && p.lastName.toLowerCase() === 'brombacher')) || null;
  }
  if (rawName.includes('dieselhorst') || rawName.includes('björn') || rawName.includes('bjoern')) {
    return masterPlayers.find(p => p.id === 'dieselhorst_bjoern' || (p.lastName && p.lastName.toLowerCase() === 'dieselhorst')) || null;
  }
  if (rawName.includes('zimmermann') || (rawName.includes('levin') && !rawName.includes('kevin'))) {
    return masterPlayers.find(p => p.id === 'zimmermann_levin' || (p.lastName && p.lastName.toLowerCase() === 'zimmermann')) || null;
  }

  // 5. Specific Players by unique surname or distinctive aliases
  if (rawName.includes('spindler')) {
    return masterPlayers.find(p => p.id === '5' || (p.lastName && p.lastName.toLowerCase() === 'spindler')) || null;
  }
  if (rawName.includes('walther')) {
    return masterPlayers.find(p => p.id === '20' || (p.lastName && p.lastName.toLowerCase() === 'walther')) || null;
  }
  if (rawName.includes('casalnuovo') || rawName.includes('casal')) {
    return masterPlayers.find(p => p.id === '21' || (p.lastName && p.lastName.toLowerCase() === 'casalnuovo')) || null;
  }
  if (rawName.includes('valchuk') || rawName.includes('valch')) {
    return masterPlayers.find(p => p.id === '17' || (p.lastName && p.lastName.toLowerCase() === 'valchuk')) || null;
  }
  if (rawName.includes('tschira')) {
    return masterPlayers.find(p => p.id === '27' || (p.lastName && p.lastName.toLowerCase() === 'tschira')) || null;
  }
  if (rawName.includes('podlich')) {
    return masterPlayers.find(p => p.id === '2' || (p.lastName && p.lastName.toLowerCase() === 'podlich')) || null;
  }
  if (rawName.includes('khazalashvili') || rawName.includes('khazala')) {
    return masterPlayers.find(p => p.id === '15' || (p.lastName && p.lastName.toLowerCase() === 'khazalashvili')) || null;
  }
  if (rawName.includes('pereira') || rawName.includes('marques')) {
    return masterPlayers.find(p => p.id === '8' || (p.lastName && p.lastName.toLowerCase().includes('pereira') || (p.lastName && p.lastName.toLowerCase().includes('marques')))) || null;
  }
  if (rawName.includes('schäfer') || rawName.includes('schaefer')) {
    return masterPlayers.find(p => p.id === 'schaefer_tim' || (p.lastName && (p.lastName.toLowerCase() === 'schäfer' || p.lastName.toLowerCase() === 'schaefer'))) || null;
  }
  if (rawName.includes('bischoff')) {
    return masterPlayers.find(p => p.id === 'bischoff_bastian' || (p.lastName && p.lastName.toLowerCase() === 'bischoff')) || null;
  }
  if (rawName.includes('scalici')) {
    return masterPlayers.find(p => p.id === 'scalici_giuliano' || (p.lastName && p.lastName.toLowerCase() === 'scalici')) || null;
  }
  if (rawName.includes('thierings')) {
    return masterPlayers.find(p => p.id === 'thierings_nico' || (p.lastName && p.lastName.toLowerCase() === 'thierings')) || null;
  }
  if (rawName.includes('ontuzans')) {
    return masterPlayers.find(p => p.id === 'ontuzans_daniels' || (p.lastName && p.lastName.toLowerCase() === 'ontuzans')) || null;
  }
  if (rawName.includes('akbay')) {
    return masterPlayers.find(p => p.id === 'akbay_cem' || (p.lastName && p.lastName.toLowerCase() === 'akbay')) || null;
  }
  if (rawName.includes('akuegwu')) {
    return masterPlayers.find(p => p.id === 'akuegwu_jack' || (p.lastName && p.lastName.toLowerCase() === 'akuegwu')) || null;
  }
  if (rawName.includes('tiedemann')) {
    return masterPlayers.find(p => p.id === '9' || (p.lastName && p.lastName.toLowerCase() === 'tiedemann')) || null;
  }
  if (rawName.includes('nguyen')) {
    return masterPlayers.find(p => p.id === 'nguyen_thai_bao' || (p.lastName && p.lastName.toLowerCase() === 'nguyen')) || null;
  }
  if (rawName.includes('holzer') || (rawName.includes('kevin') && !rawName.includes('zimmermann'))) {
    return masterPlayers.find(p => p.id === '1' || (p.lastName && p.lastName.toLowerCase() === 'holzer')) || null;
  }
  if (rawName.includes('lauer') || (rawName.includes('stefan') && !rawName.includes('reinecker'))) {
    return masterPlayers.find(p => p.id === '23' || (p.lastName && p.lastName.toLowerCase() === 'lauer')) || null;
  }
  if (rawName.includes('reinecker') || rawName.includes('steffen')) {
    return masterPlayers.find(p => p.id === '13' || (p.lastName && p.lastName.toLowerCase() === 'reinecker')) || null;
  }
  if (rawName.includes('anlicker') || rawName.includes('marco')) {
    return masterPlayers.find(p => p.id === '6' || (p.lastName && p.lastName.toLowerCase() === 'anlicker')) || null;
  }
  if (rawName.includes('ziegler')) {
    return masterPlayers.find(p => p.id === '14' || (p.lastName && p.lastName.toLowerCase() === 'ziegler')) || null;
  }

  // 6. Match by unique last name token
  const lastNameMatches = masterPlayers.filter(p => {
    if (!p.lastName) return false;
    const lName = p.lastName.toLowerCase().trim();
    return rawName === lName || rawName.startsWith(lName) || rawName.endsWith(lName) || rawName.includes(lName);
  });
  if (lastNameMatches.length === 1) {
    return lastNameMatches[0];
  }

  return null;
};

export const deduplicateSessionPlayers = (
  rawPlayers: any[],
  masterPlayers: Player[]
): any[] => {
  if (!rawPlayers || !Array.isArray(rawPlayers)) return [];

  const seenKeys = new Set<string>();
  const result: any[] = [];

  for (const item of rawPlayers) {
    if (!item || !item.name) continue;
    const matched = matchPlayerToMaster(item, masterPlayers);
    const key = matched ? `m_${matched.id}` : `c_${item.name.trim().toLowerCase()}`;

    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    if (matched) {
      result.push({
        name: getCanonicalPlayerName(matched),
        position: matched.position || item.position,
        status: item.status || '1',
        category: matched.category || item.category || 'player'
      });
    } else {
      result.push({
        name: item.name.trim(),
        position: item.position || 'EXTERN',
        status: item.status || '1',
        category: item.category || 'player'
      });
    }
  }

  return sortPlayers(result);
};

// Ampel-Status für die Spielerliste (verbunden mit der individuellen Steuerung):
// Priorität: loadAmpel (Spieler/individual_training) -> Verletzung -> Aufbau/Reha -> Grün
const getPlayerAmpel = (p: any, fullPlayer: any): 'Grün' | 'Gelb' | 'Rot' => {
  const ampel = p?.loadAmpel || fullPlayer?.loadAmpel;
  if (ampel === 'Grün' || ampel === 'Gelb' || ampel === 'Rot') return ampel;
  if (fullPlayer?.isInjured || fullPlayer?.status === 'Verletzt' || fullPlayer?.verletzung) return 'Rot';
  if (fullPlayer?.status === 'Reha' || fullPlayer?.status === 'Vorsicht' || p?.status === 'A' || p?.status === 'B' || p?.status === 'k') return 'Gelb';
  return 'Grün';
};

export const TrainingPlanningView: React.FC<TrainingPlanningViewProps> = ({ 
  players, 
  attendance = [],
  selectedSessionId, 
  onSelectSession,
  onEmail,
  onWhatsApp,
  competitiveMatches = [],
  testMatches = []
}) => {
  const { activeClub } = useClub();
  const { data: sessions, addOrUpdateItem: saveSession, removeItem: deleteSession } = useCollectionSync<TrainingSession>('training_sessions', 'id', 'date', 'asc');
  const { data: globalDocs, addOrUpdateItem: saveGlobalDoc, removeItem: deleteGlobalDoc } = useCollectionSync<TrainingDocumentGlobal>('training_documents_global', 'id');
  const [externalPersons] = useSyncedState<ExternalPerson[]>('external_persons_v1', []);
  const [lastSavedSquad, setLastSavedSquad] = useSyncedState<any[]>('last_training_squad_v1', []);
  const [isEditing, setIsEditing] = useState(false);
  const [localSession, setLocalSession] = useState<TrainingSession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [manualPlayerPos, setManualPlayerPos] = useState('');
  const [manualPlayerCategory, setManualPlayerCategory] = useState<'player' | 'coach' | 'staff' | 'medical'>('player');
  const [notification, setNotification] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [selectedLibraryDocId, setSelectedLibraryDocId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [modalDragActive, setModalDragActive] = useState(false);
  const [undoStack, setUndoStack] = useState<TrainingSession[]>([]);
  const [redoStack, setRedoStack] = useState<TrainingSession[]>([]);
  const [initialSessionSnapshot, setInitialSessionSnapshot] = useState<TrainingSession | null>(null);

  // KI Training Plan Generator State
  const [kiLoading, setKiLoading] = useState(false);
  const [showKiModal, setShowKiModal] = useState(false);
  const [kiInputs, setKiInputs] = useState({
    gegner: '',
    ort: 'Trainingsgelände',
    intensitaet: '6',
    belastung: 'mittel',
    schwerpunkt: 'Ballbesitz',
    dauer: '90 Minuten',
    trainer: 'Trainer'
  });

  // XPS Drill Category Editor State
  const [activeDrillCategory, setActiveDrillCategory] = useState<string | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'document' | 'edit'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drillEditContent, setDrillEditContent] = useState({
    title: '',
    description: '',
    duration: '',
    intensity: '',
    coachingPoints: '',
    videoLink: '',
    varianten: ''
  });

  const DRILL_TEMPLATES: Record<string, { title: string; description: string; duration: string; intensity: string; coachingPoints: string; varianten: string }> = {
    'Aufwärmen': {
      title: 'Dynamisches Aufwärmen',
      description: '5 Min lockeres Joggen → 5 Min Mobilisation (Hüfte, Knie, Sprunggelenk) → 5 Min dynamische Dehnung (Beine schwingen, Ausfallschritte, High Knees)',
      duration: '15 Min',
      intensity: 'Leicht (Herzfrequenz 60-70%)',
      coachingPoints: 'Gleichmäßiges Tempo, volle Bewegungsamplitude, Aktivierung der核心-Muskulatur',
      varianten: 'Varianten: Mit Ball → Dribbel-Aktivierung | Ohne Ball → Koordinationsleiter'
    },
    'Technik-Drill': {
      title: 'Technik-Drill: Passen & Kontrolle',
      description: 'Rondo 4v2 (10x10m): 4 Angreifer im Quadrat, 2 Verteidiger in der Mitte. Max. 2 Kontakte, Ballbesitz halten.',
      duration: '20 Min',
      intensity: 'Mittel (70-80% HF)',
      coachingPoints: 'Schnelle Ballannahme, offene Körperhaltung, Kopf heben vor dem Pass, Kommunikation',
      varianten: 'Varianten: 1 Kontakt → Tempo erhöhen | 3 Verteidiger → Druck erhöhen | Torabschluss nach 10 Pässen'
    },
    'Sprint-Training': {
      title: 'Sprint-Training: Geschwindigkeit & Reaktion',
      description: '3x 30m Sprint aus verschiedenen Startpositionen (stehend, kniend, liegend, mit Drehung). Pause 2 Min zwischen den Sprints.',
      duration: '15 Min',
      intensity: 'Hoch (90-100% HF)',
      coachingPoints: 'Explosiver Start, armschwung, gerade Haltung, volle Intensität bis zur Linie',
      varianten: 'Varianten: Mit Ball → Sprint mit Anspiel | Reaktions-Sprint auf Klatschen | Paar-Sprint (Wettkampf)'
    },
    'Taktik-Spiel': {
      title: 'Taktische Spielform: Überzahl-/Unterzahl-Spiel',
      description: '8v6 auf halbes Feld. Ballbesitzteam nutzt Überzahl für Schnittstellenpässe. Defensivteam pressst strukturiert.',
      duration: '25 Min',
      intensity: 'Mittel-Hoch (80-90% HF)',
      coachingPoints: 'Spielverlagerung bei Überzahl, Pressing-Auslöser erkennen, Kompaktheit wahren',
      varianten: 'Varianten: Tor mit Abschlussbonus | Gegenpressing-Pflicht nach Ballverlust | Freie Variantenwahl'
    },
    'Standards': {
      title: 'Standards: Ecken & Freistöße',
      description: 'Ecken: 3 Varianten durchspielen (kurz, hoch hinten, flach vor Tor). Freistöße: 2 direkte Optionen + 1 indirekteVariante.',
      duration: '15 Min',
      intensity: 'Mittel (70-80% HF)',
      coachingPoints: 'Timing der Läufe, Verdeckung des Torwarts, präzise Ausführung, Abschluss',
      varianten: 'Varianten: Doppelte Verdeckung | Kurze Ecke → Flanke | Freistoß direkter Schuss vs. Flanke'
    },
    'Cool-Down': {
      title: 'Cool-Down & Regeneration',
      description: '5 Min lockeres Joggen → 5 Min statisches Dehnung (Hamstrings, Quadrizeps, Waden) → Atemübungen',
      duration: '10 Min',
      intensity: 'Leicht (50-60% HF)',
      coachingPoints: 'Langsames Herunterfahren, tiefe Atemzüge, Dehnung 20-30 Sek. halten,团队-Spirit',
      varianten: 'Varianten: Yoga-Elemente | Faszien-Rollmassage | Team-Runde mit Rückblick'
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PERIODISIERUNG: Automatische Spieltag-Steuerung (1-9)
  // ═══════════════════════════════════════════════════════════════
  const [matchDayType, setMatchDayType] = useState<'friday' | 'saturday' | 'sunday' | null>(null);
  const [periodisierungTab, setPeriodisierungTab] = useState<'auto' | 'friday' | 'saturday' | 'sunday' | 'positions'>('auto');

  // Auto-Erkennung: Anhand des Spielplans prüfen welcher Tag das Spiel ist
  const detectedMatchDay = useMemo(() => {
    const allMatches = [...(competitiveMatches || []), ...(testMatches || [])];
    if (allMatches.length === 0) return null;
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    const thisWeekMatches = allMatches.filter((m: any) => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d >= currentWeekStart && d <= currentWeekEnd;
    });
    if (thisWeekMatches.length === 0) return null;
    const matchDate = new Date(thisWeekMatches[0].date);
    const day = matchDate.getDay();
    if (day === 5) return 'friday' as const;
    if (day === 6) return 'saturday' as const;
    if (day === 0) return 'sunday' as const;
    return null;
  }, [competitiveMatches, testMatches]);

  const activeMatchDay = matchDayType || detectedMatchDay;

  // Belastungsstufen 1-9 mit Intensitätsbereichen
  const BELASTUNGS_STUFEN: Record<number, { label: string; intensity: string; hf: string; farbe: string }> = {
    1: { label: 'Regeneration', intensity: '30-40%', hf: '50-60%', farbe: '#22c55e' },
    2: { label: 'Lockeres Training', intensity: '40-50%', hf: '55-65%', farbe: '#4ade80' },
    3: { label: 'Aktive Erholung', intensity: '50-60%', hf: '60-70%', farbe: '#86efac' },
    4: { label: 'Technik-Arbeit', intensity: '55-65%', hf: '65-75%', farbe: '#facc15' },
    5: { label: 'Mittlere Belastung', intensity: '60-70%', hf: '70-80%', farbe: '#fbbf24' },
    6: { label: 'Mittel-Hoch', intensity: '60-80%', hf: '75-85%', farbe: '#f97316' },
    7: { label: 'Spielnahe Aktivierung', intensity: '70-80%', hf: '80-90%', farbe: '#ef4444' },
    8: { label: 'Hohe Intensität', intensity: '70-90%', hf: '85-95%', farbe: '#dc2626' },
    9: { label: 'Maximale Belastung', intensity: '80-100%', hf: '90-100%', farbe: '#991b1b' },
  };

  // WOCHENPLÄNE nach PDF-Vorgaben
  type TagesPlan = { weekday: string; stufe: number; dauer: string; schwerpunkt: string; inhalt: string; uhrzeit?: string };
  type WochenPlan = { tage: TagesPlan[] };

  const WOCHENPLAENNE: Record<'friday' | 'saturday' | 'sunday', WochenPlan[]> = {
    friday: [
      { tage: [
        { weekday: 'Montag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Kondition & Sprint', inhalt: 'Aufwärmen 15 Min | Sprint-Drills 3x6x30m | Kleine Spiele 4v4 | Cool-Down', uhrzeit: '18:00' },
        { weekday: 'Dienstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Taktik & Pressing', inhalt: 'Aufwärmen 15 Min | Pressing-Auslöser 6v6 | Spielverlagerung | Standards', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Lockeres Joggen 20 Min | Dehnung 20 Min | Core 15 Min', uhrzeit: '10:00' },
        { weekday: 'Donnerstag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Spielvorbereitung', inhalt: 'Aufwärmen 15 Min | taktisches Durchspielen 11v0 | Abschluss-Drills | Standards', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '19:00' },
      ]},
      { tage: [
        { weekday: 'Montag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Intervall-Training', inhalt: 'Aufwärmen 15 Min | HIIT 4x8 Min | Small-Sided Games | Cool-Down', uhrzeit: '18:00' },
        { weekday: 'Dienstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Ballbesitz & Kombination', inhalt: 'Rondo 5v2 15 Min | Positionsspiel 8v8 | Durchspielen 11v0', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Fahrrad 20 Min | Yoga-Elemente 20 Min | Mental Training', uhrzeit: '10:00' },
        { weekday: 'Donnerstag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Spielvorbereitung', inhalt: 'Taktik 11v0 | Standards Ecken & Freistöße | Abschluss-Spiel', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '19:00' },
      ]},
      { tage: [
        { weekday: 'Montag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Schnelligkeit & Reaktion', inhalt: 'Aktivierung 15 Min | Sprint-Akzente 5x30m | Reaktionsspiele | Spielformen', uhrzeit: '18:00' },
        { weekday: 'Dienstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Defensiv-Organisation', inhalt: 'Pressing-Trigger 6v6 | Sprint-Verteidigung | Umschalten | 11v11', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Wassertraining 20 Min | Dehnung 25 Min | Atemübungen', uhrzeit: '10:00' },
        { weekday: 'Donnerstag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Spielvorbereitung', inhalt: 'Taktik-Spielplan 11v0 | Anstoß-Szenarien | Letzte Einheiten', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '19:00' },
      ]},
    ],
    saturday: [
      // Sept 2026 · KW 36 (31.08.–06.09.) · Spiel Samstag (H) Konstanz
      { tage: [
        { weekday: 'Montag', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Ziel: Belastung senken, Körper erholen', uhrzeit: '—' },
        { weekday: 'Dienstag', stufe: 4, dauer: '90 Min', schwerpunkt: 'Spielaufbau & Positionsspiel', inhalt: '18:30 Video (optional) | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Mittwoch', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Ziel: Muskuläre Erholung', uhrzeit: '—' },
        { weekday: 'Donnerstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Umschaltspiel', inhalt: 'Training | Schwerpunkt Umschaltspiel', uhrzeit: '18:45' },
        { weekday: 'Freitag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Vorbereitung auf Konstanz', inhalt: '18:30 Gegneranalyse | 18:45 Abschlusstraining', uhrzeit: '18:45' },
        { weekday: 'Samstag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel (H) Konstanz', inhalt: 'SPIELTAG — Heimspiel gegen Konstanz', uhrzeit: '15:30' },
      ]},
      // Sept 2026 · KW 37 (07.09.–13.09.) · Spiel Samstag (A) Salem
      { tage: [
        { weekday: 'Montag', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Dienstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Pressing & Gegenpressing', inhalt: '18:30 Video | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Mittwoch', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Donnerstag', stufe: 4, dauer: '90 Min', schwerpunkt: 'Abschluss & Flügelspiel', inhalt: 'Training | Schwerpunkt Abschluss, Flügel', uhrzeit: '18:45' },
        { weekday: 'Freitag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Vorbereitung auf Salem', inhalt: '18:30 Gegneranalyse | 18:45 Abschlusstraining', uhrzeit: '18:45' },
        { weekday: 'Samstag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel (A) Salem', inhalt: 'SPIELTAG — Auswärtsspiel gegen Salem', uhrzeit: '15:30' },
      ]},
      // Sept 2026 · KW 38 (14.09.–20.09.) · Spiel Samstag (H) Wolfenweiler-Schallstadt
      { tage: [
        { weekday: 'Montag', stufe: 3, dauer: '30 Min', schwerpunkt: 'Regenerationslauf', inhalt: '20–30 Minuten locker', uhrzeit: '10:00' },
        { weekday: 'Dienstag', stufe: 7, dauer: '90 Min', schwerpunkt: 'Aufbau über 6er & 8er', inhalt: '18:30 Video | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Mittwoch', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Donnerstag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Vorbereitung Wolfenweiler-Schallstadt', inhalt: '18:30 Gegneranalyse | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Freitag', stufe: 5, dauer: '75 Min', schwerpunkt: 'Abschlusstraining', inhalt: 'Abschlusstraining', uhrzeit: '18:45' },
        { weekday: 'Samstag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel (H) Wolfenweiler-Schallstadt', inhalt: 'SPIELTAG — Heimspiel gegen Wolfenweiler-Schallstadt', uhrzeit: '15:30' },
      ]},
      // Sept 2026 · KW 39 (21.09.–27.09.) · Spiel Samstag (A) Bühlertal
      { tage: [
        { weekday: 'Montag', stufe: 3, dauer: '30 Min', schwerpunkt: 'Sieg: Frei | Niederlage: Regenerationslauf', inhalt: 'Sieg-Regel: Montag frei | Niederlage-Regel: Regenerationslauf', uhrzeit: '—' },
        { weekday: 'Dienstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Defensive Stabilität', inhalt: '18:30 Video | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Mittwoch', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Donnerstag', stufe: 4, dauer: '90 Min', schwerpunkt: 'Standards (Ecken, Freistöße)', inhalt: 'Training | Schwerpunkt Standards', uhrzeit: '18:45' },
        { weekday: 'Freitag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Vorbereitung auf Bühlertal', inhalt: '18:30 Gegneranalyse | 18:45 Abschlusstraining', uhrzeit: '18:45' },
        { weekday: 'Samstag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel (A) Bühlertal', inhalt: 'SPIELTAG — Auswärtsspiel gegen Bühlertal', uhrzeit: '15:30' },
      ]},
      // Sept 2026 · KW 40 (28.09.–04.10.) · Spiel Samstag (H) Lahr
      { tage: [
        { weekday: 'Montag', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Dienstag', stufe: 7, dauer: '90 Min', schwerpunkt: 'Angriffszonen & Tiefenläufe', inhalt: '18:30 Video | 18:45 Training', uhrzeit: '18:45' },
        { weekday: 'Mittwoch', stufe: 2, dauer: 'Frei', schwerpunkt: 'Frei / Regeneration', inhalt: 'Kein Training', uhrzeit: '—' },
        { weekday: 'Donnerstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Spielformen 11v11', inhalt: 'Training | Schwerpunkt 11v11 Spielformen', uhrzeit: '18:45' },
        { weekday: 'Freitag', stufe: 6, dauer: '90 Min', schwerpunkt: 'Vorbereitung auf Lahr', inhalt: '18:30 Gegneranalyse | 18:45 Abschlusstraining', uhrzeit: '18:45' },
        { weekday: 'Samstag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel (H) Lahr', inhalt: 'SPIELTAG — Heimspiel gegen Lahr', uhrzeit: '15:30' },
      ]},
    ],
    sunday: [
      { tage: [
        { weekday: 'Montag', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Lockeres Auslaufen 20 Min | Regeneration-Übungen | Dehnung', uhrzeit: '10:00' },
        { weekday: 'Dienstag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Kondition & Sprint', inhalt: 'Aufwärmen 15 Min | Intervall-Training | Sprint-Drills | Cool-Down', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 4, dauer: '75 Min', schwerpunkt: 'Technik & Kreativität', inhalt: 'Dribbling 15 Min | Passing in Bewegung | Freestyle | Koordination', uhrzeit: '18:00' },
        { weekday: 'Donnerstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Intensives Spielvorbereitung', inhalt: 'Pressing 6v6 hoch | Sprint-Verteidigung | 11v11 Testspiel', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 7, dauer: '90 Min', schwerpunkt: 'Spielnahe Aktivierung (mehr Umfang)', inhalt: 'Aufwärmen 15 Min | Taktik 11v0 | Standards | Abschluss-Spiel', uhrzeit: '18:00' },
        { weekday: 'Samstag', stufe: 2, dauer: '45 Min', schwerpunkt: 'Lockere Aktivierung', inhalt: 'Lockeres Joggen 15 Min | Passing 10 Min | Tactical Walk 10 Min', uhrzeit: '10:00' },
        { weekday: 'Sonntag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '15:00' },
      ]},
      { tage: [
        { weekday: 'Montag', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Fahrrad 15 Min | Yoga 20 Min | Atem-Workshop', uhrzeit: '10:00' },
        { weekday: 'Dienstag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Maximale Intensität', inhalt: 'Sprints 8x30m | HIIT 5x5 Min | Große Spiele', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 4, dauer: '75 Min', schwerpunkt: 'Kreatives Training', inhalt: 'Rondo variationen 20 Min | 2touch-Passspiel | Dribbel-Wettbewerb', uhrzeit: '18:00' },
        { weekday: 'Donnerstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Taktik intensiv', inhalt: 'Defensiv-Organisation 45 Min | Umschalt-Spiel 30 Min | Standards', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 7, dauer: '90 Min', schwerpunkt: 'Spielnahe Vorbereitung (mehr Umfang)', inhalt: 'Aufwärmen | Taktik 11v11 | Spiel-Szenarien | Abschluss', uhrzeit: '18:00' },
        { weekday: 'Samstag', stufe: 2, dauer: '45 Min', schwerpunkt: 'Lockere Aktivierung', inhalt: 'Lockeres Aufwärmen 10 Min | Passing 15 Min | Einlaufen', uhrzeit: '10:00' },
        { weekday: 'Sonntag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '15:00' },
      ]},
      { tage: [
        { weekday: 'Montag', stufe: 3, dauer: '60 Min', schwerpunkt: 'Regeneration', inhalt: 'Wasser-Regeneration 20 Min | Dehnung 25 Min | Mentaltraining', uhrzeit: '10:00' },
        { weekday: 'Dienstag', stufe: 9, dauer: '90 Min', schwerpunkt: 'Schnelligkeit & Power', inhalt: 'Sprint-Akzente 6x40m | Sprungübungen | Small-Sided Games', uhrzeit: '18:00' },
        { weekday: 'Mittwoch', stufe: 4, dauer: '75 Min', schwerpunkt: 'Technik-Verfeinerung', inhalt: 'Flanken & Abschluss 20 Min | Freistoß-Training | Koordination', uhrzeit: '18:00' },
        { weekday: 'Donnerstag', stufe: 8, dauer: '90 Min', schwerpunkt: 'Taktik-Simulation', inhalt: 'Gegner-Presets 11v0 | Pressing-Rate | Umschalt-Training', uhrzeit: '18:00' },
        { weekday: 'Freitag', stufe: 7, dauer: '90 Min', schwerpunkt: 'Spielvorbereitung', inhalt: 'Aufwärmen | Taktisches 11v0 | Set-Piece Training | Abschluss', uhrzeit: '18:00' },
        { weekday: 'Samstag', stufe: 2, dauer: '45 Min', schwerpunkt: 'Leichte Aktivierung', inhalt: 'Lockeres Auslaufen 15 Min | Passing-Rhythmus 15 Min | Mental', uhrzeit: '10:00' },
        { weekday: 'Sonntag', stufe: 0, dauer: 'SPIELTAG', schwerpunkt: 'Pflichtspiel', inhalt: 'SPIELTAG — Kein Training', uhrzeit: '15:00' },
      ]},
    ],
  };

  const currentWeekPlans = activeMatchDay ? WOCHENPLAENNE[activeMatchDay] : WOCHENPLAENNE.friday;

  // Editierbare Wochen-Tage (für Trainingstage hinzufügen/entfernen & Stufe wählen)
  const KW_START_DATES = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
  const KW_LABELS = ['KW 36 · 31.08–06.09', 'KW 37 · 07.09–13.09', 'KW 38 · 14.09–20.09', 'KW 39 · 21.09–27.09', 'KW 40 · 28.09–04.10'];
  const [weekIndex, setWeekIndex] = useState(0);
  const [weekDays, setWeekDays] = useState<TagesPlan[]>(() => currentWeekPlans[0]?.tage?.map((t) => ({ ...t })) || []);
  useEffect(() => {
    setWeekDays(currentWeekPlans[weekIndex]?.tage?.map((t) => ({ ...t })) || []);
  }, [activeMatchDay, weekIndex]);

  const changeWeekDayStufe = (i: number, stufe: number) => {
    setWeekDays((prev) => {
      const next = prev.map((t, idx) => (idx === i ? { ...t, stufe } : t));
      return next;
    });
  };
  const addWeekDay = () => {
    setWeekDays((prev) => {
      const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
      const used = prev.map((t) => t.weekday);
      const next = dayNames.find((d) => !used.includes(d));
      return [...prev, { weekday: next || `Training ${prev.length + 1}`, stufe: 2, dauer: '60 Min', schwerpunkt: 'Neues Training', inhalt: '', uhrzeit: '18:00' }];
    });
  };
  const removeWeekDay = (i: number) => {
    setWeekDays((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Einheit anpassen — setzt Datum, Wochentag, Ort, Stufe, Intensität, Schwerpunkt, Dauer
  const applyPlanToCurrentSession = (tag: TagesPlan, dayIndex: number) => {
    if (!localSession) return;
    const dateBase = new Date(KW_START_DATES[weekIndex] || KW_START_DATES[0]);
    dateBase.setDate(dateBase.getDate() + dayIndex);
    const dateStr = dateBase.toISOString().split('T')[0];
    const stufe = BELASTUNGS_STUFEN[tag.stufe];
    const updated = {
      ...localSession,
      date: dateStr,
      weekday: tag.weekday,
      location: tag.stufe === 0 ? (localSession.location || '') : 'Rasenplatz Auggen',
      loadLevel: tag.stufe,
      load: stufe?.label || '',
      intensity: stufe?.intensity || '',
      duration: tag.dauer,
      sessionFocus: tag.schwerpunkt,
    };
    setLocalSession(updated);
    saveSession(updated);
    setNotification(`${tag.weekday} · ${dateStr}: Stufe ${tag.stufe} — ${stufe?.label || ''} | ${tag.schwerpunkt}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Woche synchronisieren
  const syncFullWeek = (plan: WochenPlan) => {
    plan.tage.forEach((tag) => {
      const match = sessions.find((s: any) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        return dayNames[d.getDay()] === tag.weekday;
      });
      if (match && tag.stufe > 0) {
        const updated = { ...match, loadLevel: tag.stufe, load: BELASTUNGS_STUFEN[tag.stufe].label, intensity: tag.schwerpunkt, duration: tag.dauer, sessionFocus: tag.schwerpunkt };
        saveSession(updated);
      }
    });
    setNotification('Woche synchronisiert! Alle Einheiten angepasst.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Positionsspezifische Belastungsprofile
  const POSITIONS_PROFILE = [
    { pos: 'Innenverteidiger (IV)', stufen: [5, 7, 6, 7, 0, 3, 9], farbe: '#3B82F6' },
    { pos: 'Zentrales Mittelfeld (ZM)', stufen: [6, 8, 5, 8, 0, 3, 9], farbe: '#F59E0B' },
    { pos: 'Außenverteidiger (AV)', stufen: [6, 9, 5, 7, 0, 3, 9], farbe: '#10B981' },
    { pos: 'Flügelstürmer (RA/LA)', stufen: [7, 9, 5, 7, 0, 2, 9], farbe: '#EF4444' },
    { pos: 'Stürmer (ST)', stufen: [7, 8, 5, 6, 0, 2, 9], farbe: '#8B5CF6' },
    { pos: 'Torwart (TW)', stufen: [4, 6, 5, 6, 0, 3, 8], farbe: '#6B7280' },
  ];
  const TAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // ═══════════════════════════════════════════════════════════════

  const handleDrillCategoryClick = (label: string) => {
    if (activeDrillCategory === label) {
      setActiveDrillCategory(null);
      return;
    }
    setActiveDrillCategory(label);

    // Map new label → content field to load existing content
    const fieldMap: Record<string, string> = {
      'Aufwärmen / Aktivierung': 'warmup',
      'Hauptteil 1 — Technik / Taktik': 'main1',
      'Hauptteil 2 — Intensität / Spiel': 'main2',
      'Schluss / Cool-Down': 'closing',
    };
    const durationFieldMap: Record<string, string> = {
      'Aufwärmen / Aktivierung': 'warmupDuration',
      'Hauptteil 1 — Technik / Taktik': 'main1Duration',
      'Hauptteil 2 — Intensität / Spiel': 'main2Duration',
      'Schluss / Cool-Down': 'closingDuration',
    };
    const intensityMap: Record<string, string> = {
      'Aufwärmen / Aktivierung': 'Leicht',
      'Hauptteil 1 — Technik / Taktik': 'Mittel',
      'Hauptteil 2 — Intensität / Spiel': 'Hoch',
      'Schluss / Cool-Down': 'Leicht',
    };

    const contentField = fieldMap[label];
    const durationField = durationFieldMap[label];
    const existingContent = contentField && localSession?.content ? (localSession.content as any)[contentField] || '' : '';
    const existingDuration = durationField && localSession?.content ? (localSession.content as any)[durationField] || '' : '';

    if (existingContent) {
      // Bestehenden Inhalt laden
      setDrillEditContent({
        title: '',
        description: existingContent,
        duration: existingDuration,
        intensity: intensityMap[label] || '',
        coachingPoints: '',
        videoLink: '',
        varianten: ''
      });
    } else {
      // Template laden
      const legacyMap: Record<string, string> = {
        'Aufwärmen / Aktivierung': 'Aufwärmen',
        'Hauptteil 1 — Technik / Taktik': 'Technik-Drill',
        'Hauptteil 2 — Intensität / Spiel': 'Sprint-Training',
        'Schluss / Cool-Down': 'Cool-Down',
      };
      const templateKey = legacyMap[label] || label;
      const template: Partial<{ title: string; description: string; duration: string; intensity: string; coachingPoints: string; varianten: string }> = DRILL_TEMPLATES[templateKey] || {};
      setDrillEditContent({
        title: template.title || label,
        description: template.description || '',
        duration: template.duration || '',
        intensity: template.intensity || '',
        coachingPoints: template.coachingPoints || '',
        videoLink: '',
        varianten: template.varianten || ''
      });
    }
  };

  const handleSaveDrillContent = async () => {
    if (!localSession || !activeDrillCategory) return;
    const catMap: Record<string, keyof TrainingSession['content']> = {
      'Aufwärmen / Aktivierung': 'warmup',
      'Hauptteil 1 — Technik / Taktik': 'main1',
      'Hauptteil 2 — Intensität / Spiel': 'main2',
      'Schluss / Cool-Down': 'closing',
      // Legacy fallback
      'Aufwärmen': 'warmup',
      'Technik-Drill': 'main1',
      'Sprint-Training': 'main2',
      'Taktik-Spiel': 'main1',
      'Standards': 'main2',
      'Cool-Down': 'closing'
    };
    const field = catMap[activeDrillCategory] || 'warmup';
    const durationField = `${field}Duration` as keyof TrainingSession['content'];
    const fullText = [
      drillEditContent.title ? `**${drillEditContent.title}**` : '',
      drillEditContent.description,
      drillEditContent.coachingPoints ? `Coaching: ${drillEditContent.coachingPoints}` : '',
      drillEditContent.varianten ? `Varianten: ${drillEditContent.varianten}` : '',
      drillEditContent.videoLink ? `Video: ${drillEditContent.videoLink}` : ''
    ].filter(Boolean).join('\n');

    const updated = {
      ...localSession,
      content: {
        ...localSession.content,
        [field]: fullText,
        [durationField]: drillEditContent.duration
      }
    };
    setLocalSession(updated);
    await saveSession(updated);
    setNotification(`${activeDrillCategory} — Erfolgreich gespeichert!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGenerateTrainingPlan = async () => {
    setKiLoading(true);
    try {
      const today = new Date();
      const res = await apiFetch('/api/training-plan/generate', {
        method: 'POST',
        body: JSON.stringify({
          datum: today.toISOString().split('T')[0],
          wochentag: today.toLocaleDateString('de-DE', { weekday: 'long' }),
          ...kiInputs,
          team: activeClub.name,
          clubName: activeClub.name,
          anwesenheit: players.filter(p => isPlayer(p)).map(p => `${p.firstName} ${p.lastName} (${p.position})`).join(', ')
        })
      });
      const data = await res.json();
      if (data.success && data.plan) {
        const plan = data.plan;
        const newSession: TrainingSession = {
          id: Date.now().toString(),
          date: today.toISOString().split('T')[0],
          weekday: plan.metadaten?.wochentag || today.toLocaleDateString('de-DE', { weekday: 'long' }),
          group: activeClub.name,
          load: plan.metadaten?.belastung || kiInputs.belastung,
          duration: plan.metadaten?.dauer || kiInputs.dauer,
          weeklyFocus: plan.metadaten?.wochenschwerpunkt || kiInputs.schwerpunkt,
          sessionFocus: plan.metadaten?.schwerpunktEinheit || kiInputs.schwerpunkt,
          trainer: plan.metadaten?.trainer || kiInputs.trainer,
          intensity: plan.metadaten?.intensitaet || kiInputs.intensitaet,
          status: 'Geplant',
          players: players.filter(p => isPlayer(p)).map(p => ({
            name: `${p.lastName}, ${p.firstName}`,
            position: p.position,
            status: '1' as const
          })),
          content: {
            warmup: plan.erwarmung?.inhalt || 'Standard-Aktivierung',
            warmupDuration: plan.erwarmung?.zeit || '15 Min',
            main1: plan.hauptteil1?.uebung || 'Hauptteil 1',
            main1Duration: plan.hauptteil1?.zeit || '25 Min',
            main2: plan.hauptteil2?.uebung || 'Hauptteil 2',
            main2Duration: plan.hauptteil2?.zeit || '25 Min',
            closing: plan.schluss?.spielform || 'Abschluss-Spielform',
            closingDuration: plan.schluss?.zeit || '15 Min'
          },
          importantInfo: plan.wichtigeInformationen || '',
          remarks: `KI-generiert am ${today.toLocaleDateString('de-DE')}`
        };
        await saveSession(newSession);
        onSelectSession(newSession.id);
        setShowKiModal(false);
        setNotification('KI-Trainingsplan erfolgreich erstellt!');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('KI Training Plan failed:', err);
      setNotification('Fehler bei der KI-Generierung');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setKiLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const fileList = Array.from(files);
      setNotification(`${fileList.length} Dokumente werden vorbereitet...`);
      
      let successCount = 0;
      let lastDocId = '';

      for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          setNotification(`Hochladen: ${i + 1}/${fileList.length} - ${file.name}`);
          
          if (file.size > 700 * 1024) {
              setNotification(`Upps! ${file.name} ist zu groß. Max 700KB erlaubt.`);
              await new Promise(r => setTimeout(r, 2000));
              continue;
          }

          try {
              const base64 = await fileToBase64(file);
              const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
              lastDocId = docId;
              
              await setDoc(doc(db, 'training_documents_content', docId), {
                  id: docId,
                  base64: base64
              });

              const newDoc: TrainingDocumentGlobal = {
                  id: docId,
                  name: file.name,
                  url: '', 
                  uploadedAt: new Date().toISOString(),
                  mimeType: file.type || 'application/octet-stream'
              };
              await saveGlobalDoc(newDoc as any);
              successCount++;
          } catch (err) {
              console.error(`Upload failed for ${file.name}:`, err);
          }
      }

      if (successCount > 0) {
          setSelectedLibraryDocId(lastDocId);
          if (successCount === 1 && localSession && localSession.id) {
              const updatedSession = { ...localSession, trainingDocumentId: lastDocId };
              await saveSession(updatedSession as any);
              setLocalSession(updatedSession as any);
              setNotification("Erfolgreich hochgeladen & zugewiesen!");
          } else {
              setNotification(`${successCount} Dokument(e) erfolgreich zur Bibliothek hinzugefügt!`);
          }
      } else {
          setNotification("Keine Dokumente hochgeladen.");
      }
      
      setTimeout(() => setNotification(null), 3000);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const pushUndoState = () => {
    if (localSession) {
      const copy = JSON.parse(JSON.stringify(localSession));
      setUndoStack(prev => [...prev.slice(-30), copy]);
      setRedoStack([]);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !localSession) return;
    const previousState = undoStack[undoStack.length - 1];
    const nextUndoStack = undoStack.slice(0, undoStack.length - 1);

    const currentCopy = JSON.parse(JSON.stringify(localSession));
    setRedoStack(prev => [...prev, currentCopy]);
    setUndoStack(nextUndoStack);
    setLocalSession(previousState);
    saveSession(previousState);
    setNotification("Änderung rückgängig gemacht");
    setTimeout(() => setNotification(null), 2000);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !localSession) return;
    const nextState = redoStack[redoStack.length - 1];
    const nextRedoStack = redoStack.slice(0, redoStack.length - 1);

    const currentCopy = JSON.parse(JSON.stringify(localSession));
    setUndoStack(prev => [...prev, currentCopy]);
    setRedoStack(nextRedoStack);
    setLocalSession(nextState);
    saveSession(nextState);
    setNotification("Änderung wiederhergestellt");
    setTimeout(() => setNotification(null), 2000);
  };

  const handleRestoreInitial = () => {
    if (!initialSessionSnapshot || !localSession) return;
    pushUndoState();
    const restored = JSON.parse(JSON.stringify(initialSessionSnapshot));
    setLocalSession(restored);
    saveSession(restored);
    setNotification("Ursprünglicher Stand wiederhergestellt");
    setTimeout(() => setNotification(null), 2000);
  };

  const addManualPlayer = () => {
    if (!manualPlayerName || !localSession) return;
    pushUndoState();
    
    const trimmed = manualPlayerName.trim();
    const isAlreadyIn = (localSession.players || []).some(p => p && p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (isAlreadyIn) {
      setNotification(`${trimmed} ist bereits in der Anwesenheit vorhanden.`);
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    const newPlayerEntry = {
      name: trimmed,
      position: manualPlayerPos || 'EXTERN',
      status: '1' as any,
      category: manualPlayerCategory
    };
    
    const updatedPlayers = deduplicateSessionPlayers([...(localSession.players || []), newPlayerEntry], players);
    const updatedSession = { ...localSession, players: updatedPlayers };
    setLocalSession(updatedSession);
    if (isEditing) {
      saveSession(updatedSession);
    }
    setManualPlayerName('');
    setManualPlayerPos('');
    setManualPlayerCategory('player'); // Reset to default
    setNotification(`${trimmed} hinzugefügt`);
    setTimeout(() => setNotification(null), 2000);
  };

  const normalizeCategory = (cat?: string) => {
    if (!cat) return 'player';
    const c = cat.toLowerCase();
    
    // Players
    if (c === 'spieler' || c === 'player') return 'player';
    
    // Coaches
    if (['trainer', 'co-trainer', 'tw-trainer', 'athletik', 'coach'].includes(c)) return 'coach';
    
    // Medical
    if (['physio', 'medizinisch', 'medical', 'arzt', 'ärztlich'].includes(c)) return 'medical';
    
    // Staff / Funktionsteam
    if (['betreuer', 'teammanager', 'funktionär', 'staff'].includes(c)) return 'staff';
    
    return c;
  };

  const getCategoryColor = (category?: string) => {
    const cat = normalizeCategory(category);
    switch (cat) {
      case 'coach': return 'bg-blue-600';
      case 'staff': return 'bg-amber-600';
      case 'medical': return 'bg-emerald-600';
      default: return 'bg-[#C00000]';
    }
  };

  const getCategoryBorderColor = (category?: string) => {
    const cat = normalizeCategory(category);
    switch (cat) {
      case 'coach': return 'border-blue-600';
      case 'staff': return 'border-amber-600';
      case 'medical': return 'border-emerald-600';
      default: return 'border-[#C00000]';
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = normalizeCategory(category);
    switch (cat) {
      case 'coach':
        return <Briefcase size={14} className="text-blue-500" />;
      case 'staff':
        return <Shield size={14} className="text-amber-500" />;
      case 'medical':
        return <Activity size={14} className="text-emerald-500" />;
      default: return <User size={14} className="text-red-600" />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    const cat = normalizeCategory(category);
    switch (cat) {
      case 'coach':
        return 'TRAINERTEAM';
      case 'staff':
        return 'FUNKTIONSTEAM';
      case 'medical':
        return 'MEDIZINISCHE ABTEILUNG (PHYSIO / ARZT)';
      default: return 'SPIELERKADER';
    }
  };

  const squadPlayers = players.filter(isPlayer);
  const staffMembers = players.filter(p => !isPlayer(p));
  const sortedPlayers = sortPlayers(squadPlayers);
  const sortedStaff = sortPlayers(staffMembers);

  // Automatic background sanitization for all training sessions in the database
  // This removes any duplicate player/coach/official entries across ALL training sessions (e.g. 14, 18, 20 etc.)
  // CRITICAL: Strictly preserves 100% of all exercises, images, durations, notes, remarks, and focuses!
  const sanitizedSessionsRef = useRef<Set<string>>(new Set());
  const seedRunRef = useRef(false);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  useEffect(() => {
    if (sessions.length > 0 && players.length > 0) {
      sessions.forEach(session => {
        if (!session || !session.players || sanitizedSessionsRef.current.has(session.id)) return;
        
        const cleanPlayers = deduplicateSessionPlayers(session.players, players);
        const hasDuplicatesOrDirty = 
          cleanPlayers.length !== session.players.length ||
          session.players.some((p, idx) => {
            const cleanP = cleanPlayers[idx];
            return !cleanP || cleanP.name !== p.name || cleanP.category !== p.category;
          });

        if (hasDuplicatesOrDirty) {
          sanitizedSessionsRef.current.add(session.id);
          saveSession({
            ...session,
            players: cleanPlayers
          });
        }
      });
    }
  }, [sessions, players, saveSession]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      onSelectSession(sessions[0].id);
    }
  }, [sessions, selectedSessionId, onSelectSession]);

  useEffect(() => {
    if (sessions.length === 0) return;
    const seedRef = seedRunRef.current;
    if (seedRef) return;
    seedRunRef.current = true;
    const missingDate = '2026-09-01';
    const exists = sessions.some(s => s.date === missingDate);
    if (exists) return;
    const today = new Date(missingDate + 'T00:00:00');
    const seedSession: TrainingSession = {
      id: `gen_${missingDate}`,
      date: missingDate,
      weekday: today.toLocaleDateString('de-DE', { weekday: 'long' }),
      group: 'FC Auggen',
      load: 'Mittel',
      loadLevel: 5,
      duration: '90 Min',
      weeklyFocus: '',
      sessionFocus: '',
      trainer: 'Amin, marcel',
      intensity: 'Mittel-Hoch',
      status: 'Geplant',
      opponent: '',
      location: 'Auggen',
      players: getPlayersFromLastSession(missingDate),
      content: {
        warmup: '',
        warmupDuration: '',
        warmupImages: [],
        main1: '',
        main1Duration: '',
        main1Images: [],
        main2: '',
        main2Duration: '',
        main2Images: [],
        closing: '',
        closingDuration: '',
        closingImages: []
      },
      importantInfo: '',
      importantInfoImages: [],
      remarks: '',
      remarksImages: []
    };
    saveSession(seedSession);
  }, [sessions, saveSession]);

  useEffect(() => {
    const session = sessions.find(s => s.id === selectedSessionId);
    if (session) {
      const cleanPlayers = deduplicateSessionPlayers(session.players || [], players);
      const cleanSession: TrainingSession = {
        ...session,
        players: cleanPlayers
      };
      if (!localSession || localSession.id !== session.id || !isEditing) {
        setLocalSession(cleanSession);
        setInitialSessionSnapshot(JSON.parse(JSON.stringify(cleanSession)));
        setUndoStack([]);
        setRedoStack([]);
      }
    } else {
      setLocalSession(null);
      setInitialSessionSnapshot(null);
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [selectedSessionId, sessions, isEditing, players]);

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Shift+Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return;
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else if (!isInput && undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput && redoStack.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, undoStack, redoStack, localSession]);

  // Simple global paste listener
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (!isEditing || !localSession) return;
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData('text/plain');
      const items = clipboardData.items;
      
      const imageBlobs: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) imageBlobs.push(blob);
        }
      }

      const isSubstantialText = text && text.trim().length > 0;
      
      if (imageBlobs.length > 0 && !isSubstantialText) {
        try {
          // Process all images
          const processedImages = await Promise.all(imageBlobs.map(async (blob) => {
            const base64 = await fileToBase64(blob);
            return compressImage(base64);
          }));

          processImagesForSession(processedImages);
        } catch (err) {
          console.error("Global image paste failed", err);
        }
      } else if (isSubstantialText) {
        const content = localSession.content;
        let slot: keyof TrainingSession['content'] | null = null;
        if (!content.warmup) slot = 'warmup';
        else if (!content.main1) slot = 'main1';
        else if (!content.main2) slot = 'main2';
        else if (!content.closing) slot = 'closing';

        if (slot) {
          updateContent(slot, text);
          setNotification("Text eingefügt");
        }
      }
      
      setTimeout(() => setNotification(null), 2000);
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isEditing, localSession]);

  // Autosave local session changes
  useEffect(() => {
    if (localSession && isEditing) {
      const timer = setTimeout(() => {
        saveSession(localSession);
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [localSession, isEditing, saveSession]);

  // Synchronisiere Kader-Anpassungen ins lastSavedSquad, wenn im Bearbeitungsmodus
  useEffect(() => {
    if (localSession && isEditing && localSession.players && (localSession.players || []).length > 0) {
      const squadString = JSON.stringify(localSession.players);
      const lastSavedString = JSON.stringify(lastSavedSquad);
      if (squadString !== lastSavedString) {
        setLastSavedSquad(localSession.players);
      }
    }
  }, [localSession?.players, isEditing, lastSavedSquad, setLastSavedSquad]);

  // Ähnliche vergangene Einheiten erkennen (KI-Hinweis "Du hast das mal gehabt")
  const similarSessions = useMemo(() => {
    if (!localSession || sessions.length <= 1) return [];
    const currentTokens = tokenize(localSession.weeklyFocus + ' ' + localSession.sessionFocus + ' ' + sessionText(localSession));
    if (currentTokens.length === 0) return [];

    const scored = sessions
      .filter(s => s.id !== localSession.id)
      .map(s => {
        const otherTokens = tokenize(s.weeklyFocus + ' ' + s.sessionFocus + ' ' + sessionText(s));
        if (otherTokens.length === 0) return { session: s, score: 0 };
        const otherSet = new Set(otherTokens);
        const common = currentTokens.filter(t => otherSet.has(t));
        const overlap = (2 * common.length) / (currentTokens.length + otherTokens.length);
        const focusMatch = tokenize(localSession.sessionFocus).some(t => tokenize(s.sessionFocus).includes(t)) ? 0.3 : 0;
        return { session: s, score: overlap + focusMatch };
      })
      .filter(r => r.score > 0.2)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3);
  }, [localSession, sessions]);

  // Robust date parser for YYYY-MM-DD, DD.MM.YYYY, D.M.YYYY, DD.MM.YY etc.
  const parseSessionDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0);
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const getPlayersFromLastSession = (beforeDate?: string | Date) => {
    let basePlayers: any[] = [];
    
    // Sort all sessions chronologically descending (newest first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const timeA = parseSessionDate(a.date).getTime();
      const timeB = parseSessionDate(b.date).getTime();
      return timeB - timeA;
    });

    let targetPriorSession: TrainingSession | undefined;

    if (beforeDate) {
      const targetTime = typeof beforeDate === 'string' ? parseSessionDate(beforeDate).getTime() : beforeDate.getTime();
      // Find the latest session that occurred strictly before or on this target date
      targetPriorSession = sortedSessions.find(s => {
        const sTime = parseSessionDate(s.date).getTime();
        return sTime < targetTime && s.players && s.players.length > 0;
      });
    }

    // Fallback: If no prior session found before target date, find the most recent session with players
    if (!targetPriorSession) {
      targetPriorSession = sortedSessions.find(s => s.players && s.players.length > 0);
    }

    if (targetPriorSession && targetPriorSession.players && targetPriorSession.players.length > 0) {
      basePlayers = deduplicateSessionPlayers(targetPriorSession.players, players);
    } else if (lastSavedSquad && lastSavedSquad.length > 0) {
      basePlayers = deduplicateSessionPlayers(lastSavedSquad, players);
    } else {
      const sortedSquad = sortPlayers(players.filter(isPlayer));
      const sortedStaff = sortPlayers(players.filter(p => !isPlayer(p)));
      basePlayers = [
        ...sortedSquad.map(p => ({
          name: getCanonicalPlayerName(p),
          position: p.position,
          status: '1' as any,
          category: p.category
        })),
        ...sortedStaff.map(p => ({
          name: getCanonicalPlayerName(p),
          position: p.position,
          status: '1' as any,
          category: p.category
        }))
      ];
    }

    // Ensure all current club players and staff are present in base without creating phantom duplicates
    players.forEach(p => {
      const canonicalName = getCanonicalPlayerName(p);
      const alreadyExists = basePlayers.some(bp => {
        const matched = matchPlayerToMaster(bp, players);
        return (matched && matched.id === p.id) || bp.name.toLowerCase() === canonicalName.toLowerCase();
      });

      if (!alreadyExists) {
        // PROFI-DATENFLUSS: Anwesenheitsstatus aus letzter Anwesenheits-Erfassung übernehmen
        const attRecord = attendance.find(a => a.playerId === p.id);
        let autoStatus: '1' | 'A' | 'B' | 'k' | 'e' = '1';
        if (attRecord) {
          // Finde den letzten belegten Status (von hinten nach vorne suchen)
          const statusMap = attRecord.sessions || {};
          const sessionNums = Object.keys(statusMap).map(Number).sort((a, b) => b - a);
          for (const num of sessionNums) {
            const s = statusMap[num];
            if (s && s !== '') {
              autoStatus = s as any;
              break;
            }
          }
        }

        basePlayers.push({
          name: canonicalName,
          position: p.position,
          status: autoStatus,
          category: p.category
        });
      }
    });
    
    return deduplicateSessionPlayers(basePlayers, players);
  };

  const handleInheritFromPreviousSession = () => {
    if (!localSession) return;
    pushUndoState();

    const currentSessionDate = parseSessionDate(localSession.date);
    const sorted = [...sessions]
      .filter(s => s.id !== localSession.id && s.players && s.players.length > 0)
      .sort((a, b) => {
        const timeA = parseSessionDate(a.date).getTime();
        const timeB = parseSessionDate(b.date).getTime();
        return timeB - timeA;
      });

    // Find the immediately preceding session
    let prevSession = sorted.find(s => parseSessionDate(s.date).getTime() < currentSessionDate.getTime());
    if (!prevSession && sorted.length > 0) {
      prevSession = sorted[0];
    }

    if (prevSession && prevSession.players && prevSession.players.length > 0) {
      const inherited = deduplicateSessionPlayers(prevSession.players, players);
      const updated: TrainingSession = {
        ...localSession,
        players: inherited
      };
      setLocalSession(updated);
      saveSession(updated);
      setNotification(`Spielerliste & Anwesenheit aus Training vom ${prevSession.date} übernommen.`);
      setTimeout(() => setNotification(null), 3000);
    } else {
      const base = getPlayersFromLastSession(localSession.date);
      const updated: TrainingSession = {
        ...localSession,
        players: base
      };
      setLocalSession(updated);
      saveSession(updated);
      setNotification("Aktueller Vereinskader übernommen.");
      setTimeout(() => setNotification(null), 2500);
    }
  };

  const syncSquadToSubsequentSessions = async (sourceSession?: TrainingSession) => {
    const current = sourceSession || localSession;
    if (!current || !current.players || current.players.length === 0) return 0;
    
    const currentDate = parseSessionDate(current.date);
    const cleanTargetSquad = deduplicateSessionPlayers(current.players, players);
    
    let updatedCount = 0;
    for (const session of sessions) {
      if (session.id === current.id) continue;
      const sessionDate = parseSessionDate(session.date);
      if (sessionDate.getTime() > currentDate.getTime()) {
        const updatedSession: TrainingSession = {
          ...session,
          players: JSON.parse(JSON.stringify(cleanTargetSquad))
        };
        await saveSession(updatedSession);
        updatedCount++;
      }
    }
    return updatedCount;
  };

  const handleAddSession = () => {
    const today = new Date();
    const inheritedPlayers = getPlayersFromLastSession(today);
    
    const newSession: TrainingSession = {
      id: Date.now().toString(),
      date: today.toISOString().split('T')[0],
      weekday: today.toLocaleDateString('de-DE', { weekday: 'long' }),
      group: 'FC Auggen',
      load: 'Mittel',
      loadLevel: 5,
      duration: '90 Min',
      weeklyFocus: '',
      sessionFocus: '',
      trainer: '',
      intensity: 'Mittel',
      status: 'Geplant',
      opponent: '',
      location: 'Auggen',
      players: inheritedPlayers,
      content: {
        warmup: '',
        warmupDuration: '',
        warmupImages: [],
        main1: '',
        main1Duration: '',
        main1Images: [],
        main2: '',
        main2Duration: '',
        main2Images: [],
        closing: '',
        closingDuration: '',
        closingImages: []
      },
      importantInfo: '',
      importantInfoImages: [],
      remarks: '',
      remarksImages: []
    };
    saveSession(newSession);
    onSelectSession(newSession.id);
    setIsEditing(true);
  };

  const handleGenerateUnits = () => {
    setShowGenerateConfirm(true);
  };

  const confirmGenerateUnits = () => {
    setShowGenerateConfirm(false);
    const startDate = new Date('2026-07-06');
    const endDate = new Date('2026-08-15');
    const current = new Date(startDate);
    
    // Get initial base players from the current latest session
    const inheritedPlayers = getPlayersFromLastSession();

    const newSessions: TrainingSession[] = [];
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const weekday = current.toLocaleDateString('de-DE', { weekday: 'long' });
      
      const session: TrainingSession = {
        id: `gen_${dateStr}`,
        date: dateStr,
        weekday,
        group: 'FC Auggen',
        load: 'Mittel',
      loadLevel: 5,
        duration: '90 Min',
        weeklyFocus: '',
        sessionFocus: '',
        trainer: 'Amin, marcel',
        intensity: 'Mittel-Hoch',
        status: 'Geplant',
        opponent: '',
        location: 'Auggen',
        players: inheritedPlayers,
        content: {
          warmup: 'Aktivierung',
          warmupDuration: '',
          warmupImages: [],
          main1: 'Hauptteil',
          main1Duration: '',
          main1Images: [],
          main2: 'SP Hauptteil 2',
          main2Duration: '',
          main2Images: [],
          closing: 'Schluss',
          closingDuration: '',
          closingImages: []
        },
        importantInfo: '',
        importantInfoImages: [],
        remarks: '',
        remarksImages: []
      };
      newSessions.push(session);
      current.setDate(current.getDate() + 1);
    }

    // Save all sessions
    newSessions.forEach(s => saveSession(s));
    setNotification(`${newSessions.length} Einheiten wurden generiert.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    
    const inheritedPlayers = getPlayersFromLastSession();

    // Delete all existing sessions
    for (const session of sessions) {
      deleteSession(session.id);
    }

    // Create the single session for 06.07.2026
    const startDate = new Date('2026-07-06');
    const dateStr = startDate.toISOString().split('T')[0];
    const weekday = startDate.toLocaleDateString('de-DE', { weekday: 'long' });

    const newSession: TrainingSession = {
      id: `gen_${dateStr}`,
      date: dateStr,
      weekday,
      group: 'FC Auggen',
      load: 'Mittel',
      loadLevel: 5,
      duration: '90 Min',
      weeklyFocus: '',
      sessionFocus: '',
      trainer: 'Amin, marcel',
      intensity: 'Mittel-Hoch',
      status: 'Geplant',
      opponent: '',
      location: 'Auggen',
      players: inheritedPlayers,
      content: {
        warmup: 'Aktivierung',
        warmupDuration: '',
        warmupImages: [],
        main1: 'Hauptteil',
        main1Duration: '',
        main1Images: [],
        main2: 'SP Hauptteil 2',
        main2Duration: '',
        main2Images: [],
        closing: 'Schluss',
        closingDuration: '',
        closingImages: []
      },
      importantInfo: '',
      importantInfoImages: [],
      remarks: '',
      remarksImages: []
    };

    saveSession(newSession);
    onSelectSession(newSession.id);
    setNotification('Alle Einheiten gelöscht. Start-Einheit (06.07.2026) erstellt.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    if (localSession) {
      const cleanPlayers = deduplicateSessionPlayers(localSession.players || [], players);
      const cleanedSession: TrainingSession = {
        ...localSession,
        players: cleanPlayers
      };
      await saveSession(cleanedSession);
      setLocalSession(cleanedSession);
      setIsEditing(false);

      setNotification('Einheit erfolgreich gespeichert!');
      setTimeout(() => setNotification(null), 2500);
    }
  };

  const handleDelete = () => {
    if (selectedSessionId) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (selectedSessionId) {
      deleteSession(selectedSessionId);
      onSelectSession(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleShareImage = async () => {
    const card = document.getElementById('training-plan-card');
    if (!card) {
      setNotification("Fehler: Trainingsplan-Karte nicht gefunden");
      return;
    }

    try {
      setNotification("Bild wird generiert...");
      
      // Ensure all images are loaded for html2canvas
      const images = card.getElementsByTagName('img');
      const loadPromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      await Promise.all(loadPromises);

      // Scroll to top of card area if needed to ensure capture works better
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        scrollX: 0,
        scrollY: -window.scrollY, // Offset window scroll
        ignoreElements: (element) => {
          // Ignore external elements that might have problematic CSS
          return !card.contains(element) && element !== card && element !== document.body && element !== document.documentElement;
        },
        onclone: (clonedDoc) => {
          fixOklchForHtml2Canvas(clonedDoc);
          // Robust fix for oklch colors which html2canvas doesn't support
          const container = clonedDoc.getElementById('training-plan-card');
          if (container) {
            const elements = container.querySelectorAll('*');
            elements.forEach((el: any) => {
              if (el instanceof HTMLElement) {
                const style = window.getComputedStyle(el);
                
                // Manually override problematic properties if they contain oklch
                if (style.backgroundColor.includes('oklch')) {
                  // If it's the blue header, use a specific blue
                  if (el.classList.contains('bg-[#1E293B]')) el.style.backgroundColor = '#f3f4f6';
                  else if (el.classList.contains('bg-blue-50')) el.style.backgroundColor = '#eff6ff';
                  else if (el.classList.contains('bg-blue-600')) el.style.backgroundColor = '#2563eb';
                  else el.style.backgroundColor = '#ffffff';
                }
                
                if (style.color.includes('oklch')) {
                  if (el.classList.contains('text-[#C00000]')) el.style.color = '#C00000';
                  else if (el.classList.contains('text-blue-600')) el.style.color = '#2563eb';
                  else el.style.color = '#000000';
                }

                if (style.borderColor.includes('oklch')) {
                  el.style.borderColor = '#000000';
                }
              }
            });
          }
        }
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotification("Fehler beim Erstellen des Bildes");
          return;
        }

        const file = new File([blob], `trainingsplan_${localSession?.date || 'heute'}.png`, { type: 'image/png' });

        // Try Web Share API (Mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'FC Auggen Trainingsplan',
              text: `Trainingsplan vom ${new Date(localSession?.date || Date.now()).toLocaleDateString('de-DE')}`
            });
            setNotification("Bild geteilt!");
            setTimeout(() => setNotification(null), 2000);
            return;
          } catch (e) {
            console.log('Share API failed, falling back to download', e);
          }
        }

        // Fallback 1: Clipboard (Desktop/Modern Browsers)
        if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setNotification("Bild in Zwischenablage kopiert! (Jetzt in WhatsApp einfügen)");
            setTimeout(() => setNotification(null), 4000);
            // We also trigger download as double insurance
          } catch (e) {
            console.log("Clipboard write failed", e);
          }
        }

        // Fallback 2: Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trainingsplan_${localSession?.date || 'heute'}.png`;
        a.click();
        URL.revokeObjectURL(url);
        if (!notification?.includes("Zwischenablage")) {
          setNotification("Bild heruntergeladen");
          setTimeout(() => setNotification(null), 2000);
        }
      }, 'image/png');

    } catch (err) {
      console.error("Image share failed", err);
      setNotification(`Fehler: ${err instanceof Error ? err.message : 'Bild-Export fehlgeschlagen'}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePrint = () => {
    if (!localSession) return;
    const isIframe = window.self !== window.top;
    
    if (isIframe) {
      setNotification("Öffne Druckansicht im neuen Tab für zuverlässigen PDF-Druck...");
      try {
        const printUrl = `${window.location.origin}${window.location.pathname}?tab=training_planning&session_id=${localSession.id}&print=true`;
        window.open(printUrl, '_blank');
      } catch (e) {
        console.error("Popup window.open failed, trying iframe print", e);
        try {
          window.focus();
          window.print();
        } catch (printErr) {
          console.error("Iframe print also failed", printErr);
          setNotification("Drucken blockiert. Bitte klicken Sie ganz oben rechts auf das Tab-Symbol mit Pfeil, um die App im Vollbild zu öffnen.");
          setTimeout(() => setNotification(null), 8000);
          return;
        }
      }
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification("Druckdialog wird vorbereitet...");
      setTimeout(() => {
        try {
          window.focus();
          window.print();
          console.log("Print triggered from Training Plan");
        } catch (e) {
          console.error("Print failed:", e);
          setNotification("Drucken fehlgeschlagen. Bitte nutzen Sie Google Chrome oder laden Sie die Seite neu.");
          setTimeout(() => setNotification(null), 6000);
          return;
        }
        setTimeout(() => setNotification(null), 3000);
      }, 500);
    }
  };

  const handleExportDocx = async () => {
    if (!localSession) {
      setNotification("Keine Trainingseinheit ausgewählt.");
      return;
    }

    try {
      setNotification("Word-Dokument wird erstellt...");

      // Prepare paragraphs
      const children: any[] = [];

      // 1. Header Title
      children.push(
        new DocxParagraph({
          alignment: DocxAlignmentType.CENTER,
          children: [
            new DocxTextRun({
              text: "FC AUGGEN",
              bold: true,
              size: 32, // 16pt
              color: "C00000",
            }),
            new DocxTextRun({
              text: " - TRAININGSPLAN",
              bold: true,
              size: 32, // 16pt
              color: "000000",
            }),
          ],
          spacing: { after: 240 },
        })
      );

      // Helper function to create bold prefix and value
      const createMetaCell = (label: string, val: string) => {
        return new DocxTableCell({
          width: { size: 50, type: DocxWidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          children: [
            new DocxParagraph({
              children: [
                new DocxTextRun({ text: label + ": ", bold: true, size: 20 }),
                new DocxTextRun({ text: val || "-", size: 20 }),
              ],
            }),
          ],
        });
      };

      // 2. Metadata Table
      const table = new DocxTable({
        width: { size: 100, type: DocxWidthType.PERCENTAGE },
        rows: [
          new DocxTableRow({
            children: [
              createMetaCell("Datum", new Date(localSession.date).toLocaleDateString("de-DE")),
              createMetaCell("Wochentag", localSession.weekday),
            ],
          }),
          new DocxTableRow({
            children: [
              createMetaCell("Ort", localSession.location || "-"),
              createMetaCell("Intensität", localSession.intensity || "-"),
            ],
          }),
          new DocxTableRow({
            children: [
              createMetaCell("T.-Gruppe", localSession.group),
              createMetaCell("Belastung", `${localSession.loadLevel || 5}/9 — ${localSession.load}`),
            ],
          }),
          new DocxTableRow({
            children: [
              createMetaCell("Dauer", localSession.duration),
              createMetaCell("Wochenschwerpunkt", localSession.weeklyFocus || "-"),
            ],
          }),
        ],
      });

      children.push(table);
      children.push(new DocxParagraph({ spacing: { after: 200 } }));

      // 3. Weekly Focus & Session Focus & Trainer
      const focusChildren = [
        new DocxTextRun({ text: "Wochenschwerpunkt: ", bold: true, size: 20 }),
        new DocxTextRun({ text: (localSession.weeklyFocus || "-") + "\n", size: 20 }),
        new DocxTextRun({ text: "Schwerpunkt: ", bold: true, size: 20 }),
        new DocxTextRun({ text: (localSession.sessionFocus || "-") + "\n", size: 20 }),
        new DocxTextRun({ text: "Trainer: ", bold: true, size: 20 }),
        new DocxTextRun({ text: (localSession.trainer || "-"), size: 20 }),
      ];

      children.push(
        new DocxParagraph({
          children: focusChildren,
          spacing: { after: 200 },
        })
      );

      // 4. Attendance Section (Teilnehmer)
      const sessionPlayers = deduplicateSessionPlayers(localSession.players || [], players);
      const fieldPlayersCount = sessionPlayers.filter(p => p && normalizeCategory(p.category) === "player" && (p.position || "").toUpperCase() !== "TW" && p.status !== "B" && p.status !== "A").length;
      const keepersCount = sessionPlayers.filter(p => p && normalizeCategory(p.category) === "player" && (p.position || "").toUpperCase() === "TW" && p.status !== "B" && p.status !== "A").length;
      const staffCount = sessionPlayers.filter(p => p && normalizeCategory(p.category) !== "player" && p.status !== "B" && p.status !== "A").length;
      const totalCount = sessionPlayers.filter(p => p && normalizeCategory(p.category) === "player" && p.status !== "B" && p.status !== "A").length;

      children.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: "TEILNEHMER SUMMARY", bold: true, size: 24, color: "C00000" }),
          ],
          spacing: { after: 120 },
        })
      );

      children.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Spieler: ${fieldPlayersCount}  |  `, size: 20 }),
            new DocxTextRun({ text: `Torhüter: ${keepersCount}  |  `, size: 20 }),
            new DocxTextRun({ text: `Staff: ${staffCount}  |  `, size: 20 }),
            new DocxTextRun({ text: `Gesamt (Sp.): ${totalCount}`, bold: true, size: 20 }),
          ],
          spacing: { after: 120 },
        })
      );

      // Lists of players by status
      const trainingPlayers = sessionPlayers.filter(p => p && p.status === "1");
      const aufbauPlayers = sessionPlayers.filter(p => p && p.status === "A");
      const absentPlayers = sessionPlayers.filter(p => p && p.status === "B");

      if (trainingPlayers.length > 0) {
        children.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "Anwesend (Training): ", bold: true, size: 20 }),
              new DocxTextRun({ text: trainingPlayers.map(p => `${p.name} (${p.position})`).join(", "), size: 20 }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (aufbauPlayers.length > 0) {
        children.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "Aufbautraining: ", bold: true, size: 20 }),
              new DocxTextRun({ text: aufbauPlayers.map(p => `${p.name} (${p.position})`).join(", "), size: 20 }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (absentPlayers.length > 0) {
        children.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "Abwesend / Verletzt: ", bold: true, size: 20 }),
              new DocxTextRun({ text: absentPlayers.map(p => `${p.name} (${p.position})`).join(", "), size: 20 }),
            ],
            spacing: { after: 200 },
          })
        );
      } else {
        children.push(new DocxParagraph({ spacing: { after: 200 } }));
      }

      // Helper function to append exercise blocks
      const appendBlock = (title: string, duration: string | undefined, text: string, images: string[] | undefined) => {
        children.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: title.toUpperCase(), bold: true, size: 24, color: "C00000" }),
              new DocxTextRun({ text: duration ? ` (${duration})` : "", bold: true, size: 24 }),
            ],
            spacing: { before: 200, after: 120 },
          })
        );

        if (text) {
          const lines = text.split("\n");
          lines.forEach(line => {
            children.push(
              new DocxParagraph({
                children: [new DocxTextRun({ text: line, size: 22 })],
                spacing: { after: 60 },
              })
            );
          });
        } else {
          children.push(
            new DocxParagraph({
              children: [new DocxTextRun({ text: "Keine Inhalte eingetragen.", italics: true, size: 20 })],
              spacing: { after: 100 },
            })
          );
        }

        if (images && images.length > 0) {
          images.forEach((imgBase64) => {
            try {
              const u8 = base64ToUint8Array(imgBase64);
              if (u8) {
                children.push(
                  new DocxParagraph({
                    alignment: DocxAlignmentType.CENTER,
                    children: [
                      new DocxImageRun({
                        data: u8,
                        transformation: {
                          width: 450,
                          height: 280,
                        },
                      } as any),
                    ],
                    spacing: { before: 120, after: 120 },
                  })
                );
              }
            } catch (e) {
              console.error("Failed to render block image in docx", e);
            }
          });
        }
      };

      // 5. Warmup
      appendBlock("Erwärmung", localSession.content.warmupDuration, localSession.content.warmup, localSession.content.warmupImages);

      // 6. Main 1
      appendBlock("Hauptteil 1", localSession.content.main1Duration, localSession.content.main1, localSession.content.main1Images);

      // 7. Main 2
      appendBlock("Hauptteil 2", localSession.content.main2Duration, localSession.content.main2, localSession.content.main2Images);

      // 8. Schluss
      appendBlock("Schluss", localSession.content.closingDuration, localSession.content.closing, localSession.content.closingImages);

      // 9. Wichtig
      if (localSession.importantInfo || (localSession.importantInfoImages && localSession.importantInfoImages.length > 0)) {
        appendBlock("Wichtig", undefined, localSession.importantInfo, localSession.importantInfoImages);
      }

      // 10. Bemerkungen
      if (localSession.remarks || (localSession.remarksImages && localSession.remarksImages.length > 0)) {
        appendBlock("Bemerkungen", undefined, localSession.remarks, localSession.remarksImages);
      }

      // Create doc
      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      // Packer
      const blob = await DocxPacker.toBlob(doc);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Trainingsplan_${localSession.date}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

      setNotification("Word-Dokument heruntergeladen");
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Docx generation failed", err);
      setNotification(`Fehler: ${err instanceof Error ? err.message : "Word-Export fehlgeschlagen"}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleLoadSquad = () => {
    if (localSession) {
      pushUndoState();
      const sortedSquad = sortPlayers(players.filter(isPlayer));
      const sortedStaff = sortPlayers(players.filter(p => !isPlayer(p)));
      
      const updatedPlayers = [
        ...sortedSquad.map(p => ({
          name: p.lastName,
          position: p.position,
          status: '1' as any,
          category: p.category
        })),
        ...sortedStaff.map(p => ({
          name: p.lastName,
          position: p.position,
          status: '1' as any,
          category: p.category
        }))
      ];
      setLocalSession({ ...localSession, players: updatedPlayers });
      // Ensure it gets saved
      saveSession({ ...localSession, players: updatedPlayers });
    }
  };

  const updateField = (field: keyof TrainingSession, value: any) => {
    if (localSession) {
      pushUndoState();
      const updates: any = { [field]: value };
      if (field === 'date' && value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          updates.weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
        }
      }
      setLocalSession(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const calculateTotalDuration = () => {
    if (!localSession) return 0;
    const durations = [
      localSession.content.warmupDuration,
      localSession.content.main1Duration,
      localSession.content.main2Duration,
      localSession.content.closingDuration,
    ];
    
    return durations.reduce((total, d) => {
      if (!d) return total;
      const matches = d.match(/\d+/);
      return total + (matches ? parseInt(matches[0], 10) : 0);
    }, 0);
  };

  const updateContent = (field: keyof TrainingSession['content'], value: string) => {
    pushUndoState();
    setLocalSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        content: { ...prev.content, [field]: value }
      };
    });
  };

  const updateMultipleContent = (updates: Partial<TrainingSession['content']>) => {
    pushUndoState();
    setLocalSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        content: { ...prev.content, ...updates }
      };
    });
  };

  const processImagesForSession = (images: string[] | string, targetSlot?: keyof TrainingSession['content']) => {
    if (!localSession) return;
    pushUndoState();
    const imageList = Array.isArray(images) ? images : [images];
    
    setLocalSession(prev => {
      if (!prev) return null;
      
      const newContent = { ...prev.content };
      
      if (targetSlot) {
        // Targeted append
        const currentImages = Array.isArray(newContent[targetSlot]) ? (newContent[targetSlot] as string[]) : [];
        (newContent[targetSlot] as string[]) = [...currentImages, ...imageList];
      } else {
        // Global drop - append to first available or warmup by default
        const currentImages = Array.isArray(newContent.warmupImages) ? (newContent.warmupImages as string[]) : [];
        newContent.warmupImages = [...currentImages, ...imageList];
      }
      
      return {
        ...prev,
        content: newContent
      };
    });
    
    setNotification(imageList.length === 1 ? "Bild hinzugefügt" : `${imageList.length} Bilder hinzugefügt`);
    setTimeout(() => setNotification(null), 2000);
  };

  const updatePlayerStatus = (index: number, status: any) => {
    if (localSession && localSession.players) {
      pushUndoState();
      const currentList = deduplicateSessionPlayers(localSession.players, players);
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], status };
      }
      const updatedSession = { ...localSession, players: currentList };
      setLocalSession(updatedSession);
      if (isEditing) {
        saveSession(updatedSession);
      }
    }
  };

  const resolveImageField = (field: keyof TrainingSession['content']): keyof TrainingSession['content'] => {
    return `${field}Images` as keyof TrainingSession['content'];
  };

  const handleTextAreaDrop = async (e: React.DragEvent, targetSlot: keyof TrainingSession['content']) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          imageFiles.push(files[i]);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const processedImages = await Promise.all(imageFiles.map(async (file) => {
            const base64 = await fileToBase64(file);
            return compressImage(base64);
          }));

          processImagesForSession(processedImages, targetSlot);
        } catch (err) {
          console.error("Textarea drop failed", err);
        }
      }
    }
  };

  const handleTextAreaPaste = async (e: React.ClipboardEvent, field: keyof TrainingSession['content']) => {
    if (!isEditing) return;
    
    // Try from items
    const items = e.clipboardData.items;
    const imageBlobs: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) imageBlobs.push(blob);
      }
    }

    if (imageBlobs.length > 0) {
      const text = e.clipboardData.getData('text/plain');
      // If significant text, skip image processing to avoid dual-pasting
      if (text && text.trim().length > 5) {
        return; 
      }

      if (!text || text.trim().length === 0) {
        e.preventDefault();
      }

      try {
        const processedImages = await Promise.all(imageBlobs.map(async (blob) => {
          const base64 = await fileToBase64(blob);
          return compressImage(base64);
        }));

        processImagesForSession(processedImages, resolveImageField(field));
      } catch (err) {
        console.error("Paste to textarea failed", err);
      }
    }

    // Fallback: Try from files
    if (imageBlobs.length === 0 && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles: File[] = [];
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        if (e.clipboardData.files[i].type.startsWith('image/')) {
          imageFiles.push(e.clipboardData.files[i]);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        try {
          const processedImages = await Promise.all(imageFiles.map(async (file) => {
            const base64 = await fileToBase64(file);
            return compressImage(base64);
          }));

          processImagesForSession(processedImages, resolveImageField(field));
        } catch (err) {
          console.error("Paste to textarea failed via files", err);
        }
      }
    }
  };

  const handleSlotSequenceUpload = (targetSlot: keyof TrainingSession['content'], base64OrList: string | string[]) => {
    const images = Array.isArray(base64OrList) ? base64OrList : [base64OrList];
    processImagesForSession(images, targetSlot);
  };

  const removePlayerFromSession = (index: number) => {
    if (localSession && localSession.players) {
      pushUndoState();
      const currentList = deduplicateSessionPlayers(localSession.players, players);
      currentList.splice(index, 1);
      const updatedSession = { ...localSession, players: currentList };
      setLocalSession(updatedSession);
      if (isEditing) {
        saveSession(updatedSession);
      }
    }
  };

  const addPlayerToSession = (player: Player) => {
    if (localSession) {
      pushUndoState();
      const canonicalName = getCanonicalPlayerName(player);
      const isAlreadyIn = (localSession.players || []).some(p => {
        if (!p) return false;
        const matched = matchPlayerToMaster(p, players);
        return (matched && matched.id === player.id) || p.name.toLowerCase() === canonicalName.toLowerCase();
      });
      if (isAlreadyIn) {
        setNotification(`${canonicalName} ist bereits in der Liste.`);
        setTimeout(() => setNotification(null), 2000);
        return;
      }

      const newPlayerEntry = {
        name: canonicalName,
        position: player.position,
        status: '1' as any,
        category: player.category
      };
      
      const updatedPlayers = deduplicateSessionPlayers([...(localSession.players || []), newPlayerEntry], players);
      const updatedSession = { ...localSession, players: updatedPlayers };
      setLocalSession(updatedSession);
      if (isEditing) {
        saveSession(updatedSession);
      }
    }
  };

  const renderAllSessionsColumn = (containerClass = 'flex-1 overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto') => {
    const sortedSessions = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const todayStr = new Date().toISOString().split('T')[0];
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="bg-[#7C3AED] text-white p-2 shrink-0 flex justify-between items-center border-b-2 border-black">
          <span className="font-black uppercase tracking-widest text-[9px] flex items-center gap-1.5"><Calendar size={11} /> Alle Einheiten</span>
          <span className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded">{sessions.length}</span>
        </div>
        <div className={containerClass}>
          {sortedSessions.map(s => {
            const isActive = s.id === (localSession?.id || selectedSessionId);
            const isPast = s.date && s.date < todayStr;
            const similar = similarSessions.find(r => r.session.id === s.id);
            return (
              <button
                key={s.id}
                onClick={() => { onSelectSession(s.id); setIsEditing(false); }}
                className={`w-full text-left p-2 border-b border-black transition-colors cursor-pointer hover:bg-slate-100 ${isActive ? 'bg-emerald-50' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-black uppercase text-[9px] ${isActive ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {formatSessionShort(s.date, s.weekday)}
                  </span>
                  {similar ? (
                    <span className="text-[7px] font-black uppercase bg-amber-200 text-amber-900 px-1 py-0.5 rounded">Ähnlich</span>
                  ) : (
                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                      {isPast ? 'Fertig' : 'Geplant'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!localSession && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-gray-400">
        <Calendar size={64} className="mb-4 opacity-20" />
        <p className="text-xl font-bold uppercase tracking-widest mb-8">Keine Trainingseinheiten geplant</p>
        <div className="flex gap-4">
          <button 
            onClick={handleAddSession}
            className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Plus size={24} /> Erste Einheit erstellen
          </button>
          <button 
            onClick={handleGenerateUnits}
            className="bg-blue-600 text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Calendar size={24} /> Einheiten generieren (06.07 - 15.08)
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className={`flex flex-col h-full bg-[#f8fafc] overflow-y-auto print:h-auto print:overflow-visible print:bg-white ${isFullscreen ? 'fixed inset-0 z-[300] bg-white' : ''}`}>
        {/* Vollbild-Schließen-Button */}
        {isFullscreen && (
          <div className="sticky top-0 z-10 bg-white border-b-2 border-purple-500 px-4 py-2 flex items-center justify-between print:hidden">
            <span className="text-xs font-black text-purple-600 uppercase">Vollbild-Modus — ESC zum Schließen</span>
            <button onClick={() => setIsFullscreen(false)} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 font-black text-[10px] uppercase rounded hover:bg-red-600 cursor-pointer">
              <X size={12} /> Schließen
            </button>
          </div>
        )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DOKUMENT ANSICHT — Zeigt kompletten Trainingsplan als Dokument*/}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'document' && localSession && (
        <div className={`${isFullscreen ? 'max-w-full' : 'max-w-4xl'} mx-auto w-full p-4 sm:p-6 print:p-0`}>
          {/* Toolbar with session switcher */}
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="flex items-center gap-1 bg-purple-600 text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-purple-700 cursor-pointer">
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isFullscreen ? 'Normal' : 'Vollbild'}
              </button>
              <button onClick={() => { setViewMode('edit'); setIsEditing(true); }} className="flex items-center gap-1 bg-black text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-gray-800 cursor-pointer">
                <Edit2 size={14} /> Bearbeitungsmodus
              </button>
              <button onClick={handleAddSession} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-blue-700 cursor-pointer">
                <Plus size={14} /> Neue Einheit
              </button>
            </div>
            {/* Session-Switcher Dropdown */}
            {sessions.length > 1 && (
              <select 
                value={selectedSessionId || ''} 
                onChange={e => {
                  onSelectSession(e.target.value || null);
                  setIsEditing(false);
                }} 
                className="text-[11px] font-bold border-2 border-black rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.date ? new Date(s.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'} {s.group ? `(${s.group})` : ''} {s.opponent ? `vs ${s.opponent}` : ''}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-emerald-700 cursor-pointer">
              <Printer size={14} /> Als PDF drucken
            </button>
          </div>

          {/* DOCUMENT HEADER */}
          <div className="text-center mb-8 border-b-4 border-black pb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{activeClub.name}</div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Trainingsplan</h1>
            <div className="text-sm text-slate-600">
              {localSession.date ? new Date(localSession.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              {localSession.weekday ? ` (${localSession.weekday})` : ''}
            </div>
          </div>

          {/* METADATA GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Ort', value: localSession.location || '—' },
              { label: 'Dauer', value: localSession.duration || '—' },
              { label: 'Belastung', value: `${localSession.loadLevel || 5}/9 ${localSession.load || '—'}` },
              { label: 'Intensität', value: localSession.intensity || '—' },
              { label: 'Trainer', value: localSession.trainer || '—' },
              { label: 'Wochenschwerpunkt', value: localSession.weeklyFocus || '—' },
              { label: 'Einheitsschwerpunkt', value: localSession.sessionFocus || '—' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider">{item.label}</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* ANWESENHEIT / KADER */}
          <div className="mb-6">
            <h2 className="text-sm font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-3 flex items-center gap-2">
              <Users size={16} /> Kader & Anwesenheit
            </h2>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-32 xl:w-36 shrink-0 border-2 border-black rounded-lg overflow-hidden print:hidden">
                <div className="max-h-[400px] min-h-[200px]">{renderAllSessionsColumn('h-full max-h-[400px] overflow-y-auto custom-scrollbar')}</div>
              </div>
              <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {(localSession.players || []).map((p: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                    <span className="font-black text-slate-500 w-6 text-right">{i + 1}.</span>
                    <span className="font-bold flex-1">{p.name}</span>
                    <span className="text-[9px] text-slate-500">{p.position}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                      p.status === '1' || !p.status ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'A' ? 'bg-blue-100 text-blue-700' :
                      p.status === 'B' ? 'bg-red-100 text-red-700' :
                      p.status === 'k' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status === '1' || !p.status ? 'ANW' : p.status === 'A' ? 'AUFBAU' : p.status === 'B' ? 'VERL.' : p.status === 'k' ? 'KRANK' : p.status === 'e' ? 'ENTSC.' : p.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-bold text-slate-500">
                Gesamt: {(localSession.players || []).length} | 
                Anwesend: {(localSession.players || []).filter((p: any) => p.status === '1' || !p.status).length} | 
                Verletzt: {(localSession.players || []).filter((p: any) => p.status === 'B').length} | 
                Krank: {(localSession.players || []).filter((p: any) => p.status === 'k').length}
              </div>
              </div>
            </div>
          </div>

          {/* ERWÄRMUNG */}
          <div className="mb-6 border-2 border-[#10B981] rounded-xl overflow-hidden print:avoid-break">
            <div className="bg-[#10B981] text-white px-4 py-2 flex items-center justify-between print:bg-[#10B981]">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">⚽ Aufwärmen / Aktivierung</h2>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.warmupDuration || '—'}</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.warmup || 'Kein Inhalt eingetragen.'}</p>
              {(localSession.content.warmupImages || []).length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(localSession.content.warmupImages || []).map((img: string, idx: number) => (
                    <img key={idx} src={img} alt={`Aufwärmen ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HAUPTTEIL 1 */}
          <div className="mb-6 border-2 border-[#F59E0B] rounded-xl overflow-hidden print:avoid-break">
            <div className="bg-[#F59E0B] text-white px-4 py-2 flex items-center justify-between print:bg-[#F59E0B]">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">🏃 Hauptteil 1 — Technik / Taktik</h2>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.main1Duration || '—'}</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.main1 || 'Kein Inhalt eingetragen.'}</p>
              {(localSession.content.main1Images || []).length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(localSession.content.main1Images || []).map((img: string, idx: number) => (
                    <img key={idx} src={img} alt={`Hauptteil 1 ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HAUPTTEIL 2 */}
          <div className="mb-6 border-2 border-[#EF4444] rounded-xl overflow-hidden print:avoid-break">
            <div className="bg-[#EF4444] text-white px-4 py-2 flex items-center justify-between print:bg-[#EF4444]">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">⚡ Hauptteil 2 — Intensität / Spiel</h2>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.main2Duration || '—'}</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.main2 || 'Kein Inhalt eingetragen.'}</p>
              {(localSession.content.main2Images || []).length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(localSession.content.main2Images || []).map((img: string, idx: number) => (
                    <img key={idx} src={img} alt={`Hauptteil 2 ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SCHLUSS */}
          <div className="mb-6 border-2 border-[#10B981] rounded-xl overflow-hidden print:avoid-break">
            <div className="bg-[#10B981] text-white px-4 py-2 flex items-center justify-between print:bg-[#10B981]">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">🧘 Schluss / Cool-Down</h2>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.closingDuration || '—'}</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.closing || 'Kein Inhalt eingetragen.'}</p>
              {(localSession.content.closingImages || []).length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(localSession.content.closingImages || []).map((img: string, idx: number) => (
                    <img key={idx} src={img} alt={`Schluss ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* WICHTIGE INFORMATIONEN */}
          {(localSession.importantInfo || localSession.remarks) && (
            <div className="mb-6 border-2 border-slate-300 rounded-xl p-4">
              <h2 className="text-sm font-black uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">📋 Wichtige Informationen</h2>
              {localSession.importantInfo && <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{localSession.importantInfo}</p>}
              {localSession.remarks && <p className="text-xs text-slate-500 whitespace-pre-wrap italic">{localSession.remarks}</p>}
            </div>
          )}

          {/* FOOTER */}
          <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-4 mt-8 print:mt-4">
            Erstellt mit CoCoach — {activeClub.name} — {new Date().toLocaleDateString('de-DE')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BEARBEITUNGS-MODUS                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'edit' && (
    <div className={`flex flex-col h-full bg-[#f8fafc] overflow-y-auto print:h-auto print:overflow-visible print:bg-white ${isFullscreen ? 'fixed inset-0 z-[300] bg-white' : ''}`}>
        {/* Vollbild-Schließen-Button (Edit-Modus) */}
        {isFullscreen && (
          <div className="sticky top-0 z-10 bg-[#111827] border-b-2 border-purple-500 px-4 py-2 flex items-center justify-between print:hidden">
            <span className="text-xs font-black text-purple-400 uppercase">Vollbild-Modus — ESC zum Schließen</span>
            <button onClick={() => setIsFullscreen(false)} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 font-black text-[10px] uppercase rounded hover:bg-red-600 cursor-pointer">
              <X size={12} /> Schließen
            </button>
          </div>
        )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto print:overflow-visible print:h-auto">
        {/* Toolbar — Compact Dark */}
        <div className="px-2 py-1.5 bg-[#111827] border-b border-[#1f2937] flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-0.5 flex-wrap">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-purple-900/30 rounded-md transition-colors flex items-center gap-1 text-purple-400 hover:text-purple-300" title={isFullscreen ? 'Normalmodus' : 'Vollbild'}>
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}<span className="text-[8px] font-bold uppercase hidden sm:inline">{isFullscreen ? 'Normal' : 'Vollbild'}</span>
            </button>
            <button onClick={handleAddSession} className="p-1.5 hover:bg-[#1f2937] rounded-md transition-colors flex items-center gap-1 text-[#94A3B8] hover:text-white" title="Hinzufügen">
              <Plus size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Hinzufügen</span>
            </button>
            <button onClick={() => setShowKiModal(true)} className="p-1.5 hover:bg-purple-900/30 rounded-md transition-colors flex items-center gap-1 text-purple-400 hover:text-purple-300" title="KI-Trainingsplan generieren">
              <BrainCircuit size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">KI-Plan</span>
            </button>
            <button onClick={handleDelete} className="p-1.5 hover:bg-red-900/30 rounded-md transition-colors flex items-center gap-1 text-red-400 hover:text-red-300" title="Entfernen">
              <Trash2 size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Entfernen</span>
            </button>
            <button onClick={handleGenerateUnits} className="p-1.5 hover:bg-blue-900/30 rounded-md transition-colors flex items-center gap-1 text-blue-400 hover:text-blue-300" title="Generieren">
              <Calendar size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Generieren</span>
            </button>
            <button onClick={handleReset} className="p-1.5 hover:bg-orange-900/30 rounded-md transition-colors flex items-center gap-1 text-orange-400 hover:text-orange-300" title="Reset">
              <Activity size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={async () => {
                const count = await syncSquadToSubsequentSessions();
                if (count > 0) { setNotification(`Kader & Anwesenheit auf ${count} Folge-Trainingseinheiten übertragen.`); } else { setNotification('Keine nachfolgenden Trainingseinheiten gefunden.'); }
                setTimeout(() => setNotification(null), 4000);
              }}
              className="p-1.5 hover:bg-emerald-900/30 rounded-md transition-colors flex items-center gap-1 text-emerald-400 hover:text-emerald-300" title="Kader auf Folge-Trainings übertragen"
            >
              <Users size={14} /><span className="text-[8px] font-bold uppercase hidden lg:inline">Kader Folge</span>
            </button>
            <div className="w-px h-5 bg-[#334155] mx-0.5" />
            <button onClick={() => setShowDocumentModal(true)} className="p-1.5 hover:bg-purple-900/30 rounded-md transition-colors flex items-center gap-1 text-purple-400 hover:text-purple-300" title="Bibliothek">
              <FileText size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Bibliothek</span>
            </button>
            <div className="w-px h-5 bg-[#334155] mx-0.5" />
            <button onClick={handleUndo} disabled={undoStack.length === 0} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${undoStack.length > 0 ? 'hover:bg-[#1f2937] text-[#94A3B8] hover:text-white cursor-pointer' : 'opacity-25 cursor-not-allowed text-[#475569]'}`} title="Rückgängig (Strg+Z)">
              <Undo2 size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Rückgängig{undoStack.length > 0 ? ` (${undoStack.length})` : ''}</span>
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${redoStack.length > 0 ? 'hover:bg-[#1f2937] text-[#94A3B8] hover:text-white cursor-pointer' : 'opacity-25 cursor-not-allowed text-[#475569]'}`} title="Wiederholen (Strg+Y)">
              <Redo2 size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Wiederholen</span>
            </button>
            <button onClick={handleRestoreInitial} disabled={!initialSessionSnapshot || undoStack.length === 0} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${initialSessionSnapshot && undoStack.length > 0 ? 'hover:bg-amber-900/30 text-amber-400 hover:text-amber-300 cursor-pointer' : 'opacity-25 cursor-not-allowed text-[#475569]'}`} title="Zurücksetzen">
              <RotateCcw size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Zurücksetzen</span>
            </button>
            <div className="w-px h-5 bg-[#334155] mx-0.5" />
            <button onClick={handleSave} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${isEditing ? 'text-emerald-400 hover:bg-emerald-900/30' : 'opacity-30 text-[#475569]'}`} disabled={!isEditing} title="Speichern">
              <Save size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Speichern</span>
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${isEditing ? 'bg-[#e94560] text-white hover:bg-[#e94560]/80' : 'text-[#94A3B8] hover:bg-[#1f2937] hover:text-white'}`} title="Bearbeiten">
              <Edit2 size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Bearbeiten</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => { setViewMode('document'); setIsEditing(false); }} className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${viewMode === 'edit' ? 'bg-emerald-900/30 text-emerald-400' : 'hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300'}`} title="Ansicht wechseln">
              {viewMode === 'edit' ? <><FileText size={14} /><span className="text-[8px] font-bold uppercase">Dokument</span></> : <><Edit2 size={14} /><span className="text-[8px] font-bold uppercase">Bearbeiten</span></>}
            </button>
            <button onClick={handlePrint} className="p-1.5 hover:bg-blue-900/30 rounded-md transition-colors flex items-center gap-1 text-blue-400 hover:text-blue-300" title="Drucken">
              <Printer size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Drucken</span>
            </button>
            <button onClick={handleExportDocx} className="p-1.5 hover:bg-purple-900/30 rounded-md transition-colors flex items-center gap-1 text-purple-400 hover:text-purple-300" title="Word Export">
              <FileText size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">Word</span>
            </button>
            <button onClick={handleShareImage} className="p-1.5 hover:bg-[#1f2937] rounded-md transition-colors flex items-center gap-1 text-[#94A3B8] hover:text-white" title="E-Mail">
              <Mail size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">E-Mail</span>
            </button>
            <button onClick={handleShareImage} className="p-1.5 hover:bg-emerald-900/30 rounded-md transition-colors flex items-center gap-1 text-emerald-400 hover:text-emerald-300" title="WhatsApp">
              <MessageCircle size={14} /><span className="text-[8px] font-bold uppercase hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>

        {/* ═══ 3-WOCHENPLAN & BELASTUNG (kompakt, oben) ═══ */}
        <div className="bg-white border-b-2 border-black print:hidden shrink-0">
          <div className="px-2.5 py-1 bg-[#111827] flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]">3-Wochenplan · Stufen 1–9 (Intensität auto)</span>
            <span className="text-[7px] font-black uppercase text-slate-400">
              Spieltag: {activeMatchDay === 'friday' ? 'Freitag' : activeMatchDay === 'saturday' ? 'Samstag' : activeMatchDay === 'sunday' ? 'Sonntag' : 'Auto'}
            </span>
          </div>
          {/* Wochen-Wechsler (KW 36–40) */}
          {currentWeekPlans.length > 1 && (
            <div className="px-2.5 py-1 bg-[#0F172A] flex gap-1 overflow-x-auto">
              {KW_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => setWeekIndex(idx)}
                  className={`px-2 py-0.5 rounded text-[7px] font-black uppercase whitespace-nowrap border cursor-pointer transition-all ${
                    weekIndex === idx
                      ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
                      : 'bg-transparent text-slate-400 border-slate-600 hover:text-white hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="px-2.5 py-1.5 space-y-1.5">
            {/* 6 Übungsbausteine als Mini-Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'Aufwärmen', icon: '⚽', base: 'Leicht', color: '#10B981' },
                { key: 'Technik-Drill', icon: '🏃', base: 'Mittel', color: '#F59E0B' },
                { key: 'Sprint-Training', icon: '⚡', base: 'Hoch', color: '#EF4444' },
                { key: 'Taktik-Spiel', icon: '🎯', base: 'Mittel', color: '#8B5CF6' },
                { key: 'Standards', icon: '📐', base: 'Mittel', color: '#06B6D4' },
                { key: 'Cool-Down', icon: '🧘', base: 'Leicht', color: '#10B981' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleDrillCategoryClick(cat.key)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-white hover:shadow cursor-pointer transition-shadow"
                  style={{ borderColor: cat.color, opacity: activeDrillCategory === cat.key ? 1 : 0.7 }}
                  title={`${cat.key} · Basis ${cat.base}`}
                >
                  <span className="text-[11px] leading-none">{cat.icon}</span>
                  <span className="text-[8px] font-black uppercase text-slate-700">{cat.key}</span>
                </button>
              ))}
              <button onClick={addWeekDay} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer" title="Trainingstag hinzufügen">
                <Plus size={11} /><span className="text-[8px] font-black uppercase">Tag</span>
              </button>
            </div>
            {/* Trainingstage (links) — editierbar, mit Auto-Intensität */}
            <div className="flex flex-wrap gap-1.5 items-stretch">
              {weekDays.map((tag, i) => {
                const stufe = BELASTUNGS_STUFEN[tag.stufe];
                const dateBase = new Date(KW_START_DATES[weekIndex] || KW_START_DATES[0]);
                dateBase.setDate(dateBase.getDate() + i);
                const dateStr = dateBase.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                return (
                  <div key={i} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 pl-1.5 pr-1 py-1" style={{ borderLeft: `3px solid ${tag.stufe === 0 ? '#64748b' : stufe?.farbe || '#94a3b8'}` }}>
                    <div className="flex flex-col leading-none">
                      <span className="text-[8px] font-black uppercase text-slate-600">{tag.weekday} · {dateStr}</span>
                      <span className="text-[8px] text-slate-500 truncate max-w-[90px]">{tag.schwerpunkt}</span>
                    </div>
                    <select
                      value={tag.stufe}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changeWeekDayStufe(i, Number(e.target.value))}
                      className="text-[8px] font-black border border-slate-300 rounded bg-white px-0.5 py-0.5 cursor-pointer"
                      title="Belastungsstufe wählen (Intensität passt sich automatisch an)"
                    >
                      {[0,1,2,3,4,5,6,7,8,9].map((s) => (
                        <option key={s} value={s}>{s === 0 ? '0 · Spieltag' : `${s} · ${BELASTUNGS_STUFEN[s].label}`}</option>
                      ))}
                    </select>
                    <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded" style={{ backgroundColor: stufe?.farbe || '#64748b', color: tag.stufe >= 7 ? '#fff' : '#111' }}>
                      {tag.stufe === 0 ? 'Spiel' : stufe?.intensity || ''}
                    </span>
                    <button onClick={() => applyPlanToCurrentSession(tag, i)} className="text-[8px] font-black uppercase text-sky-700 hover:text-sky-500 cursor-pointer" title="In aktuelle Einheit übernehmen">✓</button>
                    <button onClick={() => removeWeekDay(i)} className="text-[9px] font-black text-red-500 hover:text-red-700 cursor-pointer" title="Trainingstag entfernen">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* XPS DRILL PANEL — Kategorien-Editor */}
        <div className="bg-white border-b-2 border-black print:hidden shrink-0">
          <div className="p-3 bg-black text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">XPS Network™ Trainingsplanung</span>
            </div>
            <span className="text-[8px] text-[#64748B]">Drill-Visualisierung • Intensitäts-Zonen • Video-Integration</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {[
              { key: 'Aufwärmen', icon: '⚽', intensity: 'Leicht', color: '#10B981' },
              { key: 'Technik-Drill', icon: '🏃', intensity: 'Mittel', color: '#F59E0B' },
              { key: 'Sprint-Training', icon: '⚡', intensity: 'Hoch', color: '#EF4444' },
              { key: 'Taktik-Spiel', icon: '🎯', intensity: 'Mittel', color: '#8B5CF6' },
              { key: 'Standards', icon: '📐', intensity: 'Mittel', color: '#06B6D4' },
              { key: 'Cool-Down', icon: '🧘', intensity: 'Leicht', color: '#10B981' },
            ].map((cat) => {
              const isActive = activeDrillCategory === cat.key;
              const existingContent = localSession?.content ? (localSession.content as any)[cat.key === 'Aufwärmen' ? 'warmup' : cat.key === 'Technik-Drill' ? 'main1' : cat.key === 'Sprint-Training' ? 'main2' : cat.key === 'Cool-Down' ? 'closing' : ''] || '' : '';
              return (
                <button
                  key={cat.key}
                  onClick={() => handleDrillCategoryClick(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all cursor-pointer ${isActive ? 'ring-2 ring-offset-1 shadow' : 'hover:shadow'}`}
                  style={{ borderColor: isActive ? cat.color : '#e2e8f0', backgroundColor: isActive ? cat.color + '15' : 'white', ...(isActive ? { boxShadow: `0 0 0 2px ${cat.color}` } : {}) }}
                >
                  <span className="text-lg leading-none">{cat.icon}</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-black uppercase text-slate-900">{cat.key}</span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full mt-0.5 ${cat.intensity === 'Hoch' ? 'bg-red-100 text-red-700' : cat.intensity === 'Mittel' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {cat.intensity}
                    </span>
                  </div>
                  {existingContent && <span className="w-2 h-2 rounded-full bg-green-500" title="Inhalt vorhanden" />}
                </button>
              );
            })}
          </div>
          {activeDrillCategory && (
            <div className="border-t-2 border-black p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                  <span className="text-lg">{activeDrillCategory === 'Aufwärmen' ? '⚽' : activeDrillCategory === 'Technik-Drill' ? '🏃' : activeDrillCategory === 'Sprint-Training' ? '⚡' : activeDrillCategory === 'Taktik-Spiel' ? '🎯' : activeDrillCategory === 'Standards' ? '📐' : '🧘'}</span>
                  {activeDrillCategory}
                </h4>
                <button onClick={() => setActiveDrillCategory(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Dauer</label>
                  <input value={drillEditContent.duration} onChange={e => setDrillEditContent({...drillEditContent, duration: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-900 focus:border-[#F59E0B] outline-none" placeholder="z.B. 15 Min" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Intensität</label>
                  <input value={drillEditContent.intensity} onChange={e => setDrillEditContent({...drillEditContent, intensity: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-900 focus:border-[#F59E0B] outline-none" placeholder="Leicht / Mittel / Hoch" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Inhalt / Übung</label>
                <textarea value={drillEditContent.description} onChange={e => setDrillEditContent({...drillEditContent, description: e.target.value})} rows={4} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-900 resize-none focus:border-[#F59E0B] outline-none" placeholder="Beschreibe die Übung, den Ablauf, die Aufgaben..." />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Coachingpunkte</label>
                <textarea value={drillEditContent.coachingPoints} onChange={e => setDrillEditContent({...drillEditContent, coachingPoints: e.target.value})} rows={2} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-900 resize-none focus:border-[#F59E0B] outline-none" placeholder="Was muss der Trainer beachten?" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Varianten / Progression</label>
                <textarea value={drillEditContent.varianten} onChange={e => setDrillEditContent({...drillEditContent, varianten: e.target.value})} rows={2} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-900 resize-none focus:border-[#F59E0B] outline-none" placeholder="Verschiedene Schwierigkeitsstufen oder Alternativen" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Video-Link (optional)</label>
                <input value={drillEditContent.videoLink} onChange={e => setDrillEditContent({...drillEditContent, videoLink: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-900 focus:border-[#F59E0B] outline-none" placeholder="https://..." />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveDrillContent} className="bg-[#F59E0B] hover:bg-amber-500 text-white text-[10px] font-black uppercase px-5 py-2 rounded-lg cursor-pointer transition-all hover:brightness-110 shadow-lg flex items-center gap-1.5">
                  <Save size={12} /> In Training speichern
                </button>
                <button onClick={() => { setActiveDrillCategory(null); setDrillEditContent({ title: '', description: '', duration: '', intensity: '', coachingPoints: '', videoLink: '', varianten: '' }); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase px-4 py-2 rounded-lg cursor-pointer transition-all">
                  Schließen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Area */}
        {localSession && (
          <div 
            key={localSession.id}
            className={`flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors print:overflow-visible print:h-auto print:p-0 ${dragActive ? 'bg-blue-50' : ''}`}
            onDragOver={(e) => {
              if (isEditing) {
                e.preventDefault();
                setDragActive(true);
              }
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={async (e) => {
              if (isEditing) {
                e.preventDefault();
                setDragActive(false);
                const files = Array.from(e.dataTransfer.files);
                const imageFiles = files.filter(f => f.type.startsWith('image/'));
                if (imageFiles.length > 0) {
                  const processed = await Promise.all(imageFiles.map(async (f) => {
                    const b64 = await fileToBase64(f);
                    return compressImage(b64);
                  }));
                  processImagesForSession(processed);
                }
              }
            }}
          >
            <div id="training-plan-card" className="max-w-6xl mx-auto bg-white text-slate-900 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0 flex flex-col print:shadow-none print:max-w-none print:w-full print:border-none print:mx-0 print:overflow-visible print:h-auto">
              
              {/* Top Header Row - Responsive Columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 border-b-2 border-black bg-white text-[10px] font-black uppercase text-slate-900">
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Datum:</span>
                  {isEditing ? (
                    <input 
                      type="date" 
                      value={localSession.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{new Date(localSession.date).toLocaleDateString('de-DE')}</div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Wochentag:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.weekday}
                      onChange={(e) => updateField('weekday', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.weekday}</div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Ort:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.location || ''}
                      onChange={(e) => updateField('location', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.location || '-'}</div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">T.-Gruppe:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.group}
                      onChange={(e) => updateField('group', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.group}</div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Belastung (1-9):</span>
                  {isEditing ? (
                    <select 
                      value={localSession.loadLevel || 5}
                      onChange={(e) => {
                        const lvl = parseInt(e.target.value);
                        const labels: Record<number, string> = { 1: 'Sehr leicht', 2: 'Leicht', 3: 'Leicht-mittel', 4: 'Mittel-leicht', 5: 'Mittel', 6: 'Mittel-hoch', 7: 'Hoch', 8: 'Sehr hoch', 9: 'Maximal' };
                        updateField('loadLevel', lvl);
                        updateField('load', labels[lvl] || 'Mittel');
                        // Intensität automatisch aus Belastungsstufe (%-Bereich) übernehmen
                        updateField('intensity', BELASTUNGS_STUFEN[lvl]?.intensity || localSession.intensity);
                      }}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    >
                      {[1,2,3,4,5,6,7,8,9].map(n => {
                        const labels: Record<number, string> = { 1: 'Sehr leicht', 2: 'Leicht', 3: 'Leicht-mittel', 4: 'Mittel-leicht', 5: 'Mittel', 6: 'Mittel-hoch', 7: 'Hoch', 8: 'Sehr hoch', 9: 'Maximal' };
                        return <option key={n} value={n} className="bg-white text-slate-900">{n} — {labels[n]}</option>;
                      })}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{localSession.loadLevel || 5}/9</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5,6,7,8,9].map(n => {
                          const lvl = localSession.loadLevel || 5;
                          const color = n <= lvl
                            ? n <= 2 ? '#22c55e' : n <= 4 ? '#84cc16' : n <= 6 ? '#eab308' : n <= 7 ? '#f97316' : '#ef4444'
                            : '#e2e8f0';
                          return <div key={n} className="w-2 h-3 rounded-sm" style={{ backgroundColor: color }} />;
                        })}
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold">{localSession.load}</span>
                    </div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Dauer:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.duration}</div>
                  )}
                </div>
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Intensität (auto):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{localSession.intensity || BELASTUNGS_STUFEN[localSession.loadLevel || 5]?.intensity || '—'}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">aus Belastungsstufe</span>
                  </div>
                </div>
                <div className="p-2 flex justify-end items-center">
                  <div className="w-8 h-8 border-l-2 border-black" style={{ backgroundColor: BELASTUNGS_STUFEN[localSession.loadLevel || 5]?.farbe || '#ef4444' }} title="Farbe folgt Belastungsstufe" />
                </div>
              </div>

              {/* Focus Row */}
              <div className="grid grid-cols-2 border-b-2 border-black bg-white text-[10px] font-black uppercase text-slate-900">
                <div className="p-2 border-r-2 border-black">
                  <span className="text-slate-600 font-bold block mb-0.5">Wochenschwerpunkt:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.weeklyFocus}
                      onChange={(e) => updateField('weeklyFocus', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.weeklyFocus || '-'}</div>
                  )}
                </div>
                <div className="p-2">
                  <span className="text-slate-600 font-bold block mb-0.5">Schwerpunkt Einheit:</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={localSession.sessionFocus}
                      onChange={(e) => updateField('sessionFocus', e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none focus:border-black"
                    />
                  ) : (
                    <div className="font-bold text-xs text-slate-900">{localSession.sessionFocus || '-'}</div>
                  )}
                </div>
              </div>

              {/* Trainer Row */}
              <div className="flex justify-end border-b-2 border-black bg-slate-50 text-[10px] font-black uppercase p-2 text-slate-900">
                <span className="text-slate-600 font-bold mr-2">Trainer:</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={localSession.trainer}
                    onChange={(e) => updateField('trainer', e.target.value)}
                    className="bg-white text-slate-900 border border-slate-300 rounded px-1 font-bold text-xs outline-none text-right"
                    placeholder="Amin, marcel"
                  />
                ) : (
                  <div className="font-bold text-xs text-slate-900">{localSession.trainer || 'Amin, marcel'}</div>
                )}
              </div>

              {/* KI-Hinweis: Ähnliche Einheit bereits gehabt */}
              {similarSessions.length > 0 && (
                <div className="border-b-2 border-black bg-amber-50 px-4 py-2 print:hidden">
                  <div className="flex items-start gap-2">
                    <BrainCircuit size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase text-amber-800">Das hattest du schon mal:</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {similarSessions.map(({ session: s, score }) => (
                          <button
                            key={s.id}
                            onClick={() => { onSelectSession(s.id); setIsEditing(false); }}
                            className="text-left bg-white border-2 border-amber-600 rounded px-2 py-1 text-[10px] font-bold text-slate-900 hover:bg-amber-100 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                            title={`Übereinstimmung: ${Math.round(score * 100)}%`}
                          >
                            <span className="font-black uppercase">{formatSessionShort(s.date, s.weekday)}</span>
                            <span className="text-slate-500"> · </span>
                            <span className="text-slate-700">{s.sessionFocus || s.weeklyFocus || 'Einheit'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area - Split Layout */}
              <div className="flex flex-col lg:flex-row flex-1 min-h-[600px] print:h-auto print:min-h-0 print:overflow-visible">
                {/* Leftest Column: Alle Einheiten (vergangene + kommende) */}
                <div className="w-full lg:w-32 xl:w-36 shrink-0 border-b-2 lg:border-b-0 lg:border-r-2 border-black flex flex-col bg-white print:hidden">
                  {renderAllSessionsColumn()}
                </div>
                {/* Left Column: Player List */}
                <div className="w-full lg:w-1/4 border-b-2 lg:border-b-0 lg:border-r-2 border-black flex flex-col bg-slate-50 print:bg-white print:overflow-visible print:h-auto">
                  <div className="bg-black text-white p-2 shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black uppercase tracking-widest text-[10px]">Anwesenheit</h3>
                      <button
                        onClick={handleInheritFromPreviousSession}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                        title="Spielerliste & Anwesenheitsstatus aus dem letzten Training übernehmen"
                      >
                        <History size={11} className="text-amber-400" />
                        <span>Aus letztem Training</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <button 
                          onClick={() => setShowAddPlayerModal(true)}
                          className="p-1 hover:text-green-500 transition-colors"
                          title="Spieler hinzufügen"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto player-list-print-grid">
                    {(() => {
                      const displayAttendancePlayers = deduplicateSessionPlayers(localSession.players || [], players);
                      if (displayAttendancePlayers.length === 0) {
                        return (
                          <div className="p-8 text-center opacity-20 italic font-black uppercase text-[10px] text-slate-600">
                            Keine Spieler geladen
                          </div>
                        );
                      }
                      return displayAttendancePlayers.map((p, idx) => {
                        if (!p) return null;
                        const fullPlayer = matchPlayerToMaster(p, players);
                        const cat = p.category || fullPlayer?.category || 'player';
                        const isStaff = !isPlayer({ category: cat });
                        const ampelStatus = isStaff ? null : getPlayerAmpel(p, fullPlayer);
                        const ampelColor = ampelStatus === 'Rot' ? 'bg-red-500' : ampelStatus === 'Gelb' ? 'bg-yellow-400' : 'bg-green-500';
                        
                        // Check if we need a separator line before this item
                        const prevPlayer = idx > 0 ? displayAttendancePlayers[idx - 1] : null;
                        const prevCat = prevPlayer?.category || 'player';
                        const prevIsStaff = !isPlayer({ category: prevCat });
                        
                        const showSeparator = idx > 0 && isStaff && !prevIsStaff;

                        return (
                          <React.Fragment key={`${p.name}-${idx}`}>
                            {showSeparator && (
                              <div className="border-t-4 border-black bg-gray-200 p-1 flex items-center justify-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-black/60">Trainer- & Funktionsteam</span>
                              </div>
                            )}
                            <div
                              className={`w-full flex items-center justify-between p-2 border-b border-black last:border-b-0 transition-all bg-white relative overflow-hidden group hover:bg-slate-50`}
                            >
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${getCategoryColor(cat)}`} />
                              
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className={`w-7 h-7 flex items-center justify-center text-[10px] font-black border border-black shrink-0 transition-transform group-hover:scale-105 bg-slate-100 text-slate-900 ${getCategoryBorderColor(cat)} border-2`}>
                                    {(normalizeCategory(cat) === 'player') ? `#${fullPlayer?.number || '?'}` : getCategoryIcon(cat)}
                                  </span>
                                  <div className="text-left min-w-0 flex-1 flex items-center gap-2">
                                    <p className="font-black uppercase text-[11px] text-slate-900 leading-tight truncate flex-1">
                                      {p.name}
                                    </p>
                                    <div className="w-14 border-l border-black/20 pl-2 shrink-0">
                                      <p className="text-[9px] font-black uppercase text-slate-900 truncate text-center leading-none">
                                        {p.position}
                                      </p>
                                    </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                              {ampelStatus && (
                                <span
                                  className={`w-6 h-6 rounded-full ${ampelColor} border-2 border-black flex items-center justify-center text-[9px] font-black text-black/60`}
                                  title={`Ampel (Individuelle Steuerung): ${ampelStatus}`}
                                />
                              )}
                              {isEditing && (
                                <button 
                                  onClick={() => removePlayerFromSession(idx)}
                                  className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors mr-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                              {isEditing ? (
                                <select 
                                  value={p.status}
                                  onChange={(e) => updatePlayerStatus(idx, e.target.value)}
                                  className={`
                                    min-w-[40px] px-1 py-0.5 border-2 border-black text-[10px] font-black uppercase focus:outline-none transition-colors
                                    ${p.status === '1' ? 'bg-green-100 text-green-800' : ''}
                                    ${p.status === 'A' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${p.status === 'B' ? 'bg-red-100 text-red-800' : ''}
                                  `}
                                >
                                  <option value="1" className="bg-white text-slate-900">1</option>
                                  <option value="A" className="bg-white text-slate-900">A</option>
                                  <option value="B" className="bg-white text-slate-900">B</option>
                                </select>
                              ) : (
                                <div className={`
                                  w-6 h-6 flex items-center justify-center border-2 border-black text-[10px] font-black
                                  ${p.status === '1' ? 'bg-green-500 text-white' : ''}
                                  ${p.status === 'A' ? 'bg-yellow-400 text-black' : ''}
                                  ${p.status === 'B' ? 'bg-red-600 text-white' : ''}
                                `}>
                                  {p.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                        );
                      });
                    })()}
                  </div>

                  {/* Player Counts Summary */}
                  {(() => {
                    const dedupedSummaryPlayers = deduplicateSessionPlayers(localSession.players || [], players);
                    if (dedupedSummaryPlayers.length === 0) return null;
                    return (
                      <div className="p-2 border-t-2 border-black bg-slate-100 flex justify-between items-center text-[9px] font-black uppercase text-slate-900 shrink-0">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600 font-bold">Spieler:</span>
                            <span className="text-slate-900 font-black">{dedupedSummaryPlayers.filter(p => p && normalizeCategory(p.category) === 'player' && (p.position || '').toUpperCase() !== 'TW' && p.status !== 'B' && p.status !== 'A').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600 font-bold">TW:</span>
                            <span className="text-blue-700 font-black">{dedupedSummaryPlayers.filter(p => p && normalizeCategory(p.category) === 'player' && (p.position || '').toUpperCase() === 'TW' && p.status !== 'B' && p.status !== 'A').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600 font-bold">Staff:</span>
                            <span className="text-slate-900 font-black">{dedupedSummaryPlayers.filter(p => p && normalizeCategory(p.category) !== 'player' && p.status !== 'B' && p.status !== 'A').length}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 font-bold">Gesamt (Sp.):</span>
                          <span className="text-[#C00000] font-black underline">{dedupedSummaryPlayers.filter(p => p && normalizeCategory(p.category) === 'player' && p.status !== 'B' && p.status !== 'A').length}</span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Legend */}
                  <div className="p-2 border-t-2 border-black bg-slate-100 text-[9px] font-black uppercase text-slate-900 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 border border-black flex items-center justify-center text-white font-bold">1</div>
                      <span className="text-slate-900">Training</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-400 border border-black flex items-center justify-center text-slate-900 font-bold">A</div>
                      <span className="text-slate-900">Aufbau</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 border border-black flex items-center justify-center text-white font-bold">B</div>
                      <span className="text-slate-900">Verletzt/Krank/Entschuldigt</span>
                    </div>
                    <div className="my-1 border-t border-black/30" />
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 border border-black"></div>
                      <span className="text-slate-900">Ampel Grün · Fit / einsatzbereit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 border border-black"></div>
                      <span className="text-slate-900">Ampel Gelb · Belastung / Aufbau</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500 border border-black"></div>
                      <span className="text-slate-900">Ampel Rot · Verletzt / Ausfall</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Content Sections */}
                <div className="flex-1 flex flex-col print:overflow-visible print:h-auto">
                  {/* Intensity Bar */}
                  <div className="bg-yellow-400 text-slate-900 border-b-2 border-black p-2 flex justify-center items-center gap-4 text-[10px] font-black uppercase">
                    <span className="text-slate-900 font-black">Intensität:</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={localSession.intensity}
                        onChange={(e) => updateField('intensity', e.target.value)}
                        className="bg-white text-slate-900 border border-black font-black text-xs outline-none text-center px-2 py-0.5"
                        placeholder="Mittel-Hoch"
                      />
                    ) : (
                      <span className="font-black text-xs text-slate-900">{localSession.intensity || 'Mittel-Hoch'}</span>
                    )}
                  </div>

                  {/* Content Sections */}
                  <div className="flex-1 flex flex-col print:overflow-visible print:h-auto text-slate-900">
                    <div className="flex-1 border-b-2 border-black flex flex-col min-h-[150px] print:min-h-0 print:h-auto print:overflow-visible print:avoid-break">
                      <div className="bg-[#10B981] text-white p-2 border-b border-black text-[10px] font-black uppercase flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="text-sm">⚽</span> Erwärmung / Aktivierung</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={localSession.content.warmupDuration || ''}
                              onChange={(e) => updateContent('warmupDuration', e.target.value)}
                              className="w-14 bg-white/20 text-white border border-white/40 px-1 text-[9px] font-bold outline-none rounded"
                              placeholder="min"
                            />
                          ) : (
                            <span className="bg-white/20 text-white font-bold border border-white/40 px-1 text-[9px] rounded">{localSession.content.warmupDuration || '-'}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-100 text-slate-900 p-1 border-b border-black text-[9px] font-black uppercase text-center">Aktivierung</div>
                      <div className="flex-1 flex flex-col sm:flex-row min-h-0 print:h-auto print:min-h-0 print:overflow-visible">
                        {isEditing ? (
                          <textarea 
                            value={localSession.content.warmup || ''}
                            onChange={(e) => updateContent('warmup', e.target.value)}
                            onPaste={(e) => handleTextAreaPaste(e, 'warmup')}
                            onDrop={(e) => handleTextAreaDrop(e, resolveImageField('warmup'))}
                            onDragOver={(e) => e.preventDefault()}
                            placeholder="Text hier einfügen... (Bilder können auch einfach mit Strg+V oder Drag & Drop eingefügt werden)"
                            className="flex-1 p-4 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded outline-none resize-none w-full placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="flex-1 p-4 font-bold text-sm text-slate-900 bg-white whitespace-pre-wrap w-full">{localSession.content.warmup}</div>
                        )}
                        <div className="flex gap-1 p-1 overflow-x-auto border-t sm:border-t-0 sm:border-l border-black bg-slate-50 w-full sm:min-w-[120px] sm:max-w-[400px] print:flex-wrap print:overflow-visible print:max-w-none print:w-auto print:border-none print:bg-white shrink-0">
                          {(localSession.content.warmupImages || []).map((img, idx) => (
                            <ImageUpload 
                              key={idx}
                              onUpload={(data) => {
                                const imgs = [...(localSession.content.warmupImages || [])];
                                imgs[idx] = Array.isArray(data) ? data[0] : data;
                                updateContent('warmupImages' as any, imgs as any);
                              }}
                              onDelete={() => {
                                const imgs = [...(localSession.content.warmupImages || [])];
                                imgs.splice(idx, 1);
                                updateContent('warmupImages' as any, imgs as any);
                              }}
                              currentImage={img}
                              isEditing={isEditing}
                              className="w-32 h-full flex-shrink-0 print:w-40 print:h-40 print:m-1"
                            />
                          ))}
                          {isEditing && (
                            <ImageUpload 
                              onUpload={(data) => processImagesForSession(data, 'warmupImages' as any)}
                              isEditing={true}
                              label="+"
                              className="w-12 h-full flex-shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 border-b-2 border-black flex flex-col min-h-[150px] print:min-h-0 print:h-auto print:overflow-visible print:avoid-break">
                      <div className="bg-[#F59E0B] text-white p-2 border-b border-black text-[10px] font-black uppercase flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="text-sm">🏃</span> Hauptteil 1 — Technik / Taktik</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={localSession.content.main1Duration || ''}
                              onChange={(e) => updateContent('main1Duration', e.target.value)}
                              className="w-14 bg-white/20 text-white border border-white/40 px-1 text-[9px] font-bold outline-none rounded"
                              placeholder="min"
                            />
                          ) : (
                            <span className="bg-white/20 text-white font-bold border border-white/40 px-1 text-[9px] rounded">{localSession.content.main1Duration || '-'}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row min-h-0 print:h-auto print:min-h-0 print:overflow-visible">
                        {isEditing ? (
                          <textarea 
                            value={localSession.content.main1 || ''}
                            onChange={(e) => updateContent('main1', e.target.value)}
                            onPaste={(e) => handleTextAreaPaste(e, 'main1')}
                            onDrop={(e) => handleTextAreaDrop(e, resolveImageField('main1'))}
                            onDragOver={(e) => e.preventDefault()}
                            placeholder="Text hier einfügen... (Bilder können auch einfach mit Strg+V oder Drag & Drop eingefügt werden)"
                            className="flex-1 p-4 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded outline-none resize-none w-full placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="flex-1 p-4 font-bold text-sm text-slate-900 bg-white whitespace-pre-wrap w-full">{localSession.content.main1}</div>
                        )}
                        <div className="flex gap-1 p-1 overflow-x-auto border-t sm:border-t-0 sm:border-l border-black bg-slate-50 w-full sm:min-w-[120px] sm:max-w-[400px] print:flex-wrap print:overflow-visible print:max-w-none print:w-auto print:border-none print:bg-white shrink-0">
                          {(localSession.content.main1Images || []).map((img, idx) => (
                            <ImageUpload 
                              key={idx}
                              onUpload={(data) => {
                                const imgs = [...(localSession.content.main1Images || [])];
                                imgs[idx] = Array.isArray(data) ? data[0] : data;
                                updateContent('main1Images' as any, imgs as any);
                              }}
                              onDelete={() => {
                                const imgs = [...(localSession.content.main1Images || [])];
                                imgs.splice(idx, 1);
                                updateContent('main1Images' as any, imgs as any);
                              }}
                              currentImage={img}
                              isEditing={isEditing}
                              className="w-32 h-full flex-shrink-0 print:w-40 print:h-40 print:m-1"
                            />
                          ))}
                          {isEditing && (
                            <ImageUpload 
                              onUpload={(data) => processImagesForSession(data, 'main1Images' as any)}
                              isEditing={true}
                              label="+"
                              className="w-12 h-full flex-shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 border-b-2 border-black flex flex-col min-h-[150px] print:min-h-0 print:h-auto print:overflow-visible print:avoid-break">
                      <div className="bg-[#EF4444] text-white p-2 border-b border-black text-[10px] font-black uppercase flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="text-sm">⚡</span> Hauptteil 2 — Intensität / Spiel</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={localSession.content.main2Duration || ''}
                              onChange={(e) => updateContent('main2Duration', e.target.value)}
                              className="w-14 bg-white/20 text-white border border-white/40 px-1 text-[9px] font-bold outline-none rounded"
                              placeholder="min"
                            />
                          ) : (
                            <span className="bg-white/20 text-white font-bold border border-white/40 px-1 text-[9px] rounded">{localSession.content.main2Duration || '-'}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row min-h-0 print:h-auto print:min-h-0 print:overflow-visible">
                        {isEditing ? (
                          <textarea 
                            value={localSession.content.main2 || ''}
                            onChange={(e) => updateContent('main2', e.target.value)}
                            onPaste={(e) => handleTextAreaPaste(e, 'main2')}
                            onDrop={(e) => handleTextAreaDrop(e, resolveImageField('main2'))}
                            onDragOver={(e) => e.preventDefault()}
                            placeholder="Text hier einfügen... (Bilder können auch einfach mit Strg+V oder Drag & Drop eingefügt werden)"
                            className="flex-1 p-4 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded outline-none resize-none w-full placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="flex-1 p-4 font-bold text-sm text-slate-900 bg-white whitespace-pre-wrap w-full">{localSession.content.main2}</div>
                        )}
                        <div className="flex gap-1 p-1 overflow-x-auto border-t sm:border-t-0 sm:border-l border-black bg-slate-50 w-full sm:min-w-[120px] sm:max-w-[400px] print:flex-wrap print:overflow-visible print:max-w-none print:w-auto print:border-none print:bg-white shrink-0">
                          {(localSession.content.main2Images || []).map((img, idx) => (
                            <ImageUpload 
                              key={idx}
                              onUpload={(data) => {
                                const imgs = [...(localSession.content.main2Images || [])];
                                imgs[idx] = Array.isArray(data) ? data[0] : data;
                                updateContent('main2Images' as any, imgs as any);
                              }}
                              onDelete={() => {
                                const imgs = [...(localSession.content.main2Images || [])];
                                imgs.splice(idx, 1);
                                updateContent('main2Images' as any, imgs as any);
                              }}
                              currentImage={img}
                              isEditing={isEditing}
                              className="w-32 h-full flex-shrink-0 print:w-40 print:h-40 print:m-1"
                            />
                          ))}
                          {isEditing && (
                            <ImageUpload 
                              onUpload={(data) => processImagesForSession(data, 'main2Images' as any)}
                              isEditing={true}
                              label="+"
                              className="w-12 h-full flex-shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[150px] print:min-h-0 print:h-auto print:overflow-visible print:avoid-break">
                      <div className="bg-[#10B981] text-white p-2 border-b border-black text-[10px] font-black uppercase flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="text-sm">🧘</span> Schluss / Cool-Down</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={localSession.content.closingDuration || ''}
                              onChange={(e) => updateContent('closingDuration', e.target.value)}
                              className="w-14 bg-white/20 text-white border border-white/40 px-1 text-[9px] font-bold outline-none rounded"
                              placeholder="min"
                            />
                          ) : (
                            <span className="bg-white/20 text-white font-bold border border-white/40 px-1 text-[9px] rounded">{localSession.content.closingDuration || '-'}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row min-h-0 print:h-auto print:min-h-0 print:overflow-visible">
                        {isEditing ? (
                          <textarea 
                            value={localSession.content.closing || ''}
                            onChange={(e) => updateContent('closing', e.target.value)}
                            onPaste={(e) => handleTextAreaPaste(e, 'closing')}
                            onDrop={(e) => handleTextAreaDrop(e, resolveImageField('closing'))}
                            onDragOver={(e) => e.preventDefault()}
                            placeholder="Text hier einfügen... (Bilder können auch einfach mit Strg+V oder Drag & Drop eingefügt werden)"
                            className="flex-1 p-4 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded outline-none resize-none w-full placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="flex-1 p-4 font-bold text-sm text-slate-900 bg-white whitespace-pre-wrap w-full">{localSession.content.closing}</div>
                        )}
                        <div className="flex gap-1 p-1 overflow-x-auto border-t sm:border-t-0 sm:border-l border-black bg-slate-50 w-full sm:min-w-[120px] sm:max-w-[400px] print:flex-wrap print:overflow-visible print:max-w-none print:w-auto print:border-none print:bg-white shrink-0">
                          {(localSession.content.closingImages || []).map((img, idx) => (
                            <ImageUpload 
                              key={idx}
                              onUpload={(data) => {
                                const imgs = [...(localSession.content.closingImages || [])];
                                imgs[idx] = Array.isArray(data) ? data[0] : data;
                                updateContent('closingImages' as any, imgs as any);
                              }}
                              onDelete={() => {
                                const imgs = [...(localSession.content.closingImages || [])];
                                imgs.splice(idx, 1);
                                updateContent('closingImages' as any, imgs as any);
                              }}
                              currentImage={img}
                              isEditing={isEditing}
                              className="w-32 h-full flex-shrink-0 print:w-40 print:h-40 print:m-1"
                            />
                          ))}
                          {isEditing && (
                            <ImageUpload 
                              onUpload={(data) => processImagesForSession(data, 'closingImages' as any)}
                              isEditing={true}
                              label="+"
                              className="w-12 h-full flex-shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Total Duration Footer */}
                    <div className="bg-black text-white p-2 flex justify-between items-center text-[10px] font-black uppercase">
                      <span>Gesamtdauer (Summe der Teile):</span>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{calculateTotalDuration()} Min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Bottom Info */}
              <div className="border-t-2 border-black p-4 bg-slate-50 text-slate-900 grid grid-cols-2 gap-4 print:grid-cols-1 print:gap-2">
                <div className="space-y-2 print:avoid-break">
                  <label className="block text-[10px] font-black uppercase text-slate-900">Wichtige Informationen:</label>
                  {isEditing ? (
                    <textarea 
                      value={localSession.importantInfo || ''}
                      onChange={(e) => updateField('importantInfo', e.target.value)}
                      className="w-full p-4 border-2 border-black bg-white text-slate-900 font-bold text-xs outline-none h-32 resize-none"
                    />
                  ) : (
                    <div className="p-4 border-2 border-black bg-white text-slate-900 font-bold text-sm min-h-[8rem] print:min-h-0">
                      {localSession.importantInfo}
                    </div>
                  )}
                  <div className="flex gap-2 p-2 bg-slate-100 border-2 border-black overflow-x-auto min-h-[100px] print:flex-wrap print:overflow-visible print:border-none print:bg-white print:p-0">
                    {(localSession.importantInfoImages || []).map((img, idx) => (
                      <ImageUpload 
                        key={idx}
                        onUpload={(data) => {
                          const imgs = [...(localSession.importantInfoImages || [])];
                          imgs[idx] = Array.isArray(data) ? data[0] : data;
                          updateField('importantInfoImages', imgs);
                        }}
                        onDelete={() => {
                          const imgs = (localSession.importantInfoImages || []).filter((_, i) => i !== idx);
                          updateField('importantInfoImages', imgs);
                        }}
                        currentImage={img}
                        isEditing={isEditing}
                        className="w-24 h-24 flex-shrink-0 bg-white print:w-32 print:h-32 print:m-1"
                      />
                    ))}
                    {isEditing && (
                      <ImageUpload 
                        onUpload={(data) => {
                          const newImgs = [...(localSession.importantInfoImages || []), ...(Array.isArray(data) ? data : [data])];
                          updateField('importantInfoImages', newImgs);
                        }}
                        isEditing={true}
                        label="+"
                        className="w-10 h-24 flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2 print:avoid-break">
                  <label className="block text-[10px] font-black uppercase text-slate-900">Bemerkungen:</label>
                  {isEditing ? (
                    <textarea 
                      value={localSession.remarks || ''}
                      onChange={(e) => updateField('remarks', e.target.value)}
                      className="w-full p-4 border-2 border-black bg-white text-slate-900 font-bold text-xs outline-none h-32 resize-none"
                    />
                  ) : (
                    <div className="p-4 border-2 border-black bg-white text-slate-900 font-bold text-sm min-h-[8rem] relative print:min-h-0">
                      {localSession.remarks}
                      <div className="absolute bottom-2 right-2 w-24 h-24 opacity-20 print:hidden">
                        <img src="https://picsum.photos/seed/auggen/100/100" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 p-2 bg-slate-100 border-2 border-black overflow-x-auto min-h-[100px] print:flex-wrap print:overflow-visible print:border-none print:bg-white print:p-0">
                    {(localSession.remarksImages || []).map((img, idx) => (
                      <ImageUpload 
                        key={idx}
                        onUpload={(data) => {
                          const imgs = [...(localSession.remarksImages || [])];
                          imgs[idx] = Array.isArray(data) ? data[0] : data;
                          updateField('remarksImages', imgs);
                        }}
                        onDelete={() => {
                          const imgs = (localSession.remarksImages || []).filter((_, i) => i !== idx);
                          updateField('remarksImages', imgs);
                        }}
                        currentImage={img}
                        isEditing={isEditing}
                        className="w-24 h-24 flex-shrink-0 bg-white print:w-32 print:h-32 print:m-1"
                      />
                    ))}
                    {isEditing && (
                      <ImageUpload 
                        onUpload={(data) => {
                          const newImgs = [...(localSession.remarksImages || []), ...(Array.isArray(data) ? data : [data])];
                          updateField('remarksImages', newImgs);
                        }}
                        isEditing={true}
                        label="+"
                        className="w-10 h-24 flex-shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Training Session Video Section */}
                <div className="space-y-2 mt-6 print:hidden">
                  <VideoSection 
                    title="TRAININGS- & ÜBUNGS-VIDEOS"
                    subtitle="Übungsausführungen, Taktik-Videos und Trainingsanalysen"
                    clips={localSession.videoClips || []}
                    onUpdateClips={(clips) => updateField('videoClips', clips)}
                    players={players}
                    defaultCategory="Training"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 border-t-2 border-black flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-40">
                <span>FC AUGGEN 1921 e.V.</span>
                <span>Team Management System 2026/2027</span>
              </div>
            </div>

          </div>
        )}
      </div>
      {/* Modals and Notifications */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-sm w-full text-slate-900">
            <h3 className="font-black uppercase text-lg mb-4 text-slate-900">Einheit löschen?</h3>
            <p className="font-bold text-sm mb-6 text-slate-700">Möchten Sie diese Trainingseinheit wirklich unwiderruflich entfernen?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 border-2 border-black py-2 font-black uppercase text-xs hover:bg-gray-300 transition-all text-slate-900"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white border-2 border-black py-2 font-black uppercase text-xs hover:bg-red-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full text-slate-900">
            <h3 className="font-black uppercase text-lg mb-4 text-slate-900">Einheiten generieren</h3>
            <p className="font-bold text-sm mb-6 text-slate-700">
              Möchten Sie Einheiten für jeden Tag vom <span className="text-blue-600">06.07.2026</span> bis zum <span className="text-blue-600">15.08.2026</span> generieren?
              <br/><br/>
              Bereits existierende Einheiten mit gleichem Datum werden überschrieben.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowGenerateConfirm(false)}
                className="flex-1 bg-gray-200 border-2 border-black py-2 font-black uppercase text-xs hover:bg-gray-300 transition-all text-slate-900"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmGenerateUnits}
                className="flex-1 bg-blue-600 text-white border-2 border-black py-2 font-black uppercase text-xs hover:bg-blue-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Generieren
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full text-slate-900">
            <h3 className="font-black uppercase text-lg mb-4 text-orange-600">Alle Einheiten löschen?</h3>
            <p className="font-bold text-sm mb-6 text-slate-700">
              Möchten Sie wirklich <span className="text-red-600 underline">ALLE</span> Trainingseinheiten löschen und nur eine neue Einheit für den <span className="text-blue-600">06.07.2026</span> erstellen?
              <br/><br/>
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-gray-200 border-2 border-black py-2 font-black uppercase text-xs hover:bg-gray-300 transition-all text-slate-900"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmReset}
                className="flex-1 bg-orange-600 text-white border-2 border-black py-2 font-black uppercase text-xs hover:bg-orange-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Alles löschen & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-black text-white border-2 border-white px-6 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            {notification}
          </div>
        </div>
      )}

      {showAddPlayerModal && localSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl flex flex-col max-h-[80vh] text-slate-900">
            <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm italic">Spieler hinzufügen</h3>
              <button 
                onClick={() => setShowAddPlayerModal(false)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 border-b-2 border-black bg-slate-50 text-slate-900">
              <p className="text-[10px] font-black uppercase mb-2 text-slate-900">Externer Spieler / Gast hinzufügen</p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Name"
                    value={manualPlayerName}
                    onChange={(e) => setManualPlayerName(e.target.value)}
                    className="flex-1 border-2 border-black bg-white text-slate-900 p-2 text-xs font-bold uppercase focus:ring-2 focus:ring-red-600 outline-none"
                  />
                  <input 
                    type="text"
                    placeholder="Pos (z.B. ST)"
                    value={manualPlayerPos}
                    onChange={(e) => setManualPlayerPos(e.target.value)}
                    className="w-24 border-2 border-black bg-white text-slate-900 p-2 text-xs font-bold uppercase focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={manualPlayerCategory}
                    onChange={(e) => setManualPlayerCategory(e.target.value as any)}
                    className="flex-1 border-2 border-black p-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-red-600 bg-white text-slate-900"
                  >
                    <option value="player">Spieler</option>
                    <option value="coach">Trainer</option>
                    <option value="staff">Funktionsteam</option>
                    <option value="medical">Medizin/Physio</option>
                  </select>
                  <button 
                    onClick={addManualPlayer}
                    disabled={!manualPlayerName}
                    className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  >
                    <UserPlus size={14} /> Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sortPlayers(players).map((p) => {
                  const canonicalName = getCanonicalPlayerName(p);
                  const isAlreadyIn = (localSession.players || []).some(lp => {
                    if (!lp) return false;
                    const matched = matchPlayerToMaster(lp, players);
                    return (matched && matched.id === p.id) || lp.name.toLowerCase() === canonicalName.toLowerCase();
                  });
                  
                  return (
                    <button
                      key={p.id}
                      disabled={isAlreadyIn}
                      onClick={() => addPlayerToSession(p)}
                      className={`
                        p-2 border-2 text-left transition-all relative overflow-hidden group
                        ${isAlreadyIn 
                          ? 'border-slate-300 bg-slate-100 opacity-40 cursor-not-allowed text-slate-700' 
                          : 'border-black bg-white hover:bg-green-50 text-slate-900 active:translate-x-[2px] active:translate-y-[2px]'}
                      `}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getCategoryColor(p.category)}`} />
                      <div className="flex items-center justify-between">
                        <span className="font-black uppercase text-[10px] truncate pr-4 text-slate-900">{canonicalName}</span>
                        {isAlreadyIn && <span className="text-[8px] font-black uppercase text-green-600 bg-green-100 px-1">Drin</span>}
                      </div>
                      <p className="text-[8px] font-black uppercase text-slate-500">{p.position}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t-4 border-black bg-slate-100 text-right">
              <button 
                onClick={() => setShowAddPlayerModal(false)}
                className="bg-black text-white px-8 py-2 font-black uppercase text-xs hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <FileText size={24} className="text-purple-400" />
                    <div>
                        <h2 className="font-black uppercase tracking-tighter text-lg leading-none">Trainingsdokument Verwaltung</h2>
                        <p className="text-[10px] font-bold opacity-60 uppercase mt-1">
                          {localSession ? `Einheit am ${new Date(localSession.date).toLocaleDateString('de-DE')}` : 'Globale Bibliothek'}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowDocumentModal(false)}
                    className="p-2 hover:bg-neutral-800 transition-colors rounded-full text-white"
                >
                    <X size={28} />
                </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left: Selection & Upload */}
                <div className="w-full md:w-1/2 border-r-2 border-black flex flex-col bg-slate-50 overflow-hidden">
                    <div className="p-4 border-b-2 border-black bg-white">
                        <h3 className="font-black uppercase text-xs mb-3 tracking-widest text-[#C00000]">Dokument hochladen</h3>
                        <label 
                            className={`relative border-2 border-dashed p-8 flex flex-col items-center justify-center group transition-all cursor-pointer ${modalDragActive ? 'border-purple-600 bg-purple-50 scale-[1.02]' : 'border-black/40 bg-white hover:border-purple-600'}`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setModalDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setModalDragActive(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setModalDragActive(false);
                                handleFileUpload(e.dataTransfer.files);
                            }}
                        >
                            <Upload size={32} className={`mb-4 transition-all ${modalDragActive ? 'text-purple-600 scale-110' : 'text-purple-600 opacity-40 group-hover:opacity-100 group-hover:scale-110'}`} />
                            <p className="font-black uppercase text-xs text-purple-900 text-center">Hier klicken oder Dateien ablegen</p>
                            <p className="text-[10px] font-bold opacity-60 uppercase mt-2 text-center bg-yellow-100 px-2 py-1 rounded text-slate-900">
                               Dokumente hier hochladen (Bibliothek).<br/>
                               Bilder für den Plan direkt auf den Plan ziehen.
                            </p>
                            <p className="text-[10px] font-bold opacity-40 uppercase mt-1 text-slate-600">PDF, Word, Excel, Bilder (Max 700KB)</p>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                                multiple
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b-2 border-black bg-purple-50 flex flex-col gap-3 shrink-0">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-purple-600" />
                                    <h3 className="font-black uppercase text-[10px] tracking-widest text-purple-900">Bibliothek</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold opacity-40 uppercase text-purple-900">Dokumente:</span>
                                    <span className="bg-purple-600 text-white px-2 py-0.5 text-[10px] font-black rounded-full">{globalDocs.length}</span>
                                </div>
                            </div>
                            
                            {/* Search Bar */}
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Bibliothek durchsuchen..."
                                    value={librarySearch}
                                    onChange={(e) => setLibrarySearch(e.target.value)}
                                    className="w-full bg-white text-slate-900 border-2 border-black p-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-purple-600/20"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 text-slate-900">
                                    <Users size={12} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-white">
                            {globalDocs.length === 0 ? (
                                <div className="p-12 text-center text-[10px] font-black uppercase opacity-20 italic text-slate-600">
                                    Keine Dokumente global vorhanden
                                </div>
                            ) : (
                                [...globalDocs]
                                .filter(d => d.name.toLowerCase().includes(librarySearch.toLowerCase()))
                                .sort((a, b) => {
                                    const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                                    const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                                    return dateB - dateA;
                                }).map(gDoc => (
                                    <div 
                                        key={gDoc.id}
                                        onClick={() => setSelectedLibraryDocId(gDoc.id)}
                                        className={`w-full p-4 border-b border-black/10 flex items-center justify-between transition-all cursor-pointer hover:bg-slate-50 group ${selectedLibraryDocId === gDoc.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'bg-white'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`p-2 border-2 border-black shrink-0 ${localSession?.trainingDocumentId === gDoc.id ? 'bg-purple-600 text-white' : (selectedLibraryDocId === gDoc.id ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-900')}`}>
                                                <FileText size={18} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-black uppercase text-xs tracking-tighter truncate text-slate-900">{gDoc.name}</p>
                                                <p className="text-[9px] font-bold opacity-40 uppercase text-slate-600">{new Date(gDoc.uploadedAt).toLocaleDateString()} um {new Date(gDoc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 transition-opacity">
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setNotification("Dokument wird geladen...");
                                                    let blobData: Uint8Array | null = null;
                                                    
                                                    // Try to get from metadata first (legacy)
                                                    if (gDoc.url) {
                                                        blobData = base64ToUint8Array(gDoc.url);
                                                    } else {
                                                        // Fallback: Fetch from content collection
                                                        const contentDoc = await getDoc(doc(db, 'training_documents_content', gDoc.id));
                                                        if (contentDoc.exists()) {
                                                            const contentData = contentDoc.data() as TrainingDocumentContent;
                                                            blobData = base64ToUint8Array(contentData.base64);
                                                        }
                                                    }

                                                    if (blobData) {
                                                        const fileUrl = URL.createObjectURL(new Blob([blobData], { type: gDoc.mimeType || 'application/octet-stream' }));
                                                        window.open(fileUrl, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(fileUrl), 5000);
                                                        setNotification(null);
                                                    } else {
                                                        setNotification("Fehler beim Laden des Inhalts!");
                                                        setTimeout(() => setNotification(null), 3000);
                                                    }
                                                }}
                                                className="p-2 bg-blue-600 text-white border-2 border-black hover:bg-black transition-colors"
                                                title="Vorschau / Öffnen"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplacingDocId(gDoc.id);
                                                    replaceInputRef.current?.click();
                                                }}
                                                className="p-2 bg-purple-600 text-white border-2 border-black hover:bg-black transition-colors"
                                                title="Datei ersetzen"
                                            >
                                                <RotateCw size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteGlobalDoc(gDoc.id);
                                                    deleteDoc(doc(db, 'training_documents_content', gDoc.id)).catch(console.error);
                                                    if (localSession?.trainingDocumentId === gDoc.id) {
                                                        const updatedSession = { ...localSession, trainingDocumentId: null };
                                                        setLocalSession(updatedSession as any);
                                                        saveSession(updatedSession as any);
                                                    }
                                                    if (selectedLibraryDocId === gDoc.id) {
                                                        setSelectedLibraryDocId(null);
                                                    }
                                                }}
                                                className="p-2 bg-red-600 text-white border-2 border-black hover:bg-black transition-colors"
                                                title="Global löschen"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Selected Document Focus */}
                <div className="w-full md:w-1/2 flex flex-col bg-slate-100 text-slate-900">
                    <div className="p-4 border-b-2 border-black bg-white flex justify-between items-center text-slate-900">
                        <h3 className="font-black uppercase text-xs tracking-widest text-purple-600">
                            {selectedLibraryDocId ? 'Dokument-Details' : 'Aktuelles Session-Dokument'}
                        </h3>
                        <div className="flex gap-4">
                            {selectedLibraryDocId && localSession && localSession.id && (
                                <button 
                                    onClick={() => {
                                        const updatedSession = { ...localSession, trainingDocumentId: selectedLibraryDocId };
                                        setLocalSession(updatedSession as any);
                                        saveSession(updatedSession as any);
                                        setNotification("Dokument zugewiesen!");
                                        setTimeout(() => setNotification(null), 3000);
                                    }}
                                    className={`text-[10px] font-black uppercase px-2 py-1 border-2 border-black transition-all ${localSession.trainingDocumentId === selectedLibraryDocId ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-purple-600'}`}
                                >
                                    {localSession.trainingDocumentId === selectedLibraryDocId ? 'ZUR EINHEIT ZUGEWIESEN' : 'ZUR EINHEIT ZUWEISEN'}
                                </button>
                            )}
                            {localSession?.trainingDocumentId && (
                                <button 
                                    onClick={() => {
                                        const updatedSession = { ...localSession, trainingDocumentId: null };
                                        setLocalSession(updatedSession as any);
                                        saveSession(updatedSession as any);
                                        setNotification("Verknüpfung gelöst");
                                        setTimeout(() => setNotification(null), 3000);
                                    }}
                                    className="text-[10px] font-black uppercase text-red-600 underline hover:no-underline"
                                >
                                    Verknüpfung lösen
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-purple-50/20 text-slate-900">
                        {(() => {
                            const activeDocId = selectedLibraryDocId || localSession?.trainingDocumentId;
                            if (!activeDocId) return (
                                <div className="text-center opacity-40 text-slate-800">
                                    <FileText size={48} className="mx-auto mb-4" />
                                    <p className="font-black uppercase text-sm tracking-widest italic">Kein Dokument ausgewählt</p>
                                    <p className="text-[10px] font-bold uppercase mt-2">Wähle links ein Dokument aus der Bibliothek aus</p>
                                </div>
                            );

                            const activeDoc = globalDocs.find(d => d.id === activeDocId);
                            if (!activeDoc) return <div className="text-red-500 font-black uppercase text-xs">Fehler: Dokument existiert nicht mehr</div>;
                            
                            return (
                                <div className="w-full flex flex-col items-center h-full">
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="w-32 h-32 bg-purple-100 border-4 border-black flex items-center justify-center mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] transform rotate-3">
                                            <FileText size={64} className="text-purple-600" />
                                        </div>
                                        <h4 className="font-black uppercase text-xl mb-2 tracking-tight text-slate-900">{activeDoc.name}</h4>
                                        <p className="text-[10px] font-bold opacity-40 uppercase mb-8 text-slate-600">Hochgeladen am {new Date(activeDoc.uploadedAt).toLocaleString()}</p>
                                        
                                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                            <button 
                                                onClick={async () => {
                                                    setNotification("Dokument wird geladen...");
                                                    let blobData: Uint8Array | null = null;
                                                    if (activeDoc.url) {
                                                        blobData = base64ToUint8Array(activeDoc.url);
                                                    } else {
                                                        const contentDoc = await getDoc(doc(db, 'training_documents_content', activeDoc.id));
                                                        if (contentDoc.exists()) {
                                                            const contentData = contentDoc.data() as TrainingDocumentContent;
                                                            blobData = base64ToUint8Array(contentData.base64);
                                                        }
                                                    }

                                                    if (blobData) {
                                                        const fileUrl = URL.createObjectURL(new Blob([blobData], { type: activeDoc.mimeType || 'application/octet-stream' }));
                                                        const a = document.createElement('a');
                                                        a.href = fileUrl;
                                                        a.download = activeDoc.name;
                                                        a.click();
                                                        URL.revokeObjectURL(fileUrl);
                                                        setNotification(null);
                                                    } else {
                                                        setNotification("Fehler beim Laden!");
                                                        setTimeout(() => setNotification(null), 3000);
                                                    }
                                                }}
                                                className="bg-black text-white p-4 font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                                            >
                                                <FileText size={18} /> Herunterladen
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    setNotification("Dokument wird geladen...");
                                                    let blobData: Uint8Array | null = null;
                                                    if (activeDoc.url) {
                                                        blobData = base64ToUint8Array(activeDoc.url);
                                                    } else {
                                                        const contentDoc = await getDoc(doc(db, 'training_documents_content', activeDoc.id));
                                                        if (contentDoc.exists()) {
                                                            const contentData = contentDoc.data() as TrainingDocumentContent;
                                                            blobData = base64ToUint8Array(contentData.base64);
                                                        }
                                                    }
                                                    
                                                    if (blobData) {
                                                        const fileUrl = URL.createObjectURL(new Blob([blobData], { type: activeDoc.mimeType || 'application/octet-stream' }));
                                                        window.open(fileUrl, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(fileUrl), 5000);
                                                        setNotification(null);
                                                    } else {
                                                        setNotification("Fehler beim Laden!");
                                                        setTimeout(() => setNotification(null), 3000);
                                                    }
                                                }}
                                                className="bg-blue-600 text-white p-4 font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                                            >
                                                <Maximize2 size={18} /> Öffnen (Tab)
                                            </button>
                                        </div>
                                    </div>

                                    <label 
                                            className="mt-12 p-4 border-2 border-black bg-white text-slate-900 flex flex-col items-center gap-3 w-full max-w-md cursor-pointer hover:bg-purple-50 transition-colors"
                                        >
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 underline">Dokument ersetzen / aktualisieren</p>
                                            <input 
                                                type="file" 
                                                ref={replaceInputRef}
                                                accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    const targetId = activeDocId || replacingDocId;
                                                    
                                                    if (file && targetId) {
                                                        if (file.size > 800 * 1024) {
                                                            setNotification("Datei zu groß! Max. 800KB erlaubt.");
                                                            setTimeout(() => setNotification(null), 5000);
                                                            e.target.value = '';
                                                            return;
                                                        }

                                                        try {
                                                            setNotification("Dokument wird ersetzt...");
                                                            const base64 = await fileToBase64(file);
                                                            
                                                            // 1. Update Content
                                                            await setDoc(doc(db, 'training_documents_content', targetId), {
                                                                id: targetId,
                                                                base64: base64
                                                            });

                                                            // 2. Update Metadata
                                                            const existingDoc = globalDocs.find(d => d.id === targetId);
                                                            const updatedDoc = { 
                                                                ...existingDoc, 
                                                                id: targetId,
                                                                name: file.name, 
                                                                url: '', 
                                                                uploadedAt: new Date().toISOString(),
                                                                mimeType: file.type || 'application/octet-stream'
                                                            };
                                                            await saveGlobalDoc(updatedDoc as any);
                                                            setNotification("Dokument global ersetzt!");
                                                        } catch (err) {
                                                            console.error("Replacement failed", err);
                                                            setNotification("Fehler beim Ersetzen!");
                                                        }
                                                        e.target.value = '';
                                                        setReplacingDocId(null);
                                                        setTimeout(() => setNotification(null), 3000);
                                                    }
                                                }}
                                            />
                                            <p className="text-[10px] font-bold opacity-60 mt-1 uppercase text-slate-600">Klicke hier, um eine neue Version dieser Datei hochzuladen.</p>
                                        </label>
                                    </div>
                                );
                            })()}
                        </div>

                     <div className="p-4 border-t-2 border-black bg-purple-600 text-white flex items-center justify-between">
                         <span className="text-[9px] font-black uppercase tracking-widest">{activeClub.shortName || activeClub.name} Trainingsunterlagen</span>
                         <div className="w-12 h-6 border border-white/30 rounded-full flex items-center justify-center text-[8px] font-black">2026</div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      </div>
      )}

      {/* KI TRAINING PLAN MODAL */}
      {showKiModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowKiModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg uppercase flex items-center gap-2">
                <BrainCircuit size={20} className="text-purple-600" />
                KI-Trainingsplan
              </h3>
              <button onClick={() => setShowKiModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Fülle die Felder aus und die KI erstellt einen vollständigen Trainingsplan für {activeClub.name}.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Gegner</label>
                <input value={kiInputs.gegner} onChange={e => setKiInputs({...kiInputs, gegner: e.target.value})} placeholder="z.B. SC Freiburg II" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Ort</label>
                <input value={kiInputs.ort} onChange={e => setKiInputs({...kiInputs, ort: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Intensität (0-10)</label>
                <input type="number" min={0} max={10} value={kiInputs.intensitaet} onChange={e => setKiInputs({...kiInputs, intensitaet: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Belastung</label>
                <select value={kiInputs.belastung} onChange={e => setKiInputs({...kiInputs, belastung: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="niedrig">Niedrig</option>
                  <option value="mittel">Mittel</option>
                  <option value="hoch">Hoch</option>
                  <option value="sehr hoch">Sehr hoch</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-600">Schwerpunkt</label>
                <select value={kiInputs.schwerpunkt} onChange={e => setKiInputs({...kiInputs, schwerpunkt: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="Ballbesitz">Ballbesitz</option>
                  <option value="Pressing">Pressing</option>
                  <option value="Umschaltspiel">Umschaltspiel</option>
                  <option value="Flügelspiel">Flügelspiel</option>
                  <option value="Defensive Stabilität">Defensive Stabilität</option>
                  <option value="Standards">Standards</option>
                  <option value="Kondition">Kondition</option>
                  <option value="Spielvorbereitung">Spielvorbereitung</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Dauer</label>
                <input value={kiInputs.dauer} onChange={e => setKiInputs({...kiInputs, dauer: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600">Trainer</label>
                <input value={kiInputs.trainer} onChange={e => setKiInputs({...kiInputs, trainer: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button
              onClick={handleGenerateTrainingPlan}
              disabled={kiLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {kiLoading ? (
                <><Loader2 size={16} className="animate-spin" /> KI generiert Trainingsplan...</>
              ) : (
                <><BrainCircuit size={16} /> Trainingsplan generieren</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VOLLBILD-VORSCHAU — Kompletter Trainingsplan als Dokument     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showDocumentPreview && localSession && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto print:static print:z-auto print:overflow-visible" onClick={() => setShowDocumentPreview(false)}>
          <div className="max-w-4xl mx-auto p-6 print:p-0" onClick={e => e.stopPropagation()}>
            {/* Close + Print Buttons */}
            <div className="sticky top-0 z-10 bg-white border-b-2 border-black pb-3 mb-6 flex justify-between items-center print:hidden">
              <button onClick={() => setShowDocumentPreview(false)} className="flex items-center gap-1 bg-black text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-gray-800 cursor-pointer">
                <X size={14} /> Schließen
              </button>
              <button onClick={() => { window.print(); }} className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 font-black text-xs uppercase rounded hover:bg-emerald-700 cursor-pointer">
                <Printer size={14} /> Als PDF drucken
              </button>
            </div>

            {/* DOCUMENT HEADER */}
            <div className="text-center mb-8 border-b-4 border-black pb-6">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{activeClub.name}</div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Trainingsplan</h1>
              <div className="text-sm text-slate-600">
                {localSession.date ? new Date(localSession.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </div>
            </div>

            {/* METADATA GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Ort', value: localSession.location || '—' },
                { label: 'Dauer', value: localSession.duration || '—' },
                { label: 'Belastung', value: `${localSession.loadLevel || 5}/9 ${localSession.load || '—'}` },
                { label: 'Intensität', value: localSession.intensity || '—' },
                { label: 'Trainer', value: localSession.trainer || '—' },
                { label: 'Wochenschwerpunkt', value: localSession.weeklyFocus || '—' },
                { label: 'Einheitsschwerpunkt', value: localSession.sessionFocus || '—' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider">{item.label}</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>

            {/* ANWESENHEIT / KADER */}
            <div className="mb-6">
              <h2 className="text-sm font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-3 flex items-center gap-2">
                <Users size={16} /> Kader & Anwesenheit
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {(localSession.players || []).map((p: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                    <span className="font-black text-slate-500 w-6 text-right">{i + 1}.</span>
                    <span className="font-bold flex-1">{p.name}</span>
                    <span className="text-[9px] text-slate-500">{p.position}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                      p.status === '1' || !p.status ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'A' ? 'bg-blue-100 text-blue-700' :
                      p.status === 'B' ? 'bg-red-100 text-red-700' :
                      p.status === 'k' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status === '1' || !p.status ? 'ANW' : p.status === 'A' ? 'AUFBAU' : p.status === 'B' ? 'VERL.' : p.status === 'k' ? 'KRANK' : p.status === 'e' ? 'ENTSC.' : p.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-bold text-slate-500">
                Gesamt: {(localSession.players || []).length} | 
                Anwesend: {(localSession.players || []).filter((p: any) => p.status === '1' || !p.status).length} | 
                Verletzt: {(localSession.players || []).filter((p: any) => p.status === 'B').length} | 
                Krank: {(localSession.players || []).filter((p: any) => p.status === 'k').length}
              </div>
            </div>

            {/* TRAINING SECTION: ERWÄRMUNG */}
            <div className="mb-6 border-2 border-[#10B981] rounded-xl overflow-hidden">
              <div className="bg-[#10B981] text-white px-4 py-2 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">⚽ Aufwärmen / Aktivierung</h2>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.warmupDuration || '—'}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.warmup || 'Kein Inhalt eingetragen.'}</p>
                {(localSession.content.warmupImages || []).length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(localSession.content.warmupImages || []).map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Aufwärmen ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TRAINING SECTION: HAUPTTEIL 1 */}
            <div className="mb-6 border-2 border-[#F59E0B] rounded-xl overflow-hidden">
              <div className="bg-[#F59E0B] text-white px-4 py-2 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">🏃 Hauptteil 1 — Technik / Taktik</h2>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.main1Duration || '—'}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.main1 || 'Kein Inhalt eingetragen.'}</p>
                {(localSession.content.main1Images || []).length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(localSession.content.main1Images || []).map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Hauptteil 1 ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TRAINING SECTION: HAUPTTEIL 2 */}
            <div className="mb-6 border-2 border-[#EF4444] rounded-xl overflow-hidden">
              <div className="bg-[#EF4444] text-white px-4 py-2 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">⚡ Hauptteil 2 — Intensität / Spiel</h2>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.main2Duration || '—'}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.main2 || 'Kein Inhalt eingetragen.'}</p>
                {(localSession.content.main2Images || []).length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(localSession.content.main2Images || []).map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Hauptteil 2 ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TRAINING SECTION: SCHLUSS */}
            <div className="mb-6 border-2 border-[#10B981] rounded-xl overflow-hidden">
              <div className="bg-[#10B981] text-white px-4 py-2 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">🧘 Schluss / Cool-Down</h2>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{localSession.content.closingDuration || '—'}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{localSession.content.closing || 'Kein Inhalt eingetragen.'}</p>
                {(localSession.content.closingImages || []).length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(localSession.content.closingImages || []).map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Schluss ${idx + 1}`} className="h-32 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WICHTIGE INFORMATIONEN */}
            {(localSession.importantInfo || localSession.remarks) && (
              <div className="mb-6 border-2 border-slate-300 rounded-xl p-4">
                <h2 className="text-sm font-black uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">📋 Wichtige Informationen</h2>
                {localSession.importantInfo && <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{localSession.importantInfo}</p>}
                {localSession.remarks && <p className="text-xs text-slate-500 whitespace-pre-wrap italic">{localSession.remarks}</p>}
              </div>
            )}

            {/* FOOTER */}
            <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-4 mt-8">
              Erstellt mit CoCoach — {activeClub.name} — {new Date().toLocaleDateString('de-DE')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

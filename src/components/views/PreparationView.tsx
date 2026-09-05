import React, { useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText,
  Clock,
  MapPin,
  Activity,
  Target,
  Shield,
  Star,
  Users,
  Dribbble,
  Flag,
  Landmark,
  RefreshCw,
  Download,
  Mail,
  MessageSquare
} from 'lucide-react';
import { SummerPrepUnit } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fixOklchForHtml2Canvas } from '../../utils/pdfExportHelper';

interface PreparationViewProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  data: SummerPrepUnit[];
  onAddOrUpdate: (item: SummerPrepUnit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isEditing?: boolean;
  weekCount?: number;
  onDateRangeChange?: (start: string, end: string) => void;
  setToast?: (toast: { message: string; id: number }) => void;
  config?: {
    showAthletik?: boolean;
    showVormittag?: boolean;
    showIndividual?: boolean;
    showVideo?: boolean;
    showTraining?: boolean;
    showOpponent?: boolean;
    showStartEnd?: boolean;
  };
  opponents?: { id: string, name: string }[];
}

const getDayName = (dateStr: string) => {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

// Local state for inputs to prevent hanging
const EditableCell = ({ 
  value, 
  onSave, 
  type = "text", 
  className = "", 
  disabled = false,
  placeholder = ""
}: { 
  value: string, 
  onSave: (val: string) => void, 
  type?: string, 
  className?: string, 
  disabled?: boolean,
  placeholder?: string
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative group">
      <input 
        type={type}
        className={`${className} print:hidden`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) {
            onSave(localValue);
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
      />
      <span className={`hidden print:block ${className}`}>
        {localValue || placeholder || "-"}
      </span>
    </div>
  );
};

export const PreparationView: React.FC<PreparationViewProps> = ({
  title,
  subtitle,
  icon,
  startDate,
  endDate,
  data,
  onAddOrUpdate,
  onDelete,
  isEditing = false,
  weekCount: initialWeekCount,
  onDateRangeChange,
  setToast,
  config = {
    showAthletik: true,
    showVormittag: true,
    showIndividual: true,
    showVideo: true,
    showTraining: true,
    showOpponent: true,
    showStartEnd: false
  },
  opponents = []
}) => {
  const [localStartDate, setLocalStartDate] = React.useState(startDate);
  const [localEndDate, setLocalEndDate] = React.useState(endDate || '');

  React.useEffect(() => {
    setLocalStartDate(startDate);
  }, [startDate]);

  React.useEffect(() => {
    if (endDate) setLocalEndDate(endDate);
  }, [endDate]);

  const calculateWeekCount = (start: string, end: string) => {
    if (!start || !end) return initialWeekCount || 6;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7) || 1;
  };

  const weekCount = calculateWeekCount(localStartDate, localEndDate);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!tableRef.current) return;
    
    if (setToast) {
      setToast({ message: "PDF wird generiert... Bitte warten.", id: Date.now() });
    } else {
      setFeedback("PDF wird generiert...");
    }

    try {
      const element = tableRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          fixOklchForHtml2Canvas(clonedDoc);
          const clonedElement = clonedDoc.getElementById('prep-table-container');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
            clonedElement.style.minWidth = '1200px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

      if (setToast) {
        setToast({ message: "PDF erfolgreich heruntergeladen!", id: Date.now() });
      } else {
        setFeedback("PDF bereit!");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      const msg = "PDF Export fehlgeschlagen. Bitte nutzen Sie die Druckfunktion.";
      if (setToast) setToast({ message: msg, id: Date.now() });
      else setFeedback(msg);
    }
  };

  const handleAddEntry = async (weekIndex: number) => {
    console.log("Adding entry for week index:", weekIndex);
    try {
      // Find the last TE number for this week or overall
      const lastTE = data.length > 0 ? Math.max(...data.map(d => {
        const te = Number(d.te);
        return isNaN(te) ? 0 : te;
      })) : 0;
      
      // Calculate a default date for this week
      const start = new Date(localStartDate || startDate);
      start.setDate(start.getDate() + (weekIndex * 7));
      
      const newEntry: SummerPrepUnit = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kw: weekIndex + 1,
        te: lastTE + 1,
        date: start.toISOString().split('T')[0],
        day: ['So','Mo','Di','Mi','Do','Fr','Sa'][start.getDay()],
        start: '19:00',
        end: '20:30',
        type: 'Training',
        location: 'Auggen',
        opponent: '-',
        remarks: '',
        time: '19:00',
        content: '',
        intensity: 'Mittel'
      };
      
      await onAddOrUpdate(newEntry);
      setFeedback("Einheit hinzugefügt!");
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error("Failed to add entry:", error);
      setFeedback("Fehler beim Hinzufügen!");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleUpdate = async (id: string, field: keyof SummerPrepUnit, value: any) => {
    console.log("Updating entry:", id, field, value);
    const item = data.find(d => d.id === id);
    if (!item) return;

    const updated = { ...item, [field]: value };
    if (field === 'date') {
      const date = parseDate(value);
      if (!isNaN(date.getTime())) {
        updated.day = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()];
      }
    }
    
    try {
      await onAddOrUpdate(updated);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  const handleEmailPlan = () => {
    const subject = encodeURIComponent(`${title}: ${subtitle}`);
    let body = `${title}\n${subtitle}\n\n`;
    
    sortedData.forEach(entry => {
      body += `${entry.date} (${entry.day}) | ${entry.time || entry.start} | ${entry.type}: ${entry.content || entry.inhalt || '-'} | ${entry.location || entry.ort || '-'}\n`;
    });
    
    body += `\n\nFC AUGGEN 1921 e.V. | Team Management System`;
    
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  const handleWhatsAppPlan = () => {
    let text = `*${title}*\n_${subtitle}_\n\n`;
    
    sortedData.forEach(entry => {
      text += `*${entry.date} (${entry.day})*\n⏰ ${entry.time || entry.start}\n📍 ${entry.location || entry.ort || '-'}\n⚽ ${entry.type}: ${entry.content || entry.inhalt || '-'}\n\n`;
    });
    
    text += `_FC AUGGEN 1921 e.V._`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    const isSummer = title.toLowerCase().includes('sommer');
    const tabParam = isSummer ? 'summer_prep' : 'winter_prep';
    
    if (isIframe) {
      if (setToast) {
        setToast({ 
          message: "Öffne Druckansicht im neuen Tab für zuverlässigen PDF-Druck...", 
          id: Date.now() 
        });
      } else {
        setFeedback("Öffne Druckansicht im neuen Tab für zuverlässigen PDF-Druck...");
        setTimeout(() => setFeedback(null), 4000);
      }
      try {
        const printUrl = `${window.location.origin}${window.location.pathname}?tab=${tabParam}&print=true`;
        window.open(printUrl, '_blank');
      } catch (e) {
        console.error("Popup window.open failed, trying direct print", e);
        try {
          window.focus();
          window.print();
        } catch (printErr) {
          console.error("Print failed", printErr);
        }
      }
    } else {
      if (setToast) {
        setToast({ message: "Druckdialog wird vorbereitet...", id: Date.now() });
      } else {
        setFeedback("Druckdialog wird vorbereitet...");
        setTimeout(() => setFeedback(null), 3000);
      }
      setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      }, 500);
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(`${y}-${m}-${d}`);
    }
    return new Date(dateStr);
  };

  const handleGeneratePlan = () => {
    const start = new Date(localStartDate);
    const end = new Date(localEndDate);
    const newEntries: SummerPrepUnit[] = [];
    let current = new Date(start);
    let te = 1;
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const day = getDayName(dateStr);
      const kw = Math.ceil((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      newEntries.push({
        id: `gen-${dateStr}-${te}-${Date.now()}`,
        kw,
        te: te++,
        date: dateStr,
        day,
        start: "19:00",
        end: "20:30",
        time: "19:00",
        type: "Training",
        content: "Training",
        intensity: "Mittel",
        location: "Auggen",
        opponent: "",
        ergebnis: "",
        status: "Geplant",
        notes: ""
      });
      current.setDate(current.getDate() + 1);
    }
    
    // Save all entries sequentially to avoid potential firestore issues
    const saveAll = async () => {
      if (setToast) setToast({ message: `${newEntries.length} Einheiten werden generiert...`, id: Date.now() });
      for (const entry of newEntries) {
        await onAddOrUpdate(entry);
      }
      if (setToast) setToast({ message: 'Plan erfolgreich generiert.', id: Date.now() });
    };
    void saveAll();
  };

  const sortedData = React.useMemo(() => {
    return [...data]
      .map(entry => {
        const contentStr = (entry.content || entry.inhalt || "");
        const contentLower = contentStr.toLowerCase();
        
        if (contentLower.includes("tr-lager")) {
          // If it's a training, change it to "Frei"
          if (entry.type === 'Training') {
            return {
              ...entry,
              type: 'Frei',
              content: 'Frei',
              inhalt: 'Frei'
            };
          } 
          // If it's a match, just remove the "TR-Lager" part from content
          else if (['Spiel', 'Testspiel', 'Pokal'].includes(entry.type)) {
            const newContent = contentStr
              .replace(/tr-lager/gi, "")
              .replace(/\(\s*\)/g, "")
              .trim();
            return {
              ...entry,
              content: newContent,
              inhalt: newContent
            };
          }
        }
        return entry;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.date).getTime();
        const dateB = parseDate(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.te || 0) - (b.te || 0);
      });
  }, [data]);

  const typeColors: Record<string, string> = {
    'Training': 'bg-sky-950/80 text-sky-300 border-sky-800',
    'Spiel': 'bg-rose-950/80 text-rose-300 border-rose-800',
    'Frei': 'bg-slate-800/80 text-slate-400 border-slate-700',
    'Event': 'bg-amber-950/80 text-amber-300 border-amber-800',
    'Pflichtspiel': 'bg-red-950/80 text-red-300 border-red-800',
    'Testspiel': 'bg-orange-950/80 text-orange-300 border-orange-800',
    'Turnier': 'bg-purple-950/80 text-purple-300 border-purple-800',
    'Meeting': 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    'Training': <Dribbble size={10} />,
    'Spiel': <Target size={10} />,
    'Pflichtspiel': <Shield size={10} />,
    'Testspiel': <Flag size={10} />,
    'Turnier': <Star size={10} />,
    'Meeting': <Users size={10} />,
    'Frei': <MapPin size={10} />,
    'Event': <Landmark size={10} />
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0E17] text-[#F8FAFC] p-2 sm:p-4 rounded-2xl border border-[#334155] overflow-hidden print:bg-[#1E293B] print:text-black">
      {/* Header */}
      <div className="p-4 border-b border-[#334155] bg-[#121824] flex flex-col gap-3 shrink-0 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#10B981] flex items-center justify-center text-white shadow-md">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#10B981] leading-tight">{title}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center print:hidden">
            {feedback && (
              <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg animate-pulse border ${feedback.includes('Fehler') ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                {feedback}
              </div>
            )}
            <button 
              type="button"
              onClick={handleExportPDF}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md border border-[#10B981]"
            >
              <Download size={12} /> PDF Download
            </button>
            <button 
              type="button"
              onClick={handleEmailPlan}
              className="bg-[#1E293B] text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#334155] transition-colors flex items-center gap-1.5"
            >
              <Mail size={12} /> Per E-Mail
            </button>
            <button 
              type="button"
              onClick={handleWhatsAppPlan}
              className="bg-[#1E293B] text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#334155] transition-colors flex items-center gap-1.5"
            >
              <MessageSquare size={12} /> WhatsApp
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              className="bg-[#1E293B] text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#334155] transition-colors flex items-center gap-1.5"
            >
              <FileText size={12} /> Drucken
            </button>
            {isEditing && (
              <button 
                onClick={() => handleAddEntry(0)}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md active:scale-95 border border-[#10B981]"
              >
                <Plus size={12} /> + Einheit
              </button>
            )}
          </div>
        </div>

        {onDateRangeChange && isEditing && (
          <div className="flex items-center gap-4 bg-[#1E293B] p-2.5 border border-[#334155] rounded-xl print:hidden">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Start:</label>
              <input 
                type="date" 
                value={localStartDate}
                onChange={(e) => {
                  setLocalStartDate(e.target.value);
                  onDateRangeChange(e.target.value, localEndDate);
                }}
                className="text-xs font-bold bg-[#121824] text-[#F8FAFC] border border-[#334155] rounded-lg px-2 py-1 focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Ende:</label>
              <input 
                type="date" 
                value={localEndDate}
                onChange={(e) => {
                  setLocalEndDate(e.target.value);
                  onDateRangeChange(localStartDate, e.target.value);
                }}
                className="text-xs font-bold bg-[#121824] text-[#F8FAFC] border border-[#334155] rounded-lg px-2 py-1 focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-[#10B981] ml-auto">
              {weekCount} Wochen Planung
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 print:p-0 print:overflow-visible print:bg-[#1E293B]">
        <div ref={tableRef} id="prep-table-container" className="bg-[#121824] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden min-w-[1000px] print:shadow-none print:border-[#334155] print:min-w-0 print:w-full print:bg-[#1E293B] print:text-black">
          <table className="w-full border-collapse text-xs print:text-[8px] text-[#F8FAFC]">
            <thead>
              <tr className="bg-[#1E293B] text-[#10B981] uppercase font-black tracking-wider text-[11px] border-b border-[#334155]">
                <th className="p-3 border-r border-[#334155] text-left w-10">KW</th>
                <th className="p-3 border-r border-[#334155] text-left w-10">TE</th>
                <th className="p-3 border-r border-[#334155] text-left w-28">Datum</th>
                <th className="p-3 border-r border-[#334155] text-left w-14">Tag</th>
                {config.showStartEnd ? (
                  <>
                    <th className="p-3 border-r border-[#334155] text-left w-20">Start</th>
                    <th className="p-3 border-r border-[#334155] text-left w-20">Ende</th>
                  </>
                ) : (
                  <th className="p-3 border-r border-[#334155] text-left w-20">Zeit</th>
                )}
                <th className="p-3 border-r border-[#334155] text-left w-20">Treff</th>
                <th className="p-3 border-r border-[#334155] text-left w-28">Typ</th>
                <th className="p-3 border-r border-[#334155] text-left">Inhalt / Aktivität</th>
                <th className="p-3 border-r border-[#334155] text-left w-28">Ort</th>
                {config.showOpponent && <th className="p-3 border-r border-[#334155] text-left w-36">Gegner</th>}
                <th className="p-3 border-r border-[#334155] text-left w-24">Ergebnis</th>
                <th className="p-3 border-r border-[#334155] text-left w-28">Status</th>
                <th className="p-3 border-r border-[#334155] text-left w-36">Notizen</th>
                {isEditing && <th className="p-3 text-center w-12 print:hidden"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] bg-[#121824]">
              {sortedData.length === 0 ? (
                <tr className="border-b border-slate-800 text-slate-500 italic">
                  <td colSpan={config.showOpponent ? (config.showStartEnd ? 15 : 14) : (config.showStartEnd ? 14 : 13)} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-xs font-bold text-slate-400">Keine Einheiten vorhanden</p>
                      {isEditing && (
                        <button 
                          onClick={handleGeneratePlan}
                          className="flex items-center gap-2 bg-amber-500 text-slate-950 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider hover:bg-amber-400 transition-all shadow-lg text-xs"
                        >
                          <RefreshCw size={14} />
                          Plan für Zeitraum generieren
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-slate-900/90 transition-colors ${entry.type === 'Frei' ? 'opacity-50 bg-slate-950/60' : ''}`}>
                    <td className="p-2.5 border-r border-slate-800/60 font-black text-amber-400">{entry.kw}</td>
                    <td className="p-2.5 border-r border-slate-800/60 font-black text-slate-200">{entry.te}</td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <EditableCell 
                        type="date" 
                        className="bg-transparent w-full focus:outline-none font-bold text-slate-100"
                        value={entry.date}
                        onSave={(val) => handleUpdate(entry.id, 'date', val)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60 font-bold uppercase text-slate-300">{entry.day}</td>
                    {config.showStartEnd ? (
                      <>
                        <td className="p-2.5 border-r border-slate-800/60">
                          <EditableCell 
                            type="text" 
                            className="bg-transparent w-full focus:outline-none font-bold text-slate-100"
                            value={entry.start || ''}
                            onSave={(val) => handleUpdate(entry.id, 'start', val)}
                            disabled={!isEditing}
                          />
                        </td>
                        <td className="p-2.5 border-r border-slate-800/60">
                          <EditableCell 
                            type="text" 
                            className="bg-transparent w-full focus:outline-none font-bold text-slate-100"
                            value={entry.end || ''}
                            onSave={(val) => handleUpdate(entry.id, 'end', val)}
                            disabled={!isEditing}
                          />
                        </td>
                      </>
                    ) : (
                      <td className="p-2.5 border-r border-slate-800/60">
                        <EditableCell 
                          type="text" 
                          className="bg-transparent w-full focus:outline-none font-bold text-slate-100"
                          value={entry.time || entry.start || ''}
                          onSave={(val) => handleUpdate(entry.id, 'time', val)}
                          disabled={!isEditing}
                        />
                      </td>
                    )}
                    <td className="p-2.5 border-r border-slate-800/60">
                      <EditableCell 
                        type="text" 
                        className="bg-transparent w-full focus:outline-none font-medium text-slate-400"
                        value={entry.treffpunkt || ''}
                        onSave={(val) => handleUpdate(entry.id, 'treffpunkt', val)}
                        disabled={!isEditing}
                        placeholder="-"
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <select 
                          className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase inline-flex items-center gap-1 appearance-none cursor-pointer print:hidden ${typeColors[entry.type] || 'bg-slate-800 text-slate-200 border-slate-700'}`}
                          value={entry.type}
                          onChange={(e) => handleUpdate(entry.id, 'type', e.target.value)}
                          disabled={!isEditing}
                        >
                          {Object.keys(typeColors).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className={`hidden print:inline-block px-1.5 py-0.5 rounded-sm border text-[6px] font-black uppercase ${typeColors[entry.type] || 'bg-[#1E293B]'}`}>
                          {entry.type}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <div className="flex flex-col">
                        <EditableCell 
                          type="text" 
                          className="bg-transparent w-full focus:outline-none font-bold text-slate-100 text-xs"
                          value={entry.content || entry.inhalt || ''}
                          onSave={(val) => handleUpdate(entry.id, 'content', val)}
                          disabled={!isEditing}
                        />
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <EditableCell 
                        type="text" 
                        className="bg-transparent w-full focus:outline-none text-slate-300 font-medium text-xs"
                        value={entry.location || entry.ort || ''}
                        onSave={(val) => handleUpdate(entry.id, 'location', val)}
                        disabled={!isEditing}
                      />
                    </td>
                    {config.showOpponent && (
                      <td className="p-2.5 border-r border-slate-800/60">
                        {(entry.type === 'Testspiel' || entry.type === 'Pflichtspiel' || entry.type === 'Spiel' || entry.type === 'Pokal') ? (
                          <div className="relative group">
                            <input 
                              list="opponents-list-prep"
                              className="w-full bg-transparent focus:outline-none text-amber-400 uppercase font-bold text-xs print:hidden"
                              defaultValue={entry.opponent || entry.gegner || ''}
                              onBlur={(e) => handleUpdate(entry.id, 'opponent', e.target.value)}
                              disabled={!isEditing}
                              placeholder="Gegner..."
                            />
                            <datalist id="opponents-list-prep">
                              {opponents.map(opp => (
                                <option key={opp.id} value={opp.name} />
                              ))}
                            </datalist>
                            <span className="hidden print:block text-slate-200 uppercase font-bold">
                              {entry.opponent || entry.gegner || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    )}
                    <td className="p-2.5 border-r border-slate-800/60">
                      {(entry.type === 'Testspiel' || entry.type === 'Pflichtspiel' || entry.type === 'Spiel' || entry.type === 'Pokal') ? (
                        <EditableCell 
                          type="text" 
                          className="bg-transparent w-full focus:outline-none font-black text-center text-amber-400 text-xs"
                          value={entry.ergebnis || ''}
                          onSave={(val) => handleUpdate(entry.id, 'ergebnis', val)}
                          disabled={!isEditing}
                          placeholder="-:-"
                        />
                      ) : (
                        <span className="text-slate-600 text-center block">-</span>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <EditableCell 
                        type="text" 
                        className="bg-transparent w-full focus:outline-none font-bold text-slate-300 text-xs"
                        value={entry.status || ''}
                        onSave={(val) => handleUpdate(entry.id, 'status', val)}
                        disabled={!isEditing}
                        placeholder="Status..."
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-800/60">
                      <EditableCell 
                        type="text" 
                        className="bg-transparent w-full focus:outline-none text-slate-400 text-xs font-medium"
                        value={entry.notes || entry.remarks || ''}
                        onSave={(val) => handleUpdate(entry.id, 'notes', val)}
                        disabled={!isEditing}
                        placeholder="Notizen..."
                      />
                    </td>
                    {isEditing && (
                      <td className="p-2.5 text-center print:hidden">
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest print:mt-4">
          FC AUGGEN 1921 e.V. | Team Management System 2026/2027
        </div>
      </div>
    </div>
  );
};

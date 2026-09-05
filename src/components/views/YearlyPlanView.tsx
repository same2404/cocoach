import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Activity, 
  Plus, 
  Target,
  Shield,
  Star,
  List,
  LayoutGrid,
  GripHorizontal,
  ZoomIn,
  ZoomOut,
  AlignLeft,
  CalendarDays,
  CalendarRange,
  Dribbble,
  Flag,
  Landmark,
  Users,
  Search,
  Edit2,
  Trash2,
  TableProperties,
  X,
  Gift,
  Sparkles,
  Check
} from 'lucide-react';
import { getHolidays } from '../../utils/holidays';
import { findSessionByDate } from '../../lib/dateUtils';

interface YearlyPlanViewProps {
  yearlyPlan: Record<string, any>;
  players: any[];
  trainingSessions: any[];
  summerPrep?: any[];
  testMatches?: any[];
  competitiveMatches?: any[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  handleUpdateDayPlan: (dateKey: string, field: string, value: any) => void;
  isEditing?: boolean;
}

export const YearlyPlanView: React.FC<YearlyPlanViewProps> = ({
  yearlyPlan,
  players,
  trainingSessions,
  summerPrep = [],
  testMatches = [],
  competitiveMatches = [],
  currentMonth,
  setCurrentMonth,
  handleUpdateDayPlan,
  isEditing = false
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<{
    date: string;
    type: string;
    phase: string;
    time: string;
    activity: string;
    location: string;
    treffpunkt: string;
    opponent: string;
    ergebnis: string;
    content: string;
    customHolidayName?: string | null;
    athletik?: { start?: string; end?: string; notes?: string };
    vormittag?: { start?: string; end?: string; notes?: string };
    individual?: { start?: string; end?: string; notes?: string };
    video?: { start?: string; end?: string; notes?: string };
    training?: { start?: string; end?: string; notes?: string };
  } | null>(null);
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genOptions, setGenOptions] = useState({
    startDate: '2026-07-06',
    endDate: '2027-05-30',
    trainingDays: [2, 4], // Tuesday & Thursday as default training days
    skipHolidays: true,
    breakStart: '2026-12-15',
    breakEnd: '2027-01-15'
  });

  const toggleTrainingDay = (day: number) => {
    setGenOptions(prev => {
      const active = prev.trainingDays.includes(day);
      const updated = active 
        ? prev.trainingDays.filter(d => d !== day)
        : [...prev.trainingDays, day];
      return { ...prev, trainingDays: updated };
    });
  };

  const [sidebarTab, setSidebarTab] = useState<'status' | 'birthdays'>('status');
  const [birthdaySearch, setBirthdaySearch] = useState('');

  const birthdaysByMonthDay = useMemo(() => {
    const map: Record<string, Array<{ id: string; name: string; firstName?: string; lastName?: string; geburtsdatum: string; category: string; birthYear?: number; categoryLabel: string }>> = {};
    if (!players || !Array.isArray(players)) return map;
    
    const categoryLabels: Record<string, string> = {
      player: 'Spielerkader',
      coach: 'Trainerteam',
      staff: 'Teammanagement / Funktionär',
      medical: 'Medizinische Abteilung'
    };

    players.forEach((p: any) => {
      if (!p.geburtsdatum) return;
      
      let month = '';
      let day = '';
      let birthYear = 0;
      
      if (p.geburtsdatum.includes('-')) {
        const parts = p.geburtsdatum.split('-');
        if (parts.length >= 3) {
          birthYear = parseInt(parts[0], 10);
          month = String(parseInt(parts[1], 10)).padStart(2, '0');
          day = String(parseInt(parts[2], 10)).padStart(2, '0');
        }
      } else if (p.geburtsdatum.includes('.')) {
        const parts = p.geburtsdatum.split('.');
        if (parts.length >= 3) {
          // DD.MM.YYYY
          birthYear = parseInt(parts[2], 10);
          month = String(parseInt(parts[1], 10)).padStart(2, '0');
          day = String(parseInt(parts[0], 10)).padStart(2, '0');
        }
      }
      
      if (month && day) {
        const key = `${month}-${day}`;
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({
          id: p.id,
          name: p.lastName || p.name || '',
          firstName: p.firstName,
          lastName: p.lastName,
          geburtsdatum: p.geburtsdatum,
          category: p.category || 'player',
          categoryLabel: categoryLabels[p.category] || 'Sonstige',
          birthYear: birthYear || undefined
        });
      }
    });
    
    return map;
  }, [players]);

  const getBirthdaysForDate = (dateKey: string) => {
    const parts = dateKey.split('-');
    if (parts.length < 3) return [];
    const monthDayKey = `${parts[1]}-${parts[2]}`;
    const people = birthdaysByMonthDay[monthDayKey] || [];
    const targetYear = parseInt(parts[0], 10);
    
    return people.map(p => {
      let age: number | undefined = undefined;
      if (p.birthYear) {
        age = targetYear - p.birthYear;
      }
      return {
        ...p,
        age
      };
    });
  };

  const sortedBirthdays = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      geburtsdatum: string;
      category: string;
      month: number;
      day: number;
      birthYear?: number;
      formattedDate: string;
      categoryLabel: string;
    }> = [];
    
    const categoryLabels: Record<string, string> = {
      player: 'Spielerkader',
      coach: 'Trainerteam',
      staff: 'Teammanagement / Funktionär',
      medical: 'Medizinische Abteilung'
    };

    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    Object.entries(birthdaysByMonthDay).forEach(([monthDayKey, people]) => {
      const [mStr, dStr] = monthDayKey.split('-');
      const month = parseInt(mStr, 10);
      const day = parseInt(dStr, 10);
      
      people.forEach(p => {
        list.push({
          id: p.id,
          name: p.name,
          geburtsdatum: p.geburtsdatum,
          category: p.category,
          month,
          day,
          birthYear: p.birthYear,
          formattedDate: `${day}. ${monthNames[month - 1]}`,
          categoryLabel: categoryLabels[p.category] || 'Sonstige'
        });
      });
    });

    return list.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });
  }, [birthdaysByMonthDay]);

  const filteredBirthdays = useMemo(() => {
    return sortedBirthdays.filter(p => 
      p.name.toLowerCase().includes(birthdaySearch.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(birthdaySearch.toLowerCase())
    );
  }, [sortedBirthdays, birthdaySearch]);

  const getDayHolidayName = (dateKey: string) => {
    const planData = yearlyPlan[dateKey];
    if (planData && planData.customHolidayName !== undefined && planData.customHolidayName !== null) {
      return planData.customHolidayName || null;
    }
    const year = parseInt(dateKey.split('-')[0], 10);
    const calculatedHolidays = getHolidays(year);
    return calculatedHolidays[dateKey] || null;
  };

  // Sept 2026 · Monatsplan: wann (Uhrzeit), Intensität (Stufe 0–9) & Schwerpunkt je Trainingstag
  const SEPTEMBER_PLAN: Record<string, { stufe: number; schwerpunkt: string; uhrzeit: string }> = {
    // KW 36 · Spiel (H) Konstanz
    '2026-09-01': { stufe: 4, schwerpunkt: 'Spielaufbau & Positionsspiel', uhrzeit: '18:45' },
    '2026-09-03': { stufe: 8, schwerpunkt: 'Umschaltspiel', uhrzeit: '18:45' },
    '2026-09-04': { stufe: 6, schwerpunkt: 'Gegneranalyse & Abschlusstraining (Konstanz)', uhrzeit: '18:45' },
    '2026-09-05': { stufe: 0, schwerpunkt: 'Pflichtspiel (H) gegen Konstanz', uhrzeit: '15:30' },
    // KW 37 · Spiel (A) Salem
    '2026-09-08': { stufe: 8, schwerpunkt: 'Pressing & Gegenpressing', uhrzeit: '18:45' },
    '2026-09-10': { stufe: 4, schwerpunkt: 'Abschluss & Flügelspiel', uhrzeit: '18:45' },
    '2026-09-11': { stufe: 6, schwerpunkt: 'Gegneranalyse & Abschlusstraining (Salem)', uhrzeit: '18:45' },
    '2026-09-12': { stufe: 0, schwerpunkt: 'Pflichtspiel (A) gegen Salem', uhrzeit: '15:30' },
    // KW 38 · Spiel (H) Wolfenweiler-Schallstadt
    '2026-09-14': { stufe: 3, schwerpunkt: 'Regenerationslauf (20–30 Min)', uhrzeit: '10:00' },
    '2026-09-15': { stufe: 7, schwerpunkt: 'Aufbau über 6er & 8er', uhrzeit: '18:45' },
    '2026-09-17': { stufe: 6, schwerpunkt: 'Gegneranalyse & Training (Wolfenweiler-Schallstadt)', uhrzeit: '18:45' },
    '2026-09-18': { stufe: 5, schwerpunkt: 'Abschlusstraining', uhrzeit: '18:45' },
    '2026-09-19': { stufe: 0, schwerpunkt: 'Pflichtspiel (H) gegen Wolfenweiler-Schallstadt', uhrzeit: '15:30' },
    // KW 39 · Spiel (A) Bühlertal
    '2026-09-21': { stufe: 3, schwerpunkt: 'Sieg: frei | Niederlage: Regenerationslauf', uhrzeit: '10:00' },
    '2026-09-22': { stufe: 8, schwerpunkt: 'Defensive Stabilität', uhrzeit: '18:45' },
    '2026-09-24': { stufe: 4, schwerpunkt: 'Standards (Ecken, Freistöße)', uhrzeit: '18:45' },
    '2026-09-25': { stufe: 6, schwerpunkt: 'Gegneranalyse & Abschlusstraining (Bühlertal)', uhrzeit: '18:45' },
    '2026-09-26': { stufe: 0, schwerpunkt: 'Pflichtspiel (A) gegen Bühlertal', uhrzeit: '15:30' },
    // KW 40 · Spiel (H) Lahr
    '2026-09-29': { stufe: 7, schwerpunkt: 'Angriffszonen & Tiefenläufe', uhrzeit: '18:45' },
    '2026-10-01': { stufe: 8, schwerpunkt: 'Spielformen 11v11', uhrzeit: '18:45' },
    '2026-10-02': { stufe: 6, schwerpunkt: 'Gegneranalyse & Abschlusstraining (Lahr)', uhrzeit: '18:45' },
    '2026-10-03': { stufe: 0, schwerpunkt: 'Pflichtspiel (H) gegen Lahr', uhrzeit: '15:30' },
  };

  const mergedData = useMemo(() => {
    const data: Record<string, any> = {};
    const startDate = new Date('2026-06-01');
    const endDate = new Date('2027-07-31');
    
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const dateStr = current.toLocaleDateString('de-DE');
      
      const planData = yearlyPlan[dateKey] || {};
      const session = findSessionByDate(trainingSessions, dateStr);
      const summerEntry = summerPrep.find(s => s.date === dateKey);
      const testMatch = testMatches.find(m => m.date === dateKey);
      const compMatch = competitiveMatches.find(m => m.date === dateKey);

      // Sept 2026 · Monatsplan (Umsetzungsplan aus dem Wochenplan) als Fallback für nicht belegte Tage
      const septPlan = SEPTEMBER_PLAN[dateKey];

      // Phases
      let phase: 'summer' | 'winter' | 'season' | 'break' = 'season';
      const summerS = new Date('2026-07-06');
      const summerE = new Date('2026-08-15');
      const breakS = new Date('2026-12-15');
      const breakE = new Date('2027-01-15');
      const winterS = new Date('2027-01-16');
      const winterE = new Date('2027-03-15');

      if (current >= summerS && current <= summerE) phase = 'summer';
      else if (current >= breakS && current <= breakE) phase = 'break';
      else if (current >= winterS && current <= winterE) phase = 'winter';

      const hasPlanType = planData.type !== undefined && planData.type !== null && planData.type !== '';
      const resolvedType = hasPlanType
        ? planData.type
        : (summerEntry?.type || (testMatch ? 'Testspiel' : (compMatch ? 'Pflichtspiel' : (phase === 'break' ? 'Frei' : (session ? 'Training' : 'Frei')))));

      const resolvedActivity = (planData.activity !== undefined && planData.activity !== null)
        ? planData.activity
        : (planData.content !== undefined && planData.content !== null)
          ? planData.content
          : (resolvedType === 'Frei'
            ? 'Trainingsfrei / Regeneration'
            : (summerEntry?.content || summerEntry?.inhalt || (testMatch ? `Testspiel vs ${testMatch.opponent}` : (compMatch ? `Pflichtspiel vs ${compMatch.opponent}` : (phase === 'break' ? 'WINTERPAUSE' : (session?.sessionFocus || session?.weeklyFocus || ''))))));

      const resolvedTime = (planData.time !== undefined && planData.time !== null)
        ? planData.time
        : (resolvedType === 'Frei' ? '' : (summerEntry?.time || testMatch?.kickOff || compMatch?.kickOff || (resolvedType === 'Training' ? '19:00 - 20:30' : '')));

      const resolvedLocation = (planData.location !== undefined && planData.location !== null)
        ? planData.location
        : (resolvedType === 'Frei' ? '' : (summerEntry?.location || testMatch?.location || compMatch?.location || (resolvedType === 'Training' ? 'Rasenplatz Auggen' : '')));

      const resolvedOpponent = (planData.opponent !== undefined && planData.opponent !== null)
        ? planData.opponent
        : (resolvedType === 'Frei' || resolvedType === 'Training' ? '' : (summerEntry?.opponent || testMatch?.opponent || compMatch?.opponent || ''));

      const resolvedTreffpunkt = (planData.treffpunkt !== undefined && planData.treffpunkt !== null)
        ? planData.treffpunkt
        : (resolvedType === 'Frei' ? '' : (summerEntry?.treffpunkt || testMatch?.meetingTime || compMatch?.meetingTime || ''));

      const resolvedErgebnis = (planData.ergebnis !== undefined && planData.ergebnis !== null)
        ? planData.ergebnis
        : (resolvedType === 'Frei' || resolvedType === 'Training' ? '' : (summerEntry?.ergebnis || testMatch?.result || compMatch?.result || ''));

      data[dateKey] = {
        kw: summerEntry?.kw,
        te: summerEntry?.te,
        ...summerEntry,
        ...planData,
        type: resolvedType,
        activity: resolvedActivity,
        time: resolvedTime,
        location: resolvedLocation,
        opponent: resolvedOpponent,
        treffpunkt: resolvedTreffpunkt,
        ergebnis: resolvedErgebnis,
        phase: planData.phase || phase,
      };

      // Sept 2026 · Monatsplan-Eintrag für nicht belegte Tage (Zeit, Intensität, Schwerpunkt)
      if (septPlan && !hasPlanType && !summerEntry && !testMatch && !compMatch && !session) {
        data[dateKey].type = septPlan.stufe === 0 ? 'Pflichtspiel' : 'Training';
        data[dateKey].activity = septPlan.schwerpunkt;
        data[dateKey].content = septPlan.schwerpunkt;
        data[dateKey].stufe = septPlan.stufe;
        data[dateKey].intensity = septPlan.stufe;
        data[dateKey].time = septPlan.uhrzeit;
        data[dateKey].location = septPlan.stufe === 0 ? '' : 'Rasenplatz Auggen';
      }

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [yearlyPlan, trainingSessions, summerPrep, testMatches, competitiveMatches]);
  const onlyPlayers = useMemo(() => {
    return players.filter(p => p.category !== 'coach' && p.category !== 'staff' && p.category !== 'medical');
  }, [players]);

  useEffect(() => {
    if (selectedEventDate) {
      const item = mergedData[selectedEventDate] || {};
      const yPlan = yearlyPlan[selectedEventDate] || {};
      setModalDraft({
        date: selectedEventDate,
        type: item.type || 'Training',
        phase: item.phase || 'season',
        time: item.time || '',
        activity: item.activity || '',
        location: item.location || '',
        treffpunkt: item.treffpunkt || '',
        opponent: item.opponent || '',
        ergebnis: item.ergebnis || '',
        content: item.content || item.activity || '',
        customHolidayName: yPlan.customHolidayName !== undefined ? yPlan.customHolidayName : undefined,
        athletik: { ...(item.athletik || {}) },
        vormittag: { ...(item.vormittag || {}) },
        individual: { ...(item.individual || {}) },
        video: { ...(item.video || {}) },
        training: { ...(item.training || {}) }
      });
    } else {
      setModalDraft(null);
    }
  }, [selectedEventDate]);

  const updateModalDraft = (field: string, val: any) => {
    setModalDraft(prev => {
      if (!prev) return prev;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(typeof (prev as any)[parent] === 'object' && (prev as any)[parent] !== null ? (prev as any)[parent] : {}),
            [child]: val
          }
        };
      }
      return {
        ...prev,
        [field]: val
      };
    });
  };

  const handleSaveModal = async () => {
    if (!modalDraft || !selectedEventDate) {
      setSelectedEventDate(null);
      return;
    }
    setIsSavingModal(true);
    try {
      await handleUpdateDayPlan(selectedEventDate, '_full_day_', modalDraft);
    } catch (err) {
      console.error('Error saving day modal:', err);
    } finally {
      setIsSavingModal(false);
      setSelectedEventDate(null);
    }
  };

  const handleDeleteModalDay = async () => {
    if (!selectedEventDate) return;
    setIsSavingModal(true);
    try {
      const clearedDay = {
        date: selectedEventDate,
        type: 'Frei',
        time: '',
        activity: '',
        content: '',
        location: '',
        treffpunkt: '',
        opponent: '',
        ergebnis: '',
        athletik: { start: '', end: '', notes: '' },
        vormittag: { start: '', end: '', notes: '' },
        individual: { start: '', end: '', notes: '' },
        video: { start: '', end: '', notes: '' },
        training: { start: '', end: '', notes: '' }
      };
      await handleUpdateDayPlan(selectedEventDate, '_full_day_', clearedDay);
    } catch (err) {
      console.error('Error deleting day modal:', err);
    } finally {
      setIsSavingModal(false);
      setSelectedEventDate(null);
    }
  };

  const [listSearch, setListSearch] = useState('');
  const [listGroupBy, setListGroupBy] = useState<'month' | 'phase'>('month');
  const [selectedListDate, setSelectedListDate] = useState<string | null>('2026-07-06');

  const [listPhaseFilter, setListPhaseFilter] = useState<'all' | 'summer' | 'season' | 'winter' | 'break'>('all');

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
  };

  const typeColors: Record<string, string> = {
    'Training': 'bg-blue-950/80 text-[#60A5FA] border-[#3B82F6] font-bold shadow-[0_0_8px_rgba(59,130,246,0.3)]',
    'Spiel': 'bg-rose-950/90 text-[#FF4C4C] border-[#FF4C4C] font-bold shadow-[0_0_8px_rgba(255,76,76,0.4)]',
    'Frei': 'bg-emerald-950/80 text-[#00D47A] border-[#00D47A] font-bold shadow-[0_0_8px_rgba(0,212,122,0.3)]',
    'Event': 'bg-yellow-950/80 text-[#FACC15] border-[#FACC15] font-bold shadow-[0_0_8px_rgba(250,204,21,0.3)]',
    'Pflichtspiel': 'bg-rose-950/90 text-[#FF4C4C] border-[#FF4C4C] font-bold shadow-[0_0_8px_rgba(255,76,76,0.4)]',
    'Testspiel': 'bg-amber-950/90 text-[#FFD54F] border-[#FFD54F] font-bold shadow-[0_0_8px_rgba(255,213,79,0.3)]',
    'Turnier': 'bg-purple-950/80 text-[#C084FC] border-[#A855F7] font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]',
    'Meeting': 'bg-teal-950/80 text-[#2DD4BF] border-[#00C2A8] font-bold shadow-[0_0_8px_rgba(0,194,168,0.3)]',
  };

  const phaseColors: Record<string, string> = {
    'summer': 'border-l-4 border-amber-500 bg-amber-950/30 text-[#F5F5F5]',
    'winter': 'border-l-4 border-cyan-500 bg-cyan-950/30 text-[#F5F5F5]',
    'break': 'border-l-4 border-gray-500 bg-gray-900/60 text-[#C7C7C7]',
    'season': 'border-l-4 border-[#00D47A] bg-emerald-950/30 text-[#F5F5F5]',
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

  const handleDragStart = (e: React.DragEvent, dateKey: string) => {
    e.dataTransfer.setData('text/plain', dateKey);
  };

  const handleDrop = (e: React.DragEvent, targetDateKey: string) => {
    e.preventDefault();
    const sourceDateKey = e.dataTransfer.getData('text/plain');
    if (sourceDateKey && sourceDateKey !== targetDateKey) {
      const sourceData = yearlyPlan[sourceDateKey];
      if (sourceData) {
        // Move event
        handleUpdateDayPlan(targetDateKey, 'type', sourceData.type || 'Training');
        handleUpdateDayPlan(targetDateKey, 'time', sourceData.time || '');
        handleUpdateDayPlan(targetDateKey, 'content', sourceData.content || '');
        // Clear source
        handleUpdateDayPlan(sourceDateKey, 'type', 'Frei');
        handleUpdateDayPlan(sourceDateKey, 'time', '');
        handleUpdateDayPlan(sourceDateKey, 'content', '');
      }
    }
  };

  const renderMonthCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInCurMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    // Monday as first day of week: 0 = Mon, ..., 6 = Sun
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    // Previous month days to cleanly align the first row
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const cells = [];

    // Preceding muted days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDayNum = prevMonthLastDate - i;
      cells.push(
        <div 
          key={`prev-${prevDayNum}`} 
          className="min-h-[115px] md:min-h-[130px] bg-[#0A0E17]/40 border border-[#1E293B]/40 p-2 rounded-xl opacity-30 flex flex-col justify-between pointer-events-none select-none"
        >
          <span className="text-[11px] font-mono text-slate-500 font-bold">{prevDayNum}</span>
        </div>
      );
    }

    // Days of current month
    for (let d = 1; d <= daysInCurMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = mergedData[dateKey] || { type: 'Frei', content: '', time: '' };
      const holidayName = getDayHolidayName(dateKey);
      const dayBirthdays = getBirthdaysForDate(dateKey);
      const isToday = dateKey === todayStr;
      const isSelected = selectedEventDate === dateKey;
      const hasPlan = dayData.type && dayData.type !== 'Frei';

      cells.push(
        <div
          key={dateKey}
          id={`cal-day-${dateKey}`}
          draggable
          onDragStart={(e) => handleDragStart(e, dateKey)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, dateKey)}
          onClick={() => setSelectedEventDate(dateKey)}
          className={`min-h-[115px] md:min-h-[130px] p-2.5 rounded-xl flex flex-col justify-between transition-all duration-150 cursor-pointer relative overflow-hidden select-none border ${
            isSelected
              ? 'bg-[#10B981]/15 border-2 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-2 ring-[#10B981]/50 z-10'
              : 'bg-[#121824] hover:bg-[#1A2333] border-[#2A374A] hover:border-[#10B981]/60'
          }`}
        >
          {/* Day Header */}
          <div className="flex items-center justify-between gap-1">
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${
                isToday
                  ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : isSelected
                  ? 'bg-[#10B981] text-[#0A0E17] font-black'
                  : 'text-slate-200 font-bold bg-[#1E293B]/70'
              }`}
            >
              {d}
            </span>

            {/* Type Badge */}
            {hasPlan ? (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border truncate max-w-[110px] ${
                  typeColors[dayData.type] || 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={dayData.type}
              >
                {typeIcons[dayData.type] || <Dribbble size={9} />}
                <span className="truncate">{dayData.type}</span>
              </div>
            ) : (
              <span className="text-[8px] font-bold uppercase text-emerald-400/60 bg-emerald-950/20 px-1 py-0.2 rounded border border-emerald-800/30">
                Frei
              </span>
            )}
          </div>

          {/* Day Content */}
          <div className="flex-1 my-1.5 flex flex-col gap-1 overflow-hidden">
            {dayData.time && (
              <div className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1">
                <Clock size={9} className="text-[#10B981]" />
                <span className="truncate">{dayData.time}</span>
              </div>
            )}

            {(dayData.stufe !== undefined && dayData.stufe !== null) && (
              <div
                className={`text-[8px] font-black uppercase tracking-wider border px-1 py-0.2 rounded ${
                  dayData.stufe === 0
                    ? 'text-rose-400 bg-rose-950/90 border-rose-900'
                    : dayData.stufe >= 8
                    ? 'text-rose-300 bg-rose-950/60 border-rose-800'
                    : dayData.stufe >= 5
                    ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                    : dayData.stufe >= 3
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                    : 'text-slate-400 bg-slate-800/60 border-slate-700'
                }`}
              >
                ⚡ Intensität: Stufe {dayData.stufe}{dayData.stufe === 0 ? ' · Spieltag' : ''}
              </div>
            )}

            {(dayData.activity || dayData.content) && (
              <div
                className="text-[10px] font-semibold text-slate-200 leading-tight line-clamp-2"
                title={dayData.activity || dayData.content}
              >
                {dayData.activity || dayData.content}
              </div>
            )}
          </div>

          {/* Day Footer: Holidays & Birthdays */}
          <div className="flex flex-col gap-0.5 mt-auto pt-1 border-t border-[#243042]/60">
            {holidayName && (
              <div
                className="text-[7.5px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-800/70 px-1 py-0.2 rounded truncate"
                title={holidayName}
              >
                ⭐ {holidayName}
              </div>
            )}
            {dayBirthdays.length > 0 && (
              <div
                className="text-[7.5px] font-bold text-pink-300 bg-pink-950/70 border border-pink-800/70 px-1 py-0.2 rounded truncate"
                title={`Geburtstag: ${dayBirthdays.map((p) => p.name).join(', ')}`}
              >
                🎂 {dayBirthdays.map((p) => p.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Trailing days for next month to complete neat rectangular grid
    const totalCellsSoFar = startOffset + daysInCurMonth;
    const targetTotalCells = totalCellsSoFar > 35 ? 42 : 35;
    const remainingCells = targetTotalCells - totalCellsSoFar;
    for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
      cells.push(
        <div 
          key={`next-${nextDay}`} 
          className="min-h-[115px] md:min-h-[130px] bg-[#0A0E17]/40 border border-[#1E293B]/40 p-2 rounded-xl opacity-30 flex flex-col justify-between pointer-events-none select-none"
        >
          <span className="text-[11px] font-mono text-slate-500 font-bold">{nextDay}</span>
        </div>
      );
    }

    return (
      <div className="h-full bg-[#121824] border border-[#334155] rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-100">
        {/* Calendar Day Headers */}
        <div className="grid grid-cols-7 bg-[#0A0E17] text-[#10B981] text-[11px] font-black uppercase tracking-wider text-center py-3 border-b border-[#334155]">
          {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map((dayName, idx) => (
            <div key={dayName} className={idx >= 5 ? 'text-amber-400 font-black' : ''}>
              {dayName}
            </div>
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 overflow-y-auto custom-scrollbar p-2 md:p-3 gap-1.5 md:gap-2 bg-[#0E1522]">
          {cells}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const groupedData: Record<string, any[]> = {};
    
    Object.entries(mergedData).forEach(([dateKey, dayData]) => {
      const date = new Date(dateKey);
      
      // Filtering
      if (listSearch && !dateKey.includes(listSearch) && !dayData.activity?.toLowerCase().includes(listSearch.toLowerCase()) && !dayData.type?.toLowerCase().includes(listSearch.toLowerCase())) {
        return;
      }

      // Main view filter: filter by phase if specific phase selected
      if (listPhaseFilter !== 'all' && dayData.phase !== listPhaseFilter) {
        return;
      }

      let groupKey = '';
      if (listGroupBy === 'month') {
        groupKey = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      } else {
        const phase = dayData.phase || 'season';
        groupKey = phase === 'summer' ? 'Sommerplan (06.07. - 15.08.)' : 
                   phase === 'winter' ? 'Wintervorbereitung (16.01. - 15.03.)' : 
                   phase === 'break' ? 'Winterpause (15.12. - 15.01.)' : 'Saison';
      }

      if (!groupedData[groupKey]) groupedData[groupKey] = [];
      groupedData[groupKey].push({ dateKey, ...dayData });
    });

    return (
      <div className="h-full bg-white border border-slate-200 rounded-xl shadow-md flex flex-col overflow-hidden text-[#0F172A]">
        <div className="p-4 border-b border-slate-200 bg-[#F1F5F9] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <button 
                onClick={() => setListPhaseFilter('all')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all ${listPhaseFilter === 'all' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Gesamtplan
              </button>
              <button 
                onClick={() => setListPhaseFilter('summer')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase border-l border-slate-300 transition-all ${listPhaseFilter === 'summer' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Sommerplan
              </button>
              <button 
                onClick={() => setListPhaseFilter('season')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase border-l border-slate-300 transition-all ${listPhaseFilter === 'season' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Saison
              </button>
              <button 
                onClick={() => setListPhaseFilter('winter')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase border-l border-slate-300 transition-all ${listPhaseFilter === 'winter' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Wintervorbereitung
              </button>
              <button 
                onClick={() => setListPhaseFilter('break')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase border-l border-slate-300 transition-all ${listPhaseFilter === 'break' ? 'bg-slate-700 text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Winterpause
              </button>
            </div>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Suchen..."
              className="w-full pl-10 pr-4 py-1.5 bg-white border border-slate-300 rounded-lg text-[#0F172A] placeholder:text-slate-400 text-xs font-bold uppercase focus:outline-none focus:border-[#0D9488]"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">Gruppieren nach:</span>
            <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <button 
                onClick={() => setListGroupBy('month')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all ${listGroupBy === 'month' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Monat
              </button>
              <button 
                onClick={() => setListGroupBy('phase')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase border-l border-slate-300 transition-all ${listGroupBy === 'phase' ? 'bg-[#0D9488] text-white font-black' : 'bg-white text-[#475569] hover:bg-slate-100'}`}
              >
                Phase
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50">
          <div className="space-y-8 pb-8">
            {Object.entries(groupedData).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] bg-white border border-slate-300 text-slate-900 px-3.5 py-1.5 rounded-lg inline-block mb-2 shadow-sm">{group}</h3>
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-md bg-white">
                  <table className="w-full border-collapse text-[10px] font-bold text-slate-900 bg-white">
                    <thead className="bg-slate-200 text-slate-900 border-b-2 border-slate-300 sticky top-0 z-10 uppercase text-xs font-black">
                      {listPhaseFilter === 'summer' ? (
                        <tr>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-8">KW</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-8">TE</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Datum</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-12">Tag</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-16">Zeit</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-16">Treff</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Typ</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left">Inhalt / Aktivität</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Ort</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-32">Gegner</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-20">Ergebnis</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Status</th>
                          <th className="p-2.5 text-slate-900 text-left w-32">Notizen</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Datum</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-16">Tag</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-20">Typ</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-16">Zeit</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left">Inhalt / Aktivität</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-left w-24">Ort</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-center w-12">ATH</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-center w-12">VOR</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-center w-12">IND</th>
                          <th className="p-2.5 border-r border-slate-300 text-slate-900 text-center w-12">VID</th>
                          <th className="p-2.5 text-slate-900 text-center w-12">TR</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const date = new Date(item.dateKey);
                        const isSelected = selectedListDate === item.dateKey;
                        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const dayBirthdays = getBirthdaysForDate(item.dateKey);
                        const holidayName = getDayHolidayName(item.dateKey);
                        
                        if (listPhaseFilter === 'summer') {
                          return (
                            <tr 
                              key={item.dateKey} 
                              className={`border-b border-slate-200 hover:bg-amber-50/80 cursor-pointer transition-colors ${isSelected ? 'bg-amber-100/90 border-amber-300' : 'bg-white even:bg-slate-50/80'} text-slate-900`}
                              onClick={() => setSelectedListDate(item.dateKey)}
                            >
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">{item.kw || '-'}</td>
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">{item.te || '-'}</td>
                              <td className="p-2 border-r border-slate-200 font-black text-slate-900">{date.toLocaleDateString('de-DE')}</td>
                              <td className="p-2 border-r border-slate-200 uppercase font-bold text-slate-700">{weekday}</td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent font-black text-slate-900 focus:text-amber-600 focus:outline-none"
                                  value={item.time || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'time', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent font-bold text-slate-800 focus:text-amber-600 focus:outline-none"
                                  value={item.treffpunkt || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'treffpunkt', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <select 
                                  className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase inline-flex items-center gap-1 cursor-pointer bg-slate-900 text-amber-300 border-slate-800 shadow-xs ${typeColors[item.type] || ''}`}
                                  value={item.type}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    const updates: Record<string, any> = { type: newType };
                                    if (newType === 'Training' && (!item.time || item.time === '')) {
                                      updates.time = '19:00 - 20:30';
                                    }
                                    handleUpdateDayPlan(item.dateKey, '_full_day_', updates);
                                  }}
                                >
                                  {Object.keys(typeColors).map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                                </select>
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <div className="flex flex-col">
                                  <input 
                                    type="text"
                                    className="w-full bg-transparent font-black uppercase text-[11px] text-slate-900 focus:text-amber-600 focus:outline-none placeholder:text-slate-400"
                                    value={item.activity || ''}
                                    onChange={(e) => handleUpdateDayPlan(item.dateKey, 'activity', e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="-"
                                  />
                                  <input 
                                    type="text"
                                    className="w-full bg-transparent text-[9.5px] text-slate-600 italic font-medium focus:text-amber-600 focus:outline-none placeholder:text-slate-400"
                                    value={item.content || ''}
                                    onChange={(e) => handleUpdateDayPlan(item.dateKey, 'content', e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="Notizen..."
                                  />
                                  {(holidayName || dayBirthdays.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {holidayName && (
                                        <span className="text-[7.5px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                          🎉 {holidayName}
                                        </span>
                                      )}
                                      {dayBirthdays.map((p, idx) => (
                                        <span key={idx} className="text-[7.5px] font-black uppercase text-pink-900 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded flex items-center gap-0.5" title={p.categoryLabel}>
                                          🎂 {p.name} ({p.age !== undefined ? p.age : '?'})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent uppercase font-bold text-slate-800 focus:text-amber-600 focus:outline-none"
                                  value={item.location || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'location', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent uppercase font-bold text-slate-800 focus:text-amber-600 focus:outline-none"
                                  value={item.opponent || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'opponent', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent font-black text-center text-slate-900 focus:text-amber-600 focus:outline-none"
                                  value={item.ergebnis || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'ergebnis', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent uppercase font-bold text-slate-800 focus:text-amber-600 focus:outline-none"
                                  value={item.status || 'Geplant'}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'status', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-[9.5px] text-slate-600 focus:text-amber-600 focus:outline-none"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'notes', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr 
                            key={item.dateKey} 
                            className={`border-b border-slate-200 hover:bg-amber-50/80 cursor-pointer transition-colors ${isSelected ? 'bg-amber-100/90 border-amber-300' : 'bg-white even:bg-slate-50/80'} text-slate-900`}
                            onClick={() => setSelectedListDate(item.dateKey)}
                          >
                            <td className="p-2 border-r border-slate-200 font-black text-slate-900">{date.toLocaleDateString('de-DE')}</td>
                            <td className="p-2 border-r border-slate-200 uppercase font-bold text-slate-700">{weekday}</td>
                            <td className="p-2 border-r border-slate-200">
                              <select 
                                className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase inline-flex items-center gap-1 cursor-pointer bg-slate-900 text-amber-300 border-slate-800 shadow-xs ${typeColors[item.type] || ''}`}
                                value={item.type}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  const updates: Record<string, any> = { type: newType };
                                  if (newType === 'Training' && (!item.time || item.time === '')) {
                                    updates.time = '19:00 - 20:30';
                                  }
                                  handleUpdateDayPlan(item.dateKey, '_full_day_', updates);
                                }}
                              >
                                {Object.keys(typeColors).map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                              </select>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <input 
                                type="text"
                                className="w-full bg-transparent font-black text-slate-900 focus:text-amber-600 focus:outline-none"
                                value={item.time || ''}
                                onChange={(e) => handleUpdateDayPlan(item.dateKey, 'time', e.target.value)}
                                disabled={!isEditing}
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="flex items-center justify-between group/row">
                                <div className="flex flex-col flex-1">
                                  <input 
                                    type="text"
                                    className="w-full bg-transparent font-black uppercase text-[11px] text-slate-900 focus:text-amber-600 focus:outline-none placeholder:text-slate-400"
                                    value={item.activity || ''}
                                    onChange={(e) => handleUpdateDayPlan(item.dateKey, 'activity', e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="-"
                                  />
                                  <input 
                                    type="text"
                                    className="w-full bg-transparent text-[9.5px] text-slate-600 italic font-medium focus:text-amber-600 focus:outline-none placeholder:text-slate-400"
                                    value={item.content || ''}
                                    onChange={(e) => handleUpdateDayPlan(item.dateKey, 'content', e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="Notizen..."
                                  />
                                  {(holidayName || dayBirthdays.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {holidayName && (
                                        <span className="text-[7.5px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                          🎉 {holidayName}
                                        </span>
                                      )}
                                      {dayBirthdays.map((p, idx) => (
                                        <span key={idx} className="text-[7.5px] font-black uppercase text-pink-900 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded flex items-center gap-0.5" title={p.categoryLabel}>
                                          🎂 {p.name} ({p.age !== undefined ? p.age : '?'})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEventDate(item.dateKey);
                                  }}
                                  className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all rounded"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <input 
                                type="text"
                                className="w-full bg-transparent uppercase font-bold text-slate-800 focus:text-amber-600 focus:outline-none"
                                value={item.location || ''}
                                onChange={(e) => handleUpdateDayPlan(item.dateKey, 'location', e.target.value)}
                                disabled={!isEditing}
                                placeholder="-"
                              />
                            </td>
                            <td 
                              className={`p-2 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 ${item.athletik?.start ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDayPlan(item.dateKey, 'athletik.start', item.athletik?.start ? '' : '09:00');
                              }}
                              title="Athletikeinheit umschalten (09:00 Uhr)"
                            >
                              {item.athletik?.start ? (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-center text-[8.5px] font-black focus:outline-none text-emerald-600"
                                  value={item.athletik.start}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'athletik.start', e.target.value)}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td 
                              className={`p-2 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 ${item.vormittag?.start ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDayPlan(item.dateKey, 'vormittag.start', item.vormittag?.start ? '' : '10:30');
                              }}
                              title="Vormittagseinheit umschalten (10:30 Uhr)"
                            >
                              {item.vormittag?.start ? (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-center text-[8.5px] font-black focus:outline-none text-emerald-600"
                                  value={item.vormittag.start}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'vormittag.start', e.target.value)}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td 
                              className={`p-2 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 ${item.individual?.start ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDayPlan(item.dateKey, 'individual.start', item.individual?.start ? '' : '14:00');
                              }}
                              title="Individualeinheit umschalten (14:00 Uhr)"
                            >
                              {item.individual?.start ? (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-center text-[8.5px] font-black focus:outline-none text-emerald-600"
                                  value={item.individual.start}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'individual.start', e.target.value)}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td 
                              className={`p-2 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 ${item.video?.start ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDayPlan(item.dateKey, 'video.start', item.video?.start ? '' : '17:00');
                              }}
                              title="Videoanalyse umschalten (17:00 Uhr)"
                            >
                              {item.video?.start ? (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-center text-[8.5px] font-black focus:outline-none text-emerald-600"
                                  value={item.video.start}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'video.start', e.target.value)}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td 
                              className={`p-2 text-center font-black cursor-pointer hover:bg-slate-100 ${item.training?.start ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDayPlan(item.dateKey, 'training.start', item.training?.start ? '' : '19:00');
                              }}
                              title="Haupttraining umschalten (19:00 Uhr)"
                            >
                              {item.training?.start ? (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent text-center text-[8.5px] font-black focus:outline-none text-emerald-600"
                                  value={item.training.start}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateDayPlan(item.dateKey, 'training.start', e.target.value)}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-[#0A0E17] text-[#F8FAFC]">
      {/* 1. Header Mask (Exact Design Language as Spieler-Bereich / Scouting 📝) */}
      <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-[#10B981] text-[#0A0E17] font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Sparkles size={11} /> JAHRESPLAN 26/27 • SAISON-ORGANISATOR
          </span>
          <h1 className="text-3xl font-black uppercase leading-none mt-2 text-[#F8FAFC]">
            JAHRESPLAN & SAISONKALENDER 2026/2027
          </h1>
          <p className="text-xs font-semibold text-[#94A3B8] mt-1 uppercase tracking-wider flex items-center gap-2">
            <Activity size={13} className="text-[#10B981]" />
            FC AUGGEN 1921 • TRAININGS-, SPIEL- & EVENT-ORGANISATION
          </p>
        </div>
        <div className="shrink-0 font-mono text-xs text-right bg-[#0A0E17] p-2.5 border border-[#334155] rounded-lg">
          <p className="font-bold text-[#F8FAFC]">STATUS: JAHRESPLAN AKTIV</p>
          <p className="text-[10px] text-[#10B981] mt-1 font-bold">
            SAISON: 2026/2027 • {viewMode === 'calendar' ? 'MONATSKALENDER' : 'LISTEN-ANSICHT'}
          </p>
        </div>
      </div>

      {/* 2. View Switcher Tabs Bar (Matches Scouting & Player design language) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-[#121824] border border-[#334155]/80 rounded-xl shadow-lg select-none">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-[280px]">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <CalendarDays size={15} /> <span>📅 Monatskalender</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <AlignLeft size={15} /> <span>📋 Liste</span>
          </button>
        </div>

        {/* Date and View Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0A0E17] border border-[#334155] px-3 py-1.5 rounded-xl shadow-inner">
            <button 
              type="button"
              onClick={() => changeMonth(-1)} 
              title="Vorheriger Monat"
              className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-black uppercase text-[#F8FAFC] px-2 min-w-[130px] text-center">
              {monthName}
            </span>
            <button 
              type="button"
              onClick={() => setCurrentMonth(new Date())} 
              className="px-2 py-0.5 text-[10px] font-black uppercase text-[#10B981] hover:bg-[#10B981]/15 rounded transition-all cursor-pointer border border-[#10B981]/30"
            >
              Heute
            </button>
            <button 
              type="button"
              onClick={() => changeMonth(1)} 
              title="Nächster Monat"
              className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              setSelectedEventDate(todayStr);
            }}
            className="bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs px-3.5 py-2 rounded-xl border border-[#10B981] transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Trainingseinheit hinzufügen</span>
          </button>

          {isEditing && (
            <button 
              type="button"
              onClick={() => setShowGenModal(true)}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-[#F8FAFC] px-3.5 py-2 text-xs font-black uppercase rounded-xl border border-[#EF4444] transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              Saison generieren
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col bg-[#0F0F0F]">
          {viewMode === 'calendar' && renderMonthCalendar()}
          {viewMode === 'list' && renderListView()}
        </div>

        {/* Sidebar (Right Side): Player Status or Birthdays */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 text-[#0F172A]">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 bg-[#F1F5F9]">
            <button
              onClick={() => setSidebarTab('status')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 border-r border-slate-200
                ${sidebarTab === 'status' ? 'bg-white text-[#0D9488] border-b-2 border-[#0D9488]' : 'bg-[#F1F5F9] hover:bg-white text-[#64748B]'}`}
            >
              <Users size={12} />
              Kader & Status
            </button>
            <button
              onClick={() => setSidebarTab('birthdays')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5
                ${sidebarTab === 'birthdays' ? 'bg-white text-pink-600 border-b-2 border-pink-600' : 'bg-[#F1F5F9] hover:bg-white text-[#64748B]'}`}
            >
              <Gift size={12} />
              Geburtstage
            </button>
          </div>

          {sidebarTab === 'status' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="p-3.5 border-b border-slate-200 bg-[#F1F5F9] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 text-[#0F172A]">
                    <Users size={14} className="text-[#0D9488]" /> Kader & Status
                  </h3>
                  <span className="text-[10px] font-bold bg-white text-[#0D9488] px-2 py-0.5 rounded-full border border-slate-300">{onlyPlayers.length}</span>
                </div>
                {selectedListDate && (
                  <div className="text-[9px] font-bold bg-white text-[#0F172A] border border-slate-300 px-2.5 py-1 rounded-lg flex items-center justify-between shadow-2xs">
                    <span>{new Date(selectedListDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                <table className="w-full border-collapse bg-white">
                  <thead className="sticky top-0 bg-[#F1F5F9] border-b border-slate-200 text-[#0F172A] z-10">
                    <tr>
                      <th className="text-[9px] font-bold uppercase p-2 text-left border-r border-slate-200 text-[#0F172A]">Spieler</th>
                      <th className="text-[9px] font-bold uppercase p-2 text-center border-r border-slate-200 text-[#0D9488]">Pos</th>
                      <th className="text-[9px] font-bold uppercase p-2 text-center text-[#0F172A]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlyPlayers.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')).map((player: any) => {
                      // Find training session for selected date
                      let status = '-';
                      if (selectedListDate) {
                        const [y, m, d] = selectedListDate.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const selectedDateStr = dateObj.toLocaleDateString('de-DE');
                        const session = findSessionByDate(trainingSessions, selectedDateStr);
                        const playerInSession = session?.players?.find((p: any) => p.name === player.lastName);
                        status = playerInSession?.status || '-';
                      }

                      const getStatusStyle = (s: string) => {
                        switch(s) {
                          case '1': return 'bg-white text-[#000000] font-black border border-slate-300 shadow-2xs';
                          case 'A': return 'bg-white text-[#2563EB] font-black border border-slate-300 shadow-2xs';
                          case 'B': return 'bg-white text-[#DC2626] font-black border border-slate-300 shadow-2xs';
                          case 'K': return 'bg-white text-[#CA8A04] font-black border border-slate-300 shadow-2xs';
                          default: return 'bg-white text-slate-400 font-bold border border-slate-200';
                        }
                      };

                      const handleStatusToggle = () => {
                        if (!isEditing || !selectedListDate) return;
                        
                        const statuses = ['-', '1', 'A', 'B', 'K'];
                        const currentIndex = statuses.indexOf(status);
                        const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                        
                        const [y, m, d] = selectedListDate.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const selectedDateStr = dateObj.toLocaleDateString('de-DE');
                        
                        let session = findSessionByDate(trainingSessions, selectedDateStr);
                        
                        if (!session) {
                          // Create session if it doesn't exist
                          const newSession = {
                            id: `ts${Date.now()}`,
                            date: selectedDateStr,
                            weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(dateObj),
                            group: 'FC Auggen',
                            load: 'Mittel',
                            duration: '90 Min',
                            weeklyFocus: '',
                            sessionFocus: '',
                            trainer: 'Amin',
                            intensity: 'Mittel',
                            players: onlyPlayers.map(p => ({ 
                              name: p.lastName, 
                              position: p.position, 
                              status: p.id === player.id ? nextStatus : '-' 
                            })),
                            content: { warmup: '', main1: '', main2: '', closing: '' },
                            importantInfo: '',
                            remarks: ''
                          };
                          (window as any).saveTrainingSession?.(newSession);
                        } else {
                          // Update existing session
                          const updatedPlayers = [...(session.players || [])];
                          const playerIdx = updatedPlayers.findIndex(p => p.name === player.lastName);
                          
                          if (playerIdx > -1) {
                            updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], status: nextStatus as any };
                          } else {
                            updatedPlayers.push({ name: player.lastName, position: player.position, status: nextStatus as any });
                          }
                          
                          (window as any).saveTrainingSession?.({ ...session, players: updatedPlayers });
                        }
                      };

                      return (
                        <tr key={player.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
                          <td className="p-2 border-r border-slate-200">
                            <div className="text-[10px] font-bold leading-tight text-[#0F172A]">{player.lastName}</div>
                          </td>
                          <td className="p-2 text-center border-r border-slate-200">
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-[#0D9488] border border-slate-200 rounded-xs">{player.position}</span>
                          </td>
                          <td className="p-2 text-center">
                            <button 
                              onClick={handleStatusToggle}
                              disabled={!isEditing}
                              className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center mx-auto rounded-xs border transition-all ${getStatusStyle(status)} ${isEditing ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                            >
                              {status}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 bg-[#F1F5F9] text-[9px] font-bold grid grid-cols-2 gap-2 shrink-0 text-[#0F172A]">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-slate-300 rounded font-black text-[#000000] flex items-center justify-center text-[9px] shadow-2xs">1</div> 1: Training</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-slate-300 rounded font-black text-[#2563EB] flex items-center justify-center text-[9px] shadow-2xs">A</div> A: Aufbau</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-slate-300 rounded font-black text-[#DC2626] flex items-center justify-center text-[9px] shadow-2xs">B</div> B: Verletzt</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-slate-300 rounded font-black text-[#CA8A04] flex items-center justify-center text-[9px] shadow-2xs">K</div> K: Krank</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="p-3.5 border-b border-slate-200 bg-[#F1F5F9] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 text-[#0F172A]">
                    <Gift size={14} className="text-pink-600" /> Geburtstag-Liste
                  </h3>
                  <span className="text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-300 px-2 py-0.5 rounded-full">
                    {filteredBirthdays.length}
                  </span>
                </div>
                {/* Search */}
                <div className="relative mt-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-[10px] font-medium text-[#0F172A] focus:outline-none focus:border-[#0D9488] transition-all placeholder:text-slate-400"
                    value={birthdaySearch}
                    onChange={(e) => setBirthdaySearch(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-white">
                {filteredBirthdays.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-bold">
                    Keine Geburtstage gefunden.
                  </div>
                ) : (
                  filteredBirthdays.map((p) => {
                    // Check if birthday is today
                    const today = new Date();
                    const isToday = p.month === (today.getMonth() + 1) && p.day === today.getDate();
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          const targetYear = currentMonth.getFullYear();
                          const targetDate = new Date(targetYear, p.month - 1, p.day);
                          setCurrentMonth(targetDate);
                          const dateKey = `${targetYear}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
                          setSelectedEventDate(dateKey);
                        }}
                        className={`p-2.5 border rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-between
                          ${isToday ? 'bg-pink-50 border-pink-400 text-pink-950' : 'bg-white border-slate-200 hover:border-[#0D9488] text-[#0F172A]'}`}
                      >
                        <div className="space-y-1 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            {isToday && <span className="animate-bounce">🎂</span>}
                            <div className="text-[10px] font-bold leading-tight text-[#0F172A] truncate">{p.name}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 truncate max-w-[120px]" title={p.categoryLabel}>
                              {p.category === 'player' ? 'Spieler' : p.category === 'coach' ? 'Trainer' : p.category === 'staff' ? 'Funktionär' : p.category === 'medical' ? 'Medizin' : p.categoryLabel}
                            </span>
                            <span className="text-[8px] font-bold text-slate-600">
                              {p.formattedDate}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          {p.birthYear ? (
                            <span className="text-[9px] font-bold text-pink-700 bg-pink-50 border border-pink-300 px-1.5 py-0.5 rounded">
                              wird {new Date().getFullYear() - p.birthYear}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 bg-[#1A1A1A] border-t border-[#2A2A2A] flex justify-between items-center shrink-0">
        <div className="flex gap-4 flex-wrap">
          {Object.entries(typeColors).map(([type, colorClass]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 border ${colorClass} rounded-xs flex items-center justify-center`}>
                {typeIcons[type]}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#C7C7C7]">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-amber-800 bg-amber-950/80 flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 bg-[#FFD54F] rounded-full shadow-[0_0_4px_#FFD54F]" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#FFD54F]">Feiertage</span>
          </div>
        </div>
        <p className="text-[8px] font-bold uppercase opacity-50 text-[#C7C7C7] italic">Drag & Drop zum Verschieben</p>
      </div>

      {/* Event Detail Modal */}
      {selectedEventDate && modalDraft && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-[#F5F5F5] overflow-hidden">
            <div className="bg-[#202020] text-[#F5F5F5] p-4 border-b border-[#2A2A2A] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-xs text-[#10B981] flex items-center gap-2">
                <Dribbble size={16} className="text-[#10B981]" />
                Trainingseinheit / Event bearbeiten
              </h3>
              <button onClick={() => setSelectedEventDate(null)} className="hover:text-[#10B981] text-[#C7C7C7] transition-colors p-1">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[75vh]">
              {/* Quick Presets for 1-Click Training Setup */}
              <div className="space-y-1.5 bg-[#202020] p-3 border border-[#2A2A2A] rounded-xl">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#10B981] flex items-center gap-1">
                  <Sparkles size={12} /> Schnell-Auswahl / Quick Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Training',
                        time: '19:00 - 20:30',
                        activity: 'Haupttraining FC Auggen',
                        location: prev.location || 'Rasenplatz Auggen',
                        treffpunkt: prev.treffpunkt || '18:30 Kabine',
                        opponent: '',
                        training: { ...(prev.training || {}), start: '19:00', end: '20:30' }
                      }) : prev);
                    }}
                    className="p-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#10B981] rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚽</span> <span>Haupttraining 19:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Training',
                        time: '09:00 - 10:15',
                        activity: 'Athletik & Kraft',
                        location: prev.location || 'Kraftraum / Platz',
                        opponent: '',
                        athletik: { ...(prev.athletik || {}), start: '09:00', end: '10:15' }
                      }) : prev);
                    }}
                    className="p-1.5 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-700/50 text-blue-300 rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏋️</span> <span>Athletik 09:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Training',
                        time: '18:15 - 18:45',
                        activity: 'Videoanalyse & Taktik',
                        location: prev.location || 'Besprechungsraum',
                        opponent: '',
                        video: { ...(prev.video || {}), start: '18:15', end: '18:45' }
                      }) : prev);
                    }}
                    className="p-1.5 bg-teal-950/50 hover:bg-teal-900/60 border border-teal-700/50 text-teal-300 rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🎥</span> <span>Videoanalyse</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Testspiel',
                        time: '19:00',
                        activity: 'Testspiel',
                        location: prev.location || 'Sportplatz Auggen',
                        treffpunkt: '17:45'
                      }) : prev);
                    }}
                    className="p-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 text-amber-300 rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🚩</span> <span>Testspiel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Pflichtspiel',
                        time: '15:00',
                        activity: 'Verbandsliga Match',
                        location: prev.location || 'Sportplatz Auggen',
                        treffpunkt: '13:30 Kabine'
                      }) : prev);
                    }}
                    className="p-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏆</span> <span>Pflichtspiel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDraft(prev => prev ? ({
                        ...prev,
                        type: 'Frei',
                        time: '',
                        activity: 'Trainingsfrei / Regeneration',
                        location: '',
                        treffpunkt: '',
                        opponent: '',
                        ergebnis: ''
                      }) : prev);
                    }}
                    className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 rounded-lg text-[9px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🧘</span> <span>Trainingsfrei</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Datum</label>
                  <input 
                    type="date"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    value={selectedEventDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedEventDate(e.target.value);
                      }
                    }}
                  />
                  <div className="text-[9px] font-medium text-[#94A3B8] mt-1">
                    {new Date(selectedEventDate).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Saisonphase</label>
                  <select 
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    value={modalDraft.phase || 'season'}
                    onChange={(e) => updateModalDraft('phase', e.target.value)}
                  >
                    <option value="summer">Sommervorbereitung</option>
                    <option value="season">Saison</option>
                    <option value="winter">Wintervorbereitung</option>
                    <option value="break">Pause</option>
                  </select>
                </div>
              </div>

              {/* Geburtstag-Anzeige im Modal */}
              {(() => {
                const dayBirthdays = getBirthdaysForDate(selectedEventDate);
                if (dayBirthdays.length === 0) return null;
                return (
                  <div className="bg-pink-950/70 border border-pink-800/80 p-3 space-y-1 rounded-xl">
                    <div className="text-[9px] font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                      <Gift size={12} className="text-pink-400 fill-pink-400" />
                      Geburtstage an diesem Tag!
                    </div>
                    <div className="space-y-1.5">
                      {dayBirthdays.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-pink-200">
                          <span className="flex items-center gap-1">
                            🎂 <strong className="text-pink-100">{p.name}</strong> ({p.categoryLabel})
                          </span>
                          {p.age !== undefined && (
                            <span className="bg-pink-900 text-pink-200 border border-pink-700 text-[9px] px-1.5 py-0.5 rounded font-black">
                              wird {p.age} Jahre alt!
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Typ / Art des Termins</label>
                  <select 
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    value={modalDraft.type || 'Training'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setModalDraft(prev => {
                        if (!prev) return prev;
                        let newTime = prev.time;
                        let newActivity = prev.activity;
                        let newLocation = prev.location;
                        let newOpponent = prev.opponent;
                        if (newType === 'Training') {
                          if (!newTime || newTime === '') newTime = '19:00 - 20:30';
                          if (!newActivity || newActivity === 'Trainingsfrei / Regeneration' || newActivity === '') newActivity = 'Haupttraining FC Auggen';
                          if (!newLocation || newLocation === '') newLocation = 'Rasenplatz Auggen';
                          newOpponent = '';
                        } else if (newType === 'Frei') {
                          newTime = '';
                          newActivity = 'Trainingsfrei / Regeneration';
                          newOpponent = '';
                          newLocation = '';
                        } else if (newType === 'Testspiel') {
                          if (!newTime || newTime === '') newTime = '19:00';
                          if (!newActivity || newActivity === 'Trainingsfrei / Regeneration' || newActivity === '') newActivity = 'Testspiel';
                        } else if (newType === 'Pflichtspiel') {
                          if (!newTime || newTime === '') newTime = '15:00';
                          if (!newActivity || newActivity === 'Trainingsfrei / Regeneration' || newActivity === '') newActivity = 'Verbandsliga Match';
                        }
                        return {
                          ...prev,
                          type: newType,
                          time: newTime,
                          activity: newActivity,
                          location: newLocation,
                          opponent: newOpponent
                        };
                      });
                    }}
                  >
                    {Object.keys(typeColors).map(type => (
                      <option key={type} value={type} className="bg-[#202020] text-[#F5F5F5]">{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Uhrzeit / Zeitfenster</label>
                  <input 
                    type="text"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    placeholder="z.B. 19:00 - 20:30"
                    value={modalDraft.time || ''}
                    onChange={(e) => updateModalDraft('time', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Fokus & Thema der Einheit</label>
                  <input 
                    type="text"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    placeholder="z.B. Taktik & Umschaltspiel"
                    value={modalDraft.activity || ''}
                    onChange={(e) => updateModalDraft('activity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Austragungsort / Platz</label>
                  <input 
                    type="text"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    placeholder="z.B. Rasenplatz Auggen"
                    value={modalDraft.location || ''}
                    onChange={(e) => updateModalDraft('location', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Treffpunkt & Anreise</label>
                  <input 
                    type="text"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    placeholder="z.B. 18:30 Uhr Kabine"
                    value={modalDraft.treffpunkt || ''}
                    onChange={(e) => updateModalDraft('treffpunkt', e.target.value)}
                  />
                </div>
                {(modalDraft.type === 'Testspiel' || modalDraft.type === 'Pflichtspiel' || modalDraft.type === 'Spiel') && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Gegner / Verein</label>
                    <input 
                      type="text"
                      className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                      placeholder="Gegnerischer Verein"
                      value={modalDraft.opponent || ''}
                      onChange={(e) => updateModalDraft('opponent', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {(modalDraft.type === 'Testspiel' || modalDraft.type === 'Pflichtspiel' || modalDraft.type === 'Spiel') && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Ergebnis</label>
                  <input 
                    type="text"
                    className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                    placeholder="z.B. 3:1"
                    value={modalDraft.ergebnis || ''}
                    onChange={(e) => updateModalDraft('ergebnis', e.target.value)}
                  />
                </div>
              )}

              {/* Detailed Sessions Section */}
              <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#10B981] flex items-center gap-1.5">
                  <Clock size={14} /> Tagesstruktur & Einheiten
                </h4>
                {[
                  { label: 'Athletik / Kraft', key: 'athletik', defaultTime: '09:00' },
                  { label: 'Vormittagseinheit', key: 'vormittag', defaultTime: '10:30' },
                  { label: 'Individualtraining', key: 'individual', defaultTime: '14:00' },
                  { label: 'Videoanalyse / Taktik', key: 'video', defaultTime: '18:15' },
                  { label: 'Haupttraining (Feld)', key: 'training', defaultTime: '19:00' }
                ].map(session => {
                  const sObj = (modalDraft as any)[session.key] || {};
                  return (
                    <div key={session.key} className="p-3 bg-[#202020] border border-[#2A2A2A] rounded-xl space-y-2">
                      <div className="text-[10px] font-black uppercase text-[#C7C7C7] flex justify-between items-center">
                        <span>{session.label}</span>
                        {sObj?.start ? (
                          <span className="text-[8px] bg-emerald-950 text-[#00D47A] border border-emerald-800 px-1.5 py-0.2 rounded font-black">Aktiv</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateModalDraft(`${session.key}.start`, session.defaultTime)}
                            className="text-[8px] text-[#10B981] hover:underline font-bold"
                          >
                            + Aktivieren ({session.defaultTime})
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text"
                          placeholder="Start (z.B. 19:00)"
                          className="p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-[10px] font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                          value={sObj?.start || ''}
                          onChange={(e) => updateModalDraft(`${session.key}.start`, e.target.value)}
                        />
                        <input 
                          type="text"
                          placeholder="Ende (z.B. 20:30)"
                          className="p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-[10px] font-bold uppercase text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                          value={sObj?.end || ''}
                          onChange={(e) => updateModalDraft(`${session.key}.end`, e.target.value)}
                        />
                      </div>
                      <input 
                        type="text"
                        placeholder="Anmerkungen / Trainingsform..."
                        className="w-full p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-[10px] font-medium text-[#F5F5F5] focus:outline-none focus:border-[#10B981]"
                        value={sObj?.notes || ''}
                        onChange={(e) => updateModalDraft(`${session.key}.notes`, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Feiertags-Verwaltung */}
              <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-[#FFD54F]">
                    <Flag size={14} className="text-[#FFD54F]" />
                    Feiertags- & Sonderregelung (BW)
                  </h4>
                  {getDayHolidayName(selectedEventDate) && (
                    <span className="text-[7px] bg-amber-950 text-[#FFD54F] border border-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      Aktiv
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#C7C7C7] bg-[#202020] p-2.5 border border-[#2A2A2A] rounded-xl">
                    {(() => {
                      const calcH = getHolidays(parseInt(selectedEventDate.split('-')[0], 10))[selectedEventDate];
                      const customH = modalDraft.customHolidayName !== undefined ? modalDraft.customHolidayName : yearlyPlan[selectedEventDate]?.customHolidayName;
                      if (customH === "") {
                        return (
                          <span>
                            Regulärer Feiertag (<span className="line-through">{calcH}</span>) wurde für diesen Tag <strong className="text-[#FF4C4C]">deaktiviert</strong>.
                          </span>
                        );
                      } else if (customH) {
                        return (
                          <span>
                            Benutzerdefinierter Feiertag: <strong className="text-[#FFD54F]">{customH}</strong> {calcH ? `(ersetzt regulären Feiertag: ${calcH})` : ''}
                          </span>
                        );
                      } else if (calcH) {
                        return (
                          <span>
                            Regulärer Feiertag in BW: <strong className="text-[#FFD54F]">{calcH}</strong>
                          </span>
                        );
                      } else {
                        return <span>Kein gesetzlicher Feiertag an diesem Tag.</span>;
                      }
                    })()}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-[#C7C7C7]">Feiertagsname ändern / hinzufügen</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          className="flex-1 p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F] placeholder-[#888888]"
                          placeholder={getHolidays(parseInt(selectedEventDate.split('-')[0], 10))[selectedEventDate] || "z.B. Vereinsjubiläum"}
                          value={modalDraft.customHolidayName !== undefined ? (modalDraft.customHolidayName || '') : (yearlyPlan[selectedEventDate]?.customHolidayName || '')}
                          onChange={(e) => updateModalDraft('customHolidayName', e.target.value)}
                        />
                        {(modalDraft.customHolidayName !== undefined && modalDraft.customHolidayName !== null) && (
                          <button
                            type="button"
                            onClick={() => updateModalDraft('customHolidayName', null)}
                            className="px-2.5 py-1 bg-[#2A2A2A] hover:bg-[#333333] text-[#F5F5F5] text-[9px] font-black uppercase tracking-wider transition-colors rounded-lg border border-[#3A3A3A]"
                            title="Auf Standard zurücksetzen"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Toggle Buttons */}
                    {(() => {
                      const calcH = getHolidays(parseInt(selectedEventDate.split('-')[0], 10))[selectedEventDate];
                      const customH = modalDraft.customHolidayName !== undefined ? modalDraft.customHolidayName : yearlyPlan[selectedEventDate]?.customHolidayName;
                      if (calcH && customH !== "") {
                        return (
                          <button
                            type="button"
                            onClick={() => updateModalDraft('customHolidayName', '')}
                            className="w-full py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 text-[9px] font-black uppercase tracking-wider transition-colors rounded-lg text-center cursor-pointer"
                          >
                            Feiertag für diesen Tag deaktivieren
                          </button>
                        );
                      } else if (calcH && customH === "") {
                        return (
                          <button
                            type="button"
                            onClick={() => updateModalDraft('customHolidayName', null)}
                            className="w-full py-1.5 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800 text-blue-300 text-[9px] font-black uppercase tracking-wider transition-colors rounded-lg text-center cursor-pointer"
                          >
                            Regulären Feiertag wieder aktivieren
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] block mb-1">Trainingsnotizen & Anweisungen</label>
                <textarea 
                  className="w-full h-24 p-3 bg-[#202020] border border-[#2A2A2A] rounded-xl text-sm font-medium text-[#F5F5F5] focus:outline-none focus:border-[#10B981] resize-none"
                  placeholder="Details zur Einheit, Trainingsinhalte, Bälle/Material, Notizen..."
                  value={modalDraft.content || ''}
                  onChange={(e) => updateModalDraft('content', e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 bg-[#202020] border-t border-[#2A2A2A] flex justify-between items-center gap-2">
              <button 
                type="button"
                disabled={isSavingModal}
                onClick={handleDeleteModalDay}
                className="px-3.5 py-2 bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 text-[10px] font-black uppercase tracking-wider hover:bg-[#EF4444] hover:text-white transition-all flex items-center gap-1.5 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={13} /> <span>Einheit löschen</span>
              </button>
              
              <button 
                type="button"
                disabled={isSavingModal}
                onClick={handleSaveModal}
                className="px-5 py-2 bg-[#10B981] text-[#0A0E17] font-black text-xs uppercase tracking-wider hover:bg-[#059669] transition-all flex items-center gap-1.5 rounded-lg shadow-md cursor-pointer ml-auto disabled:opacity-50"
              >
                <Check size={14} /> <span>{isSavingModal ? 'Wird gespeichert...' : 'Speichern & Schließen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl flex flex-col text-[#F5F5F5] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#202020] text-[#F5F5F5] flex justify-between items-center border-b border-[#2A2A2A]">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#F5F5F5]">
                <Calendar size={16} className="text-[#FFD54F]" />
                Saison-Planung generieren
              </h2>
              <button 
                onClick={() => setShowGenModal(false)}
                className="hover:text-[#FF4C4C] text-[#C7C7C7] transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Zeitraum */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7]">Zeitraum</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#888888]">Start</span>
                    <input 
                      type="date"
                      className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F]"
                      value={genOptions.startDate}
                      onChange={(e) => setGenOptions(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#888888]">Ende</span>
                    <input 
                      type="date"
                      className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F]"
                      value={genOptions.endDate}
                      onChange={(e) => setGenOptions(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Trainings-Wochentage */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7]">Trainings-Wochentage</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Montag', value: 1 },
                    { label: 'Dienstag', value: 2 },
                    { label: 'Mittwoch', value: 3 },
                    { label: 'Donnerstag', value: 4 },
                    { label: 'Freitag', value: 5 },
                    { label: 'Samstag', value: 6 },
                    { label: 'Sonntag', value: 0 },
                  ].map(day => {
                    const isChecked = genOptions.trainingDays.includes(day.value);
                    return (
                      <label 
                        key={day.value}
                        className={`flex items-center gap-2 p-2 border rounded-xl text-[10px] font-black uppercase cursor-pointer select-none transition-all
                          ${isChecked ? 'bg-amber-950/60 border-[#FFD54F] text-[#FFD54F]' : 'bg-[#202020] border-[#2A2A2A] hover:border-[#FFD54F] text-[#C7C7C7]'}`}
                      >
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => toggleTrainingDay(day.value)}
                        />
                        <div className={`w-3.5 h-3.5 border border-current flex items-center justify-center text-[8px] rounded ${isChecked ? 'bg-[#FFD54F] text-[#0F0F0F]' : 'bg-[#1A1A1A]'}`}>
                          {isChecked && '✓'}
                        </div>
                        {day.label}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[8px] font-medium text-[#888888] italic">Nicht ausgewählte Wochentage werden im Jahresplan automatisch als freie Tage ("Spielfrei") markiert.</p>
              </div>

              {/* Feiertage */}
              <div className="space-y-2 bg-amber-950/40 p-3 border border-amber-800/80 rounded-xl">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#FFD54F]">Feiertage (Baden-Württemberg)</label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    className="rounded border-[#2A2A2A] text-[#FFD54F] focus:ring-[#FFD54F]"
                    checked={genOptions.skipHolidays}
                    onChange={(e) => setGenOptions(prev => ({ ...prev, skipHolidays: e.target.checked }))}
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F5F5F5]">Feiertage als freie Tage markieren</span>
                </label>
                <p className="text-[8px] font-medium text-[#C7C7C7] italic">Überspringt automatisch das Generieren von Einheiten an Feiertagen und markiert sie als "Frei".</p>
              </div>

              {/* Winterpause */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#C7C7C7]">Winterpause</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#888888]">Pause von</span>
                    <input 
                      type="date"
                      className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F]"
                      value={genOptions.breakStart}
                      onChange={(e) => setGenOptions(prev => ({ ...prev, breakStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#888888]">Pause bis</span>
                    <input 
                      type="date"
                      className="w-full p-2 bg-[#202020] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F]"
                      value={genOptions.breakEnd}
                      onChange={(e) => setGenOptions(prev => ({ ...prev, breakEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#202020] border-t border-[#2A2A2A] flex justify-end gap-2">
              <button 
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 border border-[#2A2A2A] rounded-lg text-[10px] font-black uppercase tracking-widest text-[#C7C7C7] hover:bg-[#2A2A2A] transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={async () => {
                  setShowGenModal(false);
                  if ((window as any).generateSeasonSessions) {
                    await (window as any).generateSeasonSessions(genOptions);
                  }
                }}
                className="px-6 py-2 bg-[#FFD54F] text-[#0F0F0F] text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-[#ffe082] transition-all"
              >
                Generieren starten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

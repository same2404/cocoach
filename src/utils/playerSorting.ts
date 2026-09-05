import { Player, ScoutingEntry } from '../types';

export const getPositionOrder = (pos: string, category?: string): number => {
  const p = pos.toUpperCase();
  const cat = (category || 'player').toLowerCase();
  
  if (cat === 'player' || cat === 'spieler') {
    if (p.includes('TW')) return 1;
    if (p.includes('IV') || p.includes('RV') || p.includes('LV') || p.includes('AV') || p.includes('RE') || p.includes('LI') || p.includes('ABWEHR')) return 2;
    if (p.includes('6') || p.includes('8') || p.includes('10') || p.includes('MF') || p.includes('ZM') || p.includes('OM') || p.includes('DM') || p.includes('RM') || p.includes('LM') || p.includes('FA') || p.includes('MITTELFELD') || p.includes('A.L') || p.includes('A.R')) return 3;
    if (p.includes('ST') || p.includes('RA') || p.includes('LA') || p.includes('RW') || p.includes('LW') || p.includes('OFF') || p.includes('ANGRIFF') || p.includes('STURM')) return 4;
    return 5;
  }

  // Staff/Official hierarchy:
  if (p.includes('CHEF TRAINER') || p.includes('TRAINER')) return 10;
  if (p.includes('CO-TRAINER') || (p.includes('CO TRAINER') && !p.includes('ATHLETIK'))) return 11;
  if (p.includes('ATHLETIK')) return 12;
  if (p.includes('TORWART TRAINER') || p.includes('TW TRAINER') || p.includes('TW-TRAINER')) return 13;
  if (p.includes('PHYSIO')) return 14;
  if (p.includes('BETREUER') || p.includes('TEAM MANAGER') || p.includes('TEAMMANAGER') || p.includes('MANAGER')) return 15;
  if (p.includes('FUNKTIONÄR')) return 16;
  
  return 20;
};

export const sortPlayers = <T extends { lastName?: string; firstName?: string; name?: string; category?: string; number?: number; position?: string }>(list: T[]): T[] => {
  const categoryOrder: Record<string, number> = {
    // Players (Main priority for attendance/lists)
    player: 1,
    spieler: 1,
    
    // Coaches
    trainer: 2,
    'co-trainer': 2,
    'tw-trainer': 2,
    athletik: 2,
    coach: 2,
    
    // Staff/Medical (Funktionsteam)
    physio: 3,
    betreuer: 3,
    teammanager: 3,
    funktionär: 3,
    staff: 3,
    medical: 3,
    medizinisch: 3
  };

  return [...list].sort((a, b) => {
    const catA = (a.category || 'player').toLowerCase();
    const catB = (b.category || 'player').toLowerCase();
    
    // Sort by category first
    if (catA !== catB) {
      const orderA = categoryOrder[catA] || 5;
      const orderB = categoryOrder[catB] || 5;
      if (orderA !== orderB) return orderA - orderB;
    }
    
    // Use position hierarchy
    const posA = a.position || '';
    const posB = b.position || '';
    const orderA = getPositionOrder(posA, catA);
    const orderB = getPositionOrder(posB, catB);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Within same category and position order, sort by name
    const lastA = a.lastName || (a.name ? a.name.split(' ').slice(1).join(' ') : '') || '';
    const lastB = b.lastName || (b.name ? b.name.split(' ').slice(1).join(' ') : '') || '';
    
    if (lastA.localeCompare(lastB) !== 0) {
      return lastA.localeCompare(lastB);
    }

    const firstA = a.firstName || (a.name ? a.name.split(' ')[0] : '') || '';
    const firstB = b.firstName || (b.name ? b.name.split(' ')[0] : '') || '';
    
    return firstA.localeCompare(firstB);
  });
};

export const isPlayer = (p: { category?: string; position?: string; number?: number }): boolean => {
  const cat = (p.category || 'player').toLowerCase();
  
  if (cat === 'player' || cat === 'spieler') {
    return true;
  }

  const nonPlayerCategories = [
    'coach', 'trainer', 'co-trainer', 'tw-trainer', 'athletik',
    'staff', 'funktionär', 'physio', 'betreuer', 'teammanager', 
    'medical', 'medizinisch', 'official'
  ];
  
  if (nonPlayerCategories.includes(cat)) {
    // If they have a jersey number > 0, they are part of the active squad
    if (p.number && p.number > 0) return true;
    return false;
  }

  return true; 
};

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Club } from '../types';
import { setClubPrefix, setClubReadOnly } from '../hooks/useCollectionSync';
import { setClubDocPrefix, setClubDocReadOnly } from '../hooks/useSyncedState';

const FC_AUGGEN_DEMO: Club = {
  id: 'fc-auggen',
  name: 'FC Auggen e.V.',
  shortName: 'FCA',
  logo: '/logos/fc-auggen.png',
  fbTeamId: '011MIDB4V4000000VTVG0001VTR8C1K7',
  league: 'Verbandsliga Südbaden',
  region: 'Südbaden',
  isDemo: true,
  createdAt: Date.now(),
  status: 'active',
};

const SC_SAND_DEFAULT: Club = {
  id: 'sc-sand-1946',
  name: 'SC Sand 1946',
  shortName: 'SCS',
  league: '2. Frauen-Bundesliga',
  region: 'Baden-Württemberg',
  isDemo: false,
  createdAt: Date.now(),
  status: 'active',
};

const CLUBS_STORAGE_KEY = 'cocoach_clubs';
const ACTIVE_CLUB_KEY = 'cocoach_active_club';

function loadClubs(): Club[] {
  try {
    const raw = localStorage.getItem(CLUBS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Club[];
      const hasAuggen = parsed.some(c => c.id === 'fc-auggen');
      if (!hasAuggen) parsed.unshift(FC_AUGGEN_DEMO);
      const hasSCSand = parsed.some(c => c.id === 'sc-sand-1946');
      if (!hasSCSand) parsed.push(SC_SAND_DEFAULT);
      return parsed;
    }
  } catch {}
  return [FC_AUGGEN_DEMO, SC_SAND_DEFAULT];
}

function loadActiveClubId(): string {
  return localStorage.getItem(ACTIVE_CLUB_KEY) || 'fc-auggen';
}

interface ClubContextType {
  clubs: Club[];
  activeClub: Club;
  activeClubId: string;
  setActiveClubId: (id: string) => void;
  addClub: (club: Omit<Club, 'id' | 'createdAt' | 'status'>) => Club;
  updateClub: (id: string, updates: Partial<Club>) => void;
  removeClub: (id: string) => void;
  isDemo: boolean;
  isReadOnly: boolean;
  getCollectionPath: (baseName: string) => string;
}

const ClubContext = createContext<ClubContextType | null>(null);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(loadClubs);
  const [activeClubId, setActiveClubIdState] = useState<string>(loadActiveClubId);

  const activeClub = clubs.find(c => c.id === activeClubId) || clubs[0] || FC_AUGGEN_DEMO;
  const isDemo = activeClub.isDemo;
  const isReadOnly = activeClub.isDemo && activeClub.id !== 'fc-auggen';

  // Set collection/document prefixes SYNCHRONOUSLY before any render to ensure
  // useCollectionSync picks up the correct prefix immediately
  setClubPrefix(activeClub.id, activeClub.isDemo);
  setClubDocPrefix(activeClub.id, activeClub.isDemo);
  // FC Auggen may write while keeping the (empty) demo prefix -> no data loss
  if (activeClub.id === 'fc-auggen') {
    setClubReadOnly(false);
    setClubDocReadOnly(false);
  }

  useEffect(() => {
    localStorage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs));
  }, [clubs]);

  const setActiveClubId = useCallback((id: string) => {
    setActiveClubIdState(id);
    localStorage.setItem(ACTIVE_CLUB_KEY, id);
  }, []);

  const addClub = useCallback((data: Omit<Club, 'id' | 'createdAt' | 'status'>): Club => {
    const id = data.name.toLowerCase()
      .replace(/[^a-z0-9äöüß]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const newClub: Club = {
      ...data,
      id,
      createdAt: Date.now(),
      status: 'setup',
      isDemo: false,
    };
    setClubs(prev => [...prev, newClub]);
    return newClub;
  }, []);

  const updateClub = useCallback((id: string, updates: Partial<Club>) => {
    setClubs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const removeClub = useCallback((id: string) => {
    if (id === 'fc-auggen') return;
    setClubs(prev => prev.filter(c => c.id !== id));
    if (activeClubId === id) {
      setActiveClubIdState('fc-auggen');
      localStorage.setItem(ACTIVE_CLUB_KEY, 'fc-auggen');
    }
  }, [activeClubId]);

  const getCollectionPath = useCallback((baseName: string): string => {
    if (activeClub.isDemo) return baseName;
    return `${baseName}_${activeClub.id}`;
  }, [activeClub]);

  return (
    <ClubContext.Provider value={{
      clubs,
      activeClub,
      activeClubId,
      setActiveClubId,
      addClub,
      updateClub,
      removeClub,
      isDemo,
      isReadOnly,
      getCollectionPath,
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub(): ClubContextType {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}

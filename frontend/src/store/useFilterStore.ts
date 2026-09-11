import { create } from 'zustand';
import type { AnalyzedLocationCandidate, CandidateZone, PredictionResponse } from '../types/api';

export type NavigationTab =
  | 'workbench'
  | 'reserves'
  | 'forecast'
  | 'equipment'
  | 'simulator'
  | 'prescriptions'
  | 'comparison'
  | 'space'
  | 'spectral'
  | 'change'
  | 'verification'
  | 'assistant'
  | 'registry';

interface FilterState {
  state: string;
  district: string;
  search: string;
  selectedDepositId: string | null;
  selectedMoilMineId: string;
  mapCoordinate: { lat: number; lng: number } | null;
  predictionOpen: boolean;
  prediction: PredictionResponse | null;
  theme: 'dark' | 'light';
  candidates: AnalyzedLocationCandidate[];
  selectedCandidateZone: CandidateZone | null;
  activeTab: NavigationTab;
  reportModalOpen: boolean;
  reportTargetZoneId: string;
  modelAuditModalOpen: boolean;
  setFilter: (key: 'state' | 'district' | 'search', value: string) => void;
  selectDeposit: (id: string | null) => void;
  setSelectedMoilMineId: (id: string) => void;
  setMapCoordinate: (coordinate: { lat: number; lng: number } | null) => void;
  setPredictionOpen: (open: boolean) => void;
  setPrediction: (prediction: PredictionResponse | null) => void;
  toggleTheme: () => void;
  addCandidate: (candidate: AnalyzedLocationCandidate) => void;
  removeCandidate: (id: string) => void;
  clearCandidates: () => void;
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedCandidateZone: (zone: CandidateZone | null) => void;
  setReportModalOpen: (open: boolean, zoneId?: string) => void;
  setModelAuditModalOpen: (open: boolean) => void;
  reset: () => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('imae_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

const initial = {
  state: '',
  district: '',
  search: '',
  selectedDepositId: null,
  selectedMoilMineId: 'moil-balaghat',
  mapCoordinate: null,
  predictionOpen: false,
  prediction: null,
  theme: getInitialTheme(),
  candidates: [] as AnalyzedLocationCandidate[],
  selectedCandidateZone: null as CandidateZone | null,
  activeTab: 'workbench' as NavigationTab,
  reportModalOpen: false,
  reportTargetZoneId: 'CZ-01',
  modelAuditModalOpen: false,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initial,
  setFilter: (key, value) =>
    set((current) => {
      if (key === 'state') return { ...current, state: value, district: '' };
      if (key === 'district') return { ...current, district: value };
      return { ...current, search: value };
    }),
  selectDeposit: (selectedDepositId) => set({ selectedDepositId }),
  setMapCoordinate: (mapCoordinate) => set({ mapCoordinate }),
  setPredictionOpen: (predictionOpen) => set({ predictionOpen }),
  setPrediction: (prediction) => set({ prediction }),
  toggleTheme: () =>
    set((current) => {
      const nextTheme = current.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('imae_theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
      return { theme: nextTheme };
    }),
  addCandidate: (candidate) =>
    set((current) => {
      const exists = current.candidates.some(
        (c) =>
          Math.abs(c.latitude - candidate.latitude) < 0.001 &&
          Math.abs(c.longitude - candidate.longitude) < 0.001
      );
      if (exists) return current;
      return { candidates: [candidate, ...current.candidates].slice(0, 10) };
    }),
  removeCandidate: (id) =>
    set((current) => ({
      candidates: current.candidates.filter((c) => c.id !== id),
    })),
  clearCandidates: () => set({ candidates: [] }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedCandidateZone: (selectedCandidateZone) => set({ selectedCandidateZone }),
  setSelectedMoilMineId: (selectedMoilMineId) => set({ selectedMoilMineId }),
  setReportModalOpen: (reportModalOpen, zoneId) =>
    set((current) => ({
      reportModalOpen,
      reportTargetZoneId: zoneId ?? current.reportTargetZoneId,
    })),
  setModelAuditModalOpen: (modelAuditModalOpen) => set({ modelAuditModalOpen }),
  reset: () => set(initial),
}));

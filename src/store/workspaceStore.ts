import { create } from 'zustand';

interface WorkspaceState {
  selectedEntityId: string | null;
  activeCaseId: string | null;
  searchQuery: string;
  setSelectedEntityId: (id: string | null) => void;
  setActiveCaseId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedEntityId: null,
  activeCaseId: 'case-01', // Default mock case ID
  searchQuery: '',
  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
  setActiveCaseId: (id) => set({ activeCaseId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));

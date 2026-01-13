import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RepositoryInfo } from '@/lib/tauri';

interface AppState {
  // State
  currentRepo: RepositoryInfo | null;
  selectedWorktreePath: string | null;
  recentRepos: string[];

  // Actions
  setCurrentRepo: (repo: RepositoryInfo | null) => void;
  selectWorktree: (path: string | null) => void;
  addRecentRepo: (path: string) => void;
  clearRecentRepos: () => void;
}

const MAX_RECENT_REPOS = 10;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentRepo: null,
      selectedWorktreePath: null,
      recentRepos: [],

      setCurrentRepo: (repo) =>
        set({
          currentRepo: repo,
          selectedWorktreePath: null,
        }),

      selectWorktree: (path) => set({ selectedWorktreePath: path }),

      addRecentRepo: (path) => {
        const { recentRepos } = get();
        const filtered = recentRepos.filter((p) => p !== path);
        const updated = [path, ...filtered].slice(0, MAX_RECENT_REPOS);
        set({ recentRepos: updated });
      },

      clearRecentRepos: () => set({ recentRepos: [] }),
    }),
    {
      name: 'worktree-manager-storage',
      partialize: (state) => ({
        recentRepos: state.recentRepos,
      }),
    }
  )
);

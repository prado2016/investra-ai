import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Portfolio } from '../types/index.js';

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  setPortfolios: (_portfolios: Portfolio[]) => void;
  setActivePortfolio: (_id: string) => void;
  activePortfolio: () => Portfolio | undefined;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      portfolios: [],
      activePortfolioId: null,
      setPortfolios: (portfolios) => {
        const current = get().activePortfolioId;
        // Auto-select default or first if current is gone
        const stillExists = portfolios.some((p) => p.id === current);
        const defaultP = portfolios.find((p) => p.isDefault) ?? portfolios[0];
        set({
          portfolios,
          activePortfolioId: stillExists ? current : (defaultP?.id ?? null),
        });
      },
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
      activePortfolio: () => {
        const { portfolios, activePortfolioId } = get();
        return portfolios.find((p) => p.id === activePortfolioId);
      },
    }),
    { name: 'investra-portfolio', partialize: (s) => ({ activePortfolioId: s.activePortfolioId }) }
  )
);

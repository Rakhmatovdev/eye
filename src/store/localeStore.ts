import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'uz' | 'ru' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// Zustand's own `persist` middleware (already a transitive dep via zustand,
// no new package) — swaps out the localStorage-glue authStore hand-rolls,
// since locale doesn't need the custom user+token bundling that store does.
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'uz',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'nexus.locale' }
  )
);

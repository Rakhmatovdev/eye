'use client';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '../store/themeStore';
import { useLocaleStore } from '../store/localeStore';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';

// Keeps <html class="light"> in sync with the theme store after mount
// (the inline script in layout.tsx's <head> already set it pre-hydration
// to avoid a flash; this effect handles later toggles + store rehydration).
function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);
  const locale = useLocaleStore((state) => state.locale);
  React.useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);
  React.useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}

// Runs once at app start to learn whether a valid session cookie exists —
// there's no token in localStorage to read synchronously anymore (the
// access/refresh tokens are HttpOnly, invisible to JS by design), so
// `isAuthenticated` can't be known until this resolves. app/page.tsx (and
// anything else gating on `hasCheckedSession`) waits on this before
// redirecting, to avoid a flash-redirect to /login for an already-logged-in
// user. A failing /auth/me here just means "not logged in" — the response
// interceptor's 401 handling (apiClient.ts) already calls logout() in that
// case, so this only needs to handle the success path.
function SessionBootstrap() {
  React.useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((user) => {
        if (!cancelled) useAuthStore.getState().login(user);
      })
      .catch(() => {
        if (!cancelled) useAuthStore.getState().logout();
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      })
  );

  React.useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id || (previous.isAuthenticated && !state.isAuthenticated)) queryClient.clear();
  }), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <SessionBootstrap />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '13px' },
        }}
      />
    </QueryClientProvider>
  );
}

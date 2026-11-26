'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import Brand from '../components/common/Brand';
import { useT } from '../lib/i18n';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated, hasCheckedSession } = useAuthStore();

  useEffect(() => {
    // Wait for the app-root session bootstrap (see providers.tsx) to resolve
    // before deciding — isAuthenticated starts false even for a logged-in
    // user until GET /auth/me confirms it, since there's no token in
    // localStorage to read synchronously anymore.
    if (!hasCheckedSession) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, hasCheckedSession, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col gap-8 items-center justify-center">
      <Brand caption={t('workspace_brand_caption')} />
      <p role="status" className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><Loader2 size={17} className="animate-spin" />{t('auth_session_loading')}</p>
    </div>
  );
}

'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Search,
  Share2,
  Map,
  Clock,
  FolderLock,
  LogOut,
  ShieldAlert,
  Cctv,
  Crosshair,
  Bot,
  Settings,
  Bell,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLocaleStore, type Locale } from '../../store/localeStore';
import { useT } from '../../lib/i18n';
import { useHasMounted } from '../../lib/useHasMounted';
import { useLiveFeed } from '../../lib/useLiveFeed';
import { alertsApi } from '../../lib/api';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const LOCALES: Locale[] = ['uz', 'ru', 'en'];

function LocaleSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div className="flex items-center gap-0.5 bg-gray-950/60 border border-gray-800/60 rounded-lg p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wide transition-all ${
            locale === l ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-600 hover:text-gray-300'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// Bell with an unacknowledged-alert badge. Unread count = the server's
// current unacknowledged total (fetched once on mount) plus any `alert` WS
// frames received live since — kept as two separate numbers (rather than one
// state overwritten by both sources) so a live arrival can't race a slightly
// stale initial fetch and get clobbered. A brief toast flashes per new live
// alert, reusing the app's existing react-hot-toast (already mounted in
// providers.tsx) rather than adding a new dependency.
function AlertBell() {
  const router = useRouter();
  const t = useT();
  const { alerts: liveAlerts } = useLiveFeed();
  const [baseUnread, setBaseUnread] = useState<number | null>(null);
  const [liveIncrement, setLiveIncrement] = useState(0);
  const lastSeenIdRef = useRef<string | undefined>(undefined);

  const countQ = useQuery({
    queryKey: ['alerts-unread-count'],
    queryFn: () => alertsApi.list({ acknowledged: false, limit: 1 }),
    staleTime: 15_000,
    retry: false,
  });

  useEffect(() => {
    if (countQ.data) setBaseUnread(countQ.data.total);
  }, [countQ.data]);

  useEffect(() => {
    if (liveAlerts.length === 0) return;
    const top = liveAlerts[0];
    if (top.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = top.id;
    setLiveIncrement((n) => n + 1);
    toast(`${t('alerts_new_toast')} ${top.title}`, { icon: '🔔' });
  }, [liveAlerts, t]);

  const unreadCount = (baseUnread ?? 0) + liveIncrement;

  return (
    <button
      onClick={() => router.push('/alerts')}
      title={t('alerts_bell_title')}
      className="relative w-9 h-9 rounded-xl bg-gray-900/60 border border-gray-800/60 hover:border-cyan-500/40 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-all"
    >
      <Bell size={16} />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold font-mono flex items-center justify-center leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const t = useT();
  // See useHasMounted.ts: `user` is seeded synchronously from localStorage on
  // the client, so gating on mount avoids a server/client hydration mismatch.
  const hasMounted = useHasMounted();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const navItems = [
    { name: t('nav_home'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('nav_search'), path: '/search', icon: Search },
    { name: t('nav_alerts'), path: '/alerts', icon: ShieldAlert },
    { name: t('nav_watchlist'), path: '/watchlist', icon: Eye },
    { name: t('nav_graph'), path: '/graph/case-01', icon: Share2 },
    { name: t('nav_map'), path: '/map', icon: Map },
    { name: t('nav_surveillance'), path: '/surveillance', icon: Cctv },
    { name: t('nav_command'), path: '/command', icon: Crosshair },
    { name: t('nav_assistant'), path: '/assistant', icon: Bot },
    { name: t('nav_patterns'), path: '/patterns', icon: Sparkles },
    { name: t('nav_timeline'), path: '/timeline', icon: Clock },
    { name: t('nav_cases'), path: '/cases', icon: FolderLock },
    { name: t('nav_settings'), path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#07090F] overflow-hidden text-gray-200">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0c0e17] border-r border-gray-800/80 flex flex-col justify-between h-full z-30">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center px-5 border-b border-gray-800/60 gap-3 bg-[#0a0c14]">
            <div className="w-7 h-7 rounded bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 text-sm">
              Ω
            </div>
            <span className="font-extrabold text-sm tracking-wider text-cyan-400 font-mono">
              BRAVE ANALYST
            </span>
          </div>

          {/* Locale switcher */}
          <div className="px-5 py-2 border-b border-gray-800/60 flex justify-end">
            <LocaleSwitcher />
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold font-mono tracking-wide transition-all ${
                    isActive
                      ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 shadow shadow-cyan-500/5'
                      : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-gray-800/60 bg-[#090b12] space-y-3">
          {hasMounted && user && (
            <div className="px-2 py-1 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                <ShieldAlert size={10} />
                <span>{user.clearance} {t('clearance_suffix')}</span>
              </div>
              <p className="text-xs font-bold text-gray-300 font-mono leading-none truncate">{user.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold font-mono text-red-400 hover:bg-red-950/20 transition-all border border-transparent"
          >
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="h-12 shrink-0 border-b border-gray-800/60 bg-[#0a0c14] flex items-center justify-end px-4">
          <AlertBell />
        </div>
        <main className="flex-1 overflow-hidden relative min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Settings
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLocaleStore, type Locale } from '../../store/localeStore';
import { useT } from '../../lib/i18n';
import { useHasMounted } from '../../lib/useHasMounted';

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
    { name: t('nav_graph'), path: '/graph/case-01', icon: Share2 },
    { name: t('nav_map'), path: '/map', icon: Map },
    { name: t('nav_surveillance'), path: '/surveillance', icon: Cctv },
    { name: t('nav_command'), path: '/command', icon: Crosshair },
    { name: t('nav_assistant'), path: '/assistant', icon: Bot },
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
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

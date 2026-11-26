'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Columns3,
  Inbox,
  Search,
  Share2,
  Map,
  Clock,
  FolderLock,
  FolderGit2,
  LogOut,
  ShieldAlert,
  Cctv,
  Crosshair,
  Bot,
  Settings,
  Bell,
  Eye,
  Sparkles,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useT } from '../../lib/i18n';
import { useHasMounted } from '../../lib/useHasMounted';
import { useLiveFeed } from '../../lib/useLiveFeed';
import { alertsApi, authApi } from '../../lib/api';
import { workspaceApi } from '../../lib/workspaceApi';
import { notificationSnoozed } from '../../lib/workbench';
import QuickNavigation from './QuickNavigation';
import Brand from '../common/Brand';
import { LocaleSwitcher, ThemeToggle } from '../common/PreferencesControls';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

// The server owns the unread count; live frames trigger a refresh instead
// of being added to a total that may already include them.
function AlertBell() {
  const router = useRouter();
  const t = useT();
  const { alerts: liveAlerts } = useLiveFeed();
  const queryClient = useQueryClient();
  const lastSeenIdRef = useRef<string | undefined>(undefined);

  const countQ = useQuery({
    queryKey: ['alerts-unread-count'],
    queryFn: () => alertsApi.list({ acknowledged: false, limit: 1 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (liveAlerts.length === 0) return;
    const top = liveAlerts[0];
    if (top.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = top.id;
    void queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    toast(`${t('alerts_new_toast')} ${top.title}`, { icon: '🔔' });
  }, [liveAlerts, t, queryClient]);

  const unreadCount = countQ.data?.total ?? 0;

  return (
    <button
      onClick={() => router.push('/alerts')}
      title={t('alerts_bell_title')}
      aria-label={t('alerts_bell_title')}
      className="workspace-icon-button relative"
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

function WorkspaceInbox() {
  const t = useT(); const user = useAuthStore(s => s.user); const authenticated = useAuthStore(s => s.isAuthenticated);
  const query = useQuery({ queryKey: ['workspace-inbox', user?.id], queryFn: workspaceApi.notifications, enabled: authenticated, refetchInterval: 30_000 });
  const count = (query.data ?? []).filter(n => !n.read && !notificationSnoozed(n)).length;
  return <Link href="/inbox" title={t('wb_inbox')} aria-label={t('wb_inbox')} className="workspace-icon-button relative"><Inbox size={16} />{count > 0 && <span className="wb-inbox-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}</Link>;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeCaseId = useWorkspaceStore(state => state.activeCaseId);
  const sidebarRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  const closeNavigation = () => {
    if (contentRef.current) contentRef.current.inert = false;
    setMobileNavOpen(false);
    menuRef.current?.focus();
  };

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (sidebarRef.current) sidebarRef.current.inert = !media.matches && !mobileNavOpen;
      if (contentRef.current) contentRef.current.inert = !media.matches && mobileNavOpen;
      if (media.matches && mobileNavOpen) setMobileNavOpen(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    sidebarRef.current?.querySelector<HTMLButtonElement>('[data-close-navigation]')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavigation();
      if (event.key === 'Tab' && !window.matchMedia('(min-width: 1024px)').matches) {
        const controls = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    // Must hit the backend, not just clear local state: the session cookies
    // are HttpOnly, so only a server-issued Set-Cookie (authApi.logout's
    // POST /auth/logout) can actually clear them — skipping this call would
    // leave the real session cookies live even though the UI shows logged
    // out. Best-effort (authApi.logout already swallows its own errors) so a
    // network hiccup never traps the user unable to log out client-side.
    await authApi.logout();
    logout();
    router.replace('/login');
  };

  const navGroups = [
    { label: t('workspace_group_workspace'), items: [
      { name: t('nav_home'), path: '/dashboard', icon: LayoutDashboard },
      { name: t('nav_projects'), path: '/projects', icon: FolderGit2 },
      { name: t('nav_cases'), path: '/cases', icon: FolderLock },
      { name: t('wb_title'), path: '/workbench', icon: Columns3 },
      { name: t('wb_inbox'), path: '/inbox', icon: Inbox },
      { name: t('nav_search'), path: '/search', icon: Search },
    ] },
    { label: t('workspace_group_analysis'), items: [
      { name: t('nav_graph'), path: pathname.startsWith('/graph/') ? pathname : activeCaseId ? `/graph/${encodeURIComponent(activeCaseId)}` : '/cases', icon: Share2 },
      { name: t('nav_map'), path: '/map', icon: Map },
      { name: t('nav_timeline'), path: '/timeline', icon: Clock },
      { name: t('nav_patterns'), path: '/patterns', icon: Sparkles },
      { name: t('nav_assistant'), path: '/assistant', icon: Bot },
    ] },
    { label: t('workspace_group_operations'), items: [
      { name: t('nav_alerts'), path: '/alerts', icon: ShieldAlert },
      { name: t('nav_watchlist'), path: '/watchlist', icon: Eye },
      { name: t('nav_surveillance'), path: '/surveillance', icon: Cctv },
      { name: t('nav_command'), path: '/command', icon: Crosshair },
    ] },
  ];
  const settingsItem = { name: t('nav_settings'), path: '/settings', icon: Settings };
  const navItems = [...navGroups.flatMap(group => group.items), settingsItem];
  const currentPage = navItems.find(item => item.icon === Share2
    ? pathname.startsWith('/graph/')
    : pathname === item.path || pathname.startsWith(`${item.path}/`));
  const displayName = hasMounted ? user?.name : undefined;
  const initials = displayName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('') || 'K';

  const renderNavItem = (item: typeof settingsItem) => {
    const Icon = item.icon;
    const isActive = item.icon === Share2 ? pathname.startsWith('/graph/') : pathname === item.path || pathname.startsWith(`${item.path}/`);
    return <Link key={item.name} href={item.path} aria-current={isActive ? 'page' : undefined}
      className={`workspace-nav-item ${isActive ? 'is-active' : ''}`}>
      <Icon size={17} strokeWidth={1.7} /><span>{item.name}</span>
      {isActive && <span className="workspace-nav-marker" aria-hidden="true" />}
    </Link>;
  };

  return (
    <div className="workspace-shell flex bg-[var(--bg-main)] overflow-hidden text-[var(--text-primary)]">
      <a href="#workspace-main" className="skip-content">{t('workspace_skip')}</a>
      {mobileNavOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={closeNavigation} />}
      <aside ref={sidebarRef} id="workspace-navigation" aria-label={t('workspace_group_workspace')}
        role={mobileNavOpen ? 'dialog' : undefined} aria-modal={mobileNavOpen || undefined}
        className={`workspace-sidebar fixed lg:static inset-y-0 left-0 flex flex-col h-full z-40 transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="workspace-sidebar-scroll">
          <div className="workspace-brand-header">
            <Link href="/dashboard" aria-label="Ko‘z"><Brand caption={t('workspace_brand_caption')} /></Link>
            <button data-close-navigation onClick={closeNavigation}
              className="workspace-icon-button lg:hidden" aria-label={t('workspace_close_navigation')}><X size={18} /></button>
          </div>
          <nav className="workspace-nav" aria-label={t('workspace_navigation')}>
            {navGroups.map(group => <div className="workspace-nav-group" key={group.label}>
              <p className="workspace-nav-label">{group.label}</p>
              {group.items.map(renderNavItem)}
            </div>)}
          </nav>
        </div>
        <div className="workspace-sidebar-footer">
          {renderNavItem(settingsItem)}
          <div className="workspace-user">
            <span className="workspace-avatar" aria-hidden="true">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{displayName || t('workspace_brand_caption')}</p>
              {hasMounted && user && <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">{user.clearance} · {t('clearance_suffix')}</p>}
            </div>
            <button onClick={handleLogout} data-testid="logout-btn" title={t('logout')} aria-label={t('logout')} className="workspace-icon-button"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <div ref={contentRef} className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="workspace-topbar">
          <button ref={menuRef} onClick={() => setMobileNavOpen(true)} className="workspace-icon-button lg:hidden"
            aria-label={t('workspace_open_navigation')} aria-expanded={mobileNavOpen} aria-controls="workspace-navigation"><Menu size={18} /></button>
          <div className="workspace-breadcrumb"><span className="hidden xl:inline">{t('workspace_group_workspace')}</span><ChevronRight size={13} className="hidden xl:inline" /><span>{currentPage?.name || t('workspace_brand_caption')}</span></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <QuickNavigation items={navItems} />
            <span className="workspace-toolbar-divider" aria-hidden="true" />
            <LocaleSwitcher /><ThemeToggle /><WorkspaceInbox /><AlertBell />
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1} className="flex-1 overflow-hidden relative min-h-0">{children}</main>
      </div>
    </div>
  );
}

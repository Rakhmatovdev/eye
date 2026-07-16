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
  Crosshair
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Graph Analysis', path: '/graph/case-01', icon: Share2 },
    { name: 'Geospatial Map', path: '/map', icon: Map },
    { name: 'Surveillance', path: '/surveillance', icon: Cctv },
    { name: 'Command Post', path: '/command', icon: Crosshair },
    { name: 'Time Analysis', path: '/timeline', icon: Clock },
    { name: 'Case Files', path: '/cases', icon: FolderLock },
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
          {user && (
            <div className="px-2 py-1 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                <ShieldAlert size={10} />
                <span>{user.clearance} clearance</span>
              </div>
              <p className="text-xs font-bold text-gray-300 font-mono leading-none truncate">{user.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold font-mono text-red-400 hover:bg-red-950/20 transition-all border border-transparent"
          >
            <LogOut size={16} />
            <span>Logout</span>
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

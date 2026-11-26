'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Coins,
  Radio,
  Pin,
  Mic,
  Globe2,
  ShieldAlert,
  Plane,
  Search,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Users,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Compass,
  Crosshair,
  Volume2,
  Lock,
  Download,
  Database,
  Sparkles,
} from 'lucide-react';
import { workspaceApi, type CaseWorkspace } from '../../lib/workspaceApi';
import { useT } from '../../lib/i18n';

export default function SpecialOpsCenter({
  caseId,
  context,
}: {
  caseId: string;
  context: CaseWorkspace;
}) {
  const t = useT();
  const [activeSubTab, setActiveSubTab] = useState<
    'warroom' | 'crypto' | 'telecom' | 'voice' | 'osint' | 'field' | 'flights'
  >('warroom');

  return (
    <div className="wb-special-ops bg-[#080d18] border border-cyan-900/40 rounded-xl p-5 text-slate-200 shadow-2xl backdrop-blur-md">
      {/* Top Header & Status Ticker */}
      <div className="flex flex-wrap items-center justify-between border-b border-cyan-900/40 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal className="text-cyan-400 w-7 h-7" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-wider text-cyan-300 uppercase">
                KO'Z SPECIAL OPS & INTELLIGENCE SUITE
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                C4ISR / SOC READY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kripto forensika, telekom triangulyatsiyasi, detektiv doskasi, ovoz tahlili va taktik HUD
            </p>
          </div>
        </div>

        {/* Tactical Subtabs */}
        <div className="flex items-center gap-1.5 bg-[#0f172a] p-1.5 rounded-lg border border-cyan-800/50 text-xs overflow-x-auto shadow-inner">
          <button
            onClick={() => setActiveSubTab('warroom')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'warroom'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Pin size={14} className="text-red-300" /> War Room (Corkboard)
          </button>
          <button
            onClick={() => setActiveSubTab('crypto')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'crypto'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Coins size={14} /> Kripto Forensika
          </button>
          <button
            onClick={() => setActiveSubTab('telecom')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'telecom'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Radio size={14} /> Telekom CDR & BTS
          </button>
          <button
            onClick={() => setActiveSubTab('voice')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'voice'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Mic size={14} /> Ovoz / Steno
          </button>
          <button
            onClick={() => setActiveSubTab('osint')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'osint'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Globe2 size={14} /> Deep OSINT
          </button>
          <button
            onClick={() => setActiveSubTab('field')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'field'
                ? 'bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <ShieldAlert size={14} /> Field Patrol HUD
          </button>
          <button
            onClick={() => setActiveSubTab('flights')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
              activeSubTab === 'flights'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-lg'
                : 'hover:text-cyan-300 text-slate-400'
            }`}
          >
            <Plane size={14} /> ADS-B Radar
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeSubTab === 'warroom' && <InteractiveWarRoom caseId={caseId} />}
      {activeSubTab === 'crypto' && <InteractiveCryptoTab />}
      {activeSubTab === 'telecom' && <InteractiveTelecomTab />}
      {activeSubTab === 'voice' && <InteractiveVoiceTab />}
      {activeSubTab === 'osint' && <InteractiveOSINTTab />}
      {activeSubTab === 'field' && <InteractiveFieldHUD />}
      {activeSubTab === 'flights' && <InteractiveRadarTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INTERACTIVE WAR ROOM (DETECTIVE CORKBOARD WITH RED YARNS)
// ─────────────────────────────────────────────────────────────────────────────
interface CorkboardPin {
  id: string;
  type: 'suspect' | 'weapon' | 'document' | 'vehicle' | 'location';
  title: string;
  subtitle: string;
  x: number;
  y: number;
  photoUrl?: string;
  badge?: string;
}

interface RedYarn {
  fromId: string;
  toId: string;
  label: string;
  confidence: number;
}

function InteractiveWarRoom({ caseId }: { caseId: string }) {
  const [pins, setPins] = useState<CorkboardPin[]>([
    {
      id: 'pin-1',
      type: 'suspect',
      title: 'Rustamov Azizbek (34 y.)',
      subtitle: 'Asosiy gumonlanuvchi / Qidiruvda',
      x: 12,
      y: 18,
      badge: '98% Isbotlangan',
    },
    {
      id: 'pin-2',
      type: 'document',
      title: 'Tornado Cash Tranzaksiyasi',
      subtitle: '$148,500 ETH yuvish shubhasi',
      x: 48,
      y: 15,
      badge: 'Blockchain Dalil',
    },
    {
      id: 'pin-3',
      type: 'weapon',
      title: 'Makarov Pistoleti (9mm)',
      subtitle: 'Seriya #UZ-94821 / Voqea joyi',
      x: 82,
      y: 22,
      badge: 'Ballistika Mos',
    },
    {
      id: 'pin-4',
      type: 'vehicle',
      title: 'Chevrolet Malibu (01 A 777 AA)',
      subtitle: 'Chorsu radarda qayd etilgan',
      x: 25,
      y: 62,
      badge: 'ANPR Sighting',
    },
    {
      id: 'pin-5',
      type: 'location',
      title: 'Yashirin Uchrashuv Kvartirasi',
      subtitle: 'Chilonzor 9-mavze, 14-uy',
      x: 72,
      y: 65,
      badge: 'BTS Triangulyatsiya',
    },
  ]);

  const [strings, setStrings] = useState<RedYarn[]>([
    { fromId: 'pin-1', toId: 'pin-2', label: 'Mablag‘ O‘tkazmasi', confidence: 0.95 },
    { fromId: 'pin-1', toId: 'pin-3', label: 'Barmoq Izi Mosligi', confidence: 0.99 },
    { fromId: 'pin-1', toId: 'pin-4', label: 'Avtomobil Egasi', confidence: 1.0 },
    { fromId: 'pin-4', toId: 'pin-5', label: 'Kuzatuv Marshruti', confidence: 0.88 },
    { fromId: 'pin-2', toId: 'pin-5', label: 'Ijara To‘lovi', confidence: 0.74 },
  ]);

  const [activePin, setActivePin] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs bg-[#111827] px-4 py-2.5 rounded-lg border border-red-950/70">
        <div className="flex items-center gap-2 text-red-400 font-semibold">
          <Pin className="text-red-500 animate-bounce" size={16} />
          <span>JONLI DETEKTIV DOSKASI — COLLABORATIVE WAR ROOM</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Users size={14} /> 3 Tahlilchi Jonli (Presence: Aliyev A., Karimov D.)
          </span>
          <button
            onClick={() => {
              const newId = `pin-${pins.length + 1}`;
              setPins([
                ...pins,
                {
                  id: newId,
                  type: 'document',
                  title: 'Yangi Guvoh Ko‘rsatmasi',
                  subtitle: 'Tergov bayonnomasi #412',
                  x: 50,
                  y: 50,
                  badge: 'Kiritildi',
                },
              ]);
            }}
            className="bg-red-800 hover:bg-red-700 text-white px-2.5 py-1 rounded flex items-center gap-1 transition"
          >
            <Plus size={13} /> Yangi Pin Qo‘shish
          </button>
        </div>
      </div>

      {/* Corkboard canvas */}
      <div className="relative w-full h-[460px] bg-[#1a1410] border-4 border-[#3e2c20] rounded-xl overflow-hidden shadow-2xl p-4 select-none">
        {/* Corkboard grain background texture overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* SVG Red Yarn Connectors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.8" />
            </filter>
          </defs>
          {strings.map((str, idx) => {
            const from = pins.find((p) => p.id === str.fromId);
            const to = pins.find((p) => p.id === str.toId);
            if (!from || !to) return null;

            // Curve calculation for realism
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 + 5; // Slight slack droop

            return (
              <g key={idx}>
                {/* Red String Line */}
                <path
                  d={`M ${from.x}% ${from.y}% Q ${midX}% ${midY}% ${to.x}% ${to.y}%`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray={str.confidence < 0.8 ? '5,5' : 'none'}
                  filter="url(#shadow)"
                  className="transition-all duration-300"
                />
                {/* Center Badge */}
                <text
                  x={`${midX}%`}
                  y={`${midY - 1}%`}
                  fill="#fecaca"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="bg-black font-bold fill-red-200"
                >
                  {str.label} ({Math.round(str.confidence * 100)}%)
                </text>
              </g>
            );
          })}
        </svg>

        {/* Pin Cards */}
        {pins.map((pin) => {
          const isSelected = activePin === pin.id;
          return (
            <div
              key={pin.id}
              onClick={() => setActivePin(isSelected ? null : pin.id)}
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute z-20 cursor-pointer transition-transform duration-200 hover:scale-105 ${
                isSelected ? 'ring-2 ring-red-400 scale-110 z-30' : ''
              }`}
            >
              {/* Pushpin Head */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md border-2 border-white flex items-center justify-center z-30">
                <div className="w-1.5 h-1.5 bg-red-950 rounded-full" />
              </div>

              {/* Note / Card Body */}
              <div
                className={`w-48 p-2.5 rounded-lg shadow-2xl border text-xs ${
                  pin.type === 'suspect'
                    ? 'bg-[#2a1315] border-red-800 text-red-100'
                    : pin.type === 'weapon'
                    ? 'bg-[#291e12] border-amber-800 text-amber-100'
                    : pin.type === 'vehicle'
                    ? 'bg-[#122329] border-cyan-800 text-cyan-100'
                    : 'bg-[#1c1c1f] border-slate-700 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">
                    {pin.type}
                  </span>
                  {pin.badge && (
                    <span className="text-[9px] bg-red-950/80 border border-red-700/60 text-red-300 px-1.5 py-0.2 rounded font-mono">
                      {pin.badge}
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs leading-tight">{pin.title}</div>
                <p className="text-[10px] text-slate-300 mt-1 opacity-80 leading-normal">
                  {pin.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRYPTO FORENSICS MULTI-HOP VISUAL GRAPH
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveCryptoTab() {
  const [address, setAddress] = useState('0x71C8363837918a710182823812841092');
  const [network, setNetwork] = useState('ETH');
  const [hops, setHops] = useState(3);

  const seedMutation = useMutation({
    mutationFn: () => workspaceApi.seedCryptoDemo(),
    onSuccess: () => query.refetch(),
  });

  const query = useQuery({
    queryKey: ['crypto-trace', address, network, hops],
    queryFn: () => workspaceApi.traceCrypto(address, network, hops),
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2.5 items-center bg-[#0d1527] p-3 rounded-lg border border-cyan-900/50">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Hamyon manzili (0x..., T..., bc1...)"
          className="flex-1 min-w-[280px] bg-[#060911] border border-cyan-800/60 rounded px-3 py-1.5 text-xs font-mono text-cyan-200 outline-none focus:border-cyan-400"
        />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="bg-[#060911] border border-cyan-800/60 rounded px-3 py-1.5 text-xs text-cyan-200"
        >
          <option value="ETH">Ethereum (ERC-20)</option>
          <option value="BTC">Bitcoin</option>
          <option value="TRON_TRC20">Tron (TRC-20 USDT)</option>
          <option value="TON">The Open Network (TON)</option>
        </select>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Hops:</span>
          <select
            value={hops}
            onChange={(e) => setHops(Number(e.target.value))}
            className="bg-[#060911] border border-cyan-800/60 rounded px-2 py-1.5 text-xs text-cyan-200"
          >
            <option value={2}>2 Hop</option>
            <option value={3}>3 Hop</option>
            <option value={4}>4 Hop</option>
          </select>
        </div>
        <button
          onClick={() => query.refetch()}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-1.5 rounded flex items-center gap-1.5 font-medium transition"
        >
          <Search size={14} /> Multi-Hop Kuzatuv
        </button>
        <button
          onClick={() => seedMutation.mutate()}
          className="bg-purple-900/70 hover:bg-purple-800 border border-purple-700/60 text-purple-200 text-xs px-3 py-1.5 rounded flex items-center gap-1 font-medium transition"
        >
          <Database size={13} /> Ssenariy Yuklash
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#0c1322] p-3 rounded-lg border border-cyan-900/40">
          <span className="text-slate-400">Jami Yuvilgan Mablag‘</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">$148,500 USD</div>
        </div>
        <div className="bg-[#0c1322] p-3 rounded-lg border border-cyan-900/40">
          <span className="text-slate-400">OFAC / Sanction Xavfi</span>
          <div className="text-xl font-bold text-red-400 mt-1 font-mono">98% (Kritik Xavf)</div>
        </div>
        <div className="bg-[#0c1322] p-3 rounded-lg border border-cyan-900/40">
          <span className="text-slate-400">Aniqlangan Peeling Chain</span>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">1 ta Zanjir (40 ETH)</div>
        </div>
        <div className="bg-[#0c1322] p-3 rounded-lg border border-cyan-900/40">
          <span className="text-slate-400">Yakuniy Chiqish Nuqtasi</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">Binance Hot Wallet #4</div>
        </div>
      </div>

      {/* Visual Flow Pipeline */}
      <div className="bg-[#0b1120] p-4 rounded-xl border border-cyan-900/40 space-y-3">
        <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
          <TrendingUp size={15} /> TRANZAKSIYALARNING KOP BOSQICHLI OQIMI (FLOW DIAGRAM)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center pt-2">
          {/* Step 1 */}
          <div className="p-3 bg-[#11192b] border border-cyan-800/60 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400">
              Hop 0: Boshlang‘ich
            </span>
            <div className="font-bold text-xs text-cyan-200 mt-1">Gumonlanuvchi Hamyoni</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              0x71C83638...1092
            </div>
            <div className="text-[11px] font-semibold text-amber-300 pt-1">
              Chiqish: 45 ETH ($148,500)
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-[#11192b] border border-amber-800/60 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400">
              Hop 1: Tranzit Spreader
            </span>
            <div className="font-bold text-xs text-amber-200 mt-1">Tranzit Splitter</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              0x85A92716...2910
            </div>
            <div className="text-[11px] font-semibold text-amber-300 pt-1">
              Peeling: 40 ETH ($132,000)
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-[#241014] border border-red-800/80 rounded-lg space-y-1 shadow-lg">
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-bold">
              Hop 2: Mikser (SANCTIONED)
            </span>
            <div className="font-bold text-xs text-red-200 mt-1">Tornado Cash Router</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              0x12D647B0...3746
            </div>
            <div className="text-[11px] font-semibold text-red-400 pt-1">
              Yuvish / Anonimizatsiya
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3 bg-[#0d2119] border border-emerald-800/60 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400">
              Hop 3: Chiqish Birjasi
            </span>
            <div className="font-bold text-xs text-emerald-200 mt-1">Binance Hot Wallet #4</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              0x33F89201...6192
            </div>
            <div className="text-[11px] font-semibold text-emerald-300 pt-1">
              Kiruvchi: 39.5 ETH ($130,350)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TELECOM CDR & BTS SECTOR VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveTelecomTab() {
  const [msisdn, setMsisdn] = useState('+998901234567');
  const [radius, setRadius] = useState(500);

  const seedMutation = useMutation({
    mutationFn: () => workspaceApi.seedTelecomDemo(),
    onSuccess: () => topContacts.refetch(),
  });

  const topContacts = useQuery({
    queryKey: ['telecom-contacts', msisdn],
    queryFn: () => workspaceApi.topContacts(msisdn, 5),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 items-center bg-[#0d1527] p-3 rounded-lg border border-cyan-900/50">
        <input
          type="text"
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
          placeholder="+99890XXXXXXX"
          className="flex-1 min-w-[200px] bg-[#060911] border border-cyan-800/60 rounded px-3 py-1.5 text-xs font-mono text-cyan-200 outline-none"
        />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Geo-fence Radius: {radius}m</span>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-28 accent-cyan-500"
          />
        </div>
        <button
          onClick={() => topContacts.refetch()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded flex items-center gap-1.5 font-medium transition"
        >
          <Search size={14} /> Aloqalar Matritsasi
        </button>
        <button
          onClick={() => seedMutation.mutate()}
          className="bg-purple-900/70 hover:bg-purple-800 border border-purple-700/60 text-purple-200 text-xs px-3 py-1.5 rounded flex items-center gap-1 font-medium transition"
        >
          <Database size={13} /> Toshkent BTS Namuna
        </button>
      </div>

      {/* BTS Sector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-[#0d1629] border border-cyan-900/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-cyan-300">TAS-CHORSU-01 BTS</span>
            <span className="text-[10px] font-mono text-emerald-400">Azimut: 45°</span>
          </div>
          <p className="text-[11px] text-slate-400">Shayxontohur tumani, Chorsu maydoni</p>
          <div className="text-[11px] text-slate-300 font-mono bg-[#070b14] p-1.5 rounded">
            So‘nggi aloqa: 45 daq. oldin | 320 soniya
          </div>
        </div>

        <div className="p-3 bg-[#0d1629] border border-cyan-900/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-cyan-300">TAS-YUNUSOBOD-04 BTS</span>
            <span className="text-[10px] font-mono text-emerald-400">Azimut: 180°</span>
          </div>
          <p className="text-[11px] text-slate-400">Yunusobod 12-mavze, Amir Temur shoh ko‘chasi</p>
          <div className="text-[11px] text-slate-300 font-mono bg-[#070b14] p-1.5 rounded">
            So‘nggi aloqa: 20 daq. oldin | 180 soniya
          </div>
        </div>

        <div className="p-3 bg-[#241318] border border-red-800/60 rounded-lg space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-red-300">TAS-CHILONZOR-02 BTS</span>
            <span className="text-[10px] font-mono text-red-400 font-bold">SIM SWAP!</span>
          </div>
          <p className="text-[11px] text-red-200/80">Chilonzor 2-mavze | Yangi IMEI: 351928049281726</p>
          <div className="text-[11px] text-red-300 font-mono bg-red-950/60 p-1.5 rounded">
            Anomaliya: Bitta SIM yangi telefonga ko‘chirildi
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BIOMETRIC VOICE & SPEECH-TO-TEXT STUDIO
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveVoiceTab() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(14.2);
  const [text, setText] = useState(
    "Ertaga soat 22:00 da uchrashuv bo'ladi, qotil va qurol masalasini hal qilamiz. Summa 50,000 dollar naqd."
  );

  const scanMutation = useMutation({
    mutationFn: (val: string) => workspaceApi.scanVoiceKeywords(val),
  });

  return (
    <div className="space-y-4">
      {/* Audio Waveform Canvas Box */}
      <div className="p-4 bg-[#0a0f1d] border border-teal-900/50 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
            <Volume2 size={16} />
            <span>INTERAKTIV OVOZ TO'LQINI (AUDIO SPECTRUM OSCILLOSCOPE)</span>
          </div>
          <span className="text-xs font-mono text-teal-400 font-bold">
            00:{currentTime.toFixed(1)} / 01:25.0
          </span>
        </div>

        {/* Waveform graphic bars */}
        <div className="h-16 flex items-center gap-1 px-2 bg-[#050811] rounded-lg overflow-hidden border border-slate-800">
          {Array.from({ length: 48 }).map((_, i) => {
            const h = Math.abs(Math.sin((i + currentTime) * 0.4)) * 48 + 8;
            const isHighlight = i >= 18 && i <= 26;
            return (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isHighlight ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-teal-500/60'
                }`}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded flex items-center gap-1.5 font-medium transition"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? 'To‘xtatish' : 'O‘ynatish'}
          </button>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="text-emerald-400">Akustik Vektor: 256-D</span>
            <span className="text-cyan-400">Biometrik Moslik: 94.2% (Gumonlanuvchi A)</span>
          </div>
        </div>
      </div>

      {/* Transcription & Keyword Spotting */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-semibold">Tergov Audio Transkripsiyasi:</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full bg-[#060911] border border-teal-800/50 rounded-lg p-3 text-xs text-teal-200 outline-none focus:border-teal-400 font-mono"
        />
        <button
          onClick={() => scanMutation.mutate(text)}
          className="bg-teal-700 hover:bg-teal-600 text-white text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 font-medium transition"
        >
          <Mic size={14} /> Kriminalistik Kalit So‘zlarni Topish
        </button>

        {scanMutation.data?.hits && (
          <div className="p-3 bg-[#170e12] border border-red-800/60 rounded-lg text-xs space-y-2">
            <span className="font-bold text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={15} /> {scanMutation.data.count} ta Xavfli Operativ Kalit So‘z Aniqlangan:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {scanMutation.data.hits.map((h: any, i: number) => (
                <span
                  key={i}
                  className="bg-red-950 border border-red-700 text-red-200 px-2.5 py-1 rounded text-xs font-mono font-bold"
                >
                  [{h.category}] "{h.keyword}"
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEEP OSINT & DIGITAL FOOTPRINT PROFILER
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveOSINTTab() {
  const [query, setQuery] = useState('+998901234567');
  const osintMutation = useMutation({
    mutationFn: (q: string) => workspaceApi.osintProfile(q),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 items-center bg-[#0d1527] p-3 rounded-lg border border-blue-900/50">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Telefon raqami (+998...), Email yoki Telegram username..."
          className="flex-1 min-w-[260px] bg-[#060911] border border-blue-800/60 rounded px-3 py-1.5 text-xs text-blue-200 outline-none"
        />
        <button
          onClick={() => osintMutation.mutate(query)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded flex items-center gap-1.5 font-medium transition"
        >
          <Globe2 size={14} /> Raqamli Profilni Yig‘ish
        </button>
      </div>

      {/* Profile Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 bg-[#0b1326] border border-blue-900/50 rounded-lg space-y-2">
          <span className="text-[10px] uppercase font-mono text-slate-400">Aloqa Operatori</span>
          <div className="text-base font-bold text-blue-300">Beeline Uzbekistan (Unitel)</div>
          <p className="text-xs text-slate-400">Prefiks: +998 (90) | Mintaqa: O'zbekiston</p>
        </div>

        <div className="p-3.5 bg-[#0b1326] border border-blue-900/50 rounded-lg space-y-2">
          <span className="text-[10px] uppercase font-mono text-slate-400">Telegram Profil & Guruhlar</span>
          <div className="text-base font-bold text-cyan-300">@azizbek_tashkent</div>
          <p className="text-xs text-slate-400">A'zo guruhlar: Crypto P2P, Avto Bozor Toshkent</p>
        </div>

        <div className="p-3.5 bg-[#261017] border border-red-800/60 rounded-lg space-y-2">
          <span className="text-[10px] uppercase font-mono text-red-400 font-bold">Darknet Sizdirishlar (Leaks)</span>
          <div className="text-base font-bold text-red-300">2 ta Korpusda Topildi</div>
          <p className="text-xs text-red-200/80">Collection#1, Exploit.in (Parol: Tashk****2021)</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FIELD PATROL NIGHT-VISION TACTICAL HUD
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveFieldHUD() {
  const [plate, setPlate] = useState('01A777AA');
  const [pinfl, setPinfl] = useState('30101901230014');
  const [result, setResult] = useState<any>(null);

  const handleCheck = () => {
    // Immediate tactical 1-sec feedback simulation
    if (plate.toUpperCase().includes('777')) {
      setResult({
        threat_code: 'RED_WANTED',
        status_message: 'DIQQAT! SHAXS/TRANSPORT QIDIRUVDA!',
        target_name: 'Rustamov Azizbek (PINFL: 30101901230014)',
        recommended_action: 'Zudlik bilan qo‘lga olinsin va tezkor guruh chaqirilsin!',
      });
    } else {
      setResult({
        threat_code: 'GREEN_CLEAR',
        status_message: 'TOZA / QIDIRUVDA YO‘Q',
        target_name: 'Hujjatlar bo‘yicha cheklov topilmadi',
        recommended_action: 'Harakatlanishiga ruxsat berilsin',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Tactical Viewfinder Screen */}
      <div className="relative h-64 bg-[#031109] border-2 border-emerald-600/70 rounded-xl overflow-hidden p-4 shadow-2xl flex flex-col justify-between font-mono">
        {/* Crosshair & Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(16,185,129,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.3)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-emerald-500/40 rounded-full flex items-center justify-center pointer-events-none">
          <Crosshair className="text-emerald-400 w-8 h-8 opacity-60" />
        </div>

        {/* Viewfinder Corners */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

        {/* HUD Info */}
        <div className="relative z-10 flex justify-between text-xs text-emerald-400">
          <span>FIELD-PATROL // TERM-04</span>
          <span className="animate-pulse">GPS: 41.3110 N, 69.2797 E [LIVE]</span>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 items-center justify-center">
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="01A777AA"
            className="bg-[#052112]/90 border border-emerald-500 text-emerald-200 px-3 py-1.5 rounded text-sm text-center font-bold tracking-widest outline-none"
          />
          <input
            type="text"
            value={pinfl}
            onChange={(e) => setPinfl(e.target.value)}
            placeholder="PINFL (14 xona)"
            className="bg-[#052112]/90 border border-emerald-500 text-emerald-200 px-3 py-1.5 rounded text-sm text-center font-bold tracking-widest outline-none"
          />
          <button
            onClick={handleCheck}
            className="bg-emerald-600 hover:bg-emerald-500 text-black px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition"
          >
            1-Sekundlik Tekshirish
          </button>
        </div>

        <div className="relative z-10 flex justify-between text-[11px] text-emerald-400/80">
          <span>OFLAYN BAZA VERSIYASI: 20261124-v4 (SHA-256 OK)</span>
          <span>BATARYA: 98%</span>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono transition-all duration-300 ${
            result.threat_code === 'RED_WANTED'
              ? 'bg-red-950/90 border-red-600 text-red-200 shadow-2xl shadow-red-900/50'
              : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
          }`}
        >
          <div className="font-extrabold text-base tracking-wider flex items-center gap-2">
            {result.threat_code === 'RED_WANTED' ? (
              <AlertTriangle className="text-red-400 animate-ping" size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            {result.status_message}
          </div>
          <div className="text-sm font-semibold mt-1 text-white">{result.target_name}</div>
          <p className="mt-1 text-xs opacity-90">{result.recommended_action}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADS-B RADAR & DRONE FLIGHT SCOPE
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveRadarTab() {
  const seedMutation = useMutation({
    mutationFn: () => workspaceApi.seedFlightsDemo(),
    onSuccess: () => query.refetch(),
  });

  const query = useQuery({
    queryKey: ['live-flights'],
    queryFn: () => workspaceApi.liveFlights(),
  });

  return (
    <div className="space-y-4">
      {/* Radar Scope */}
      <div className="relative h-80 bg-[#020b14] border-2 border-sky-800/80 rounded-xl overflow-hidden p-4 shadow-2xl flex items-center justify-center font-mono">
        {/* Radar Concentric Rings */}
        <div className="absolute w-72 h-72 border border-sky-600/30 rounded-full" />
        <div className="absolute w-52 h-52 border border-sky-600/30 rounded-full" />
        <div className="absolute w-32 h-32 border border-sky-600/30 rounded-full" />
        <div className="absolute w-full h-[1px] bg-sky-600/20" />
        <div className="absolute h-full w-[1px] bg-sky-600/20" />

        {/* Rotating Radar Sweep Beam */}
        <div className="absolute w-72 h-72 rounded-full overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-sky-500/10 to-sky-400/30 origin-center animate-[spin_4s_linear_infinite]" />
        </div>

        {/* Center Target Indicator */}
        <div className="absolute w-2 h-2 bg-sky-400 rounded-full" />

        {/* Aircraft 1: UZB271 */}
        <div className="absolute top-[32%] left-[62%] flex items-center gap-1.5 z-10 text-[10px] text-sky-300">
          <Plane size={14} className="text-sky-400 rotate-45" />
          <div className="bg-[#041122]/90 border border-sky-700 px-1.5 py-0.5 rounded leading-tight">
            <span className="font-bold text-white">UZB271</span> | 9,450m | 820km/h
          </div>
        </div>

        {/* Aircraft 2: THY368 */}
        <div className="absolute top-[22%] left-[28%] flex items-center gap-1.5 z-10 text-[10px] text-sky-300">
          <Plane size={14} className="text-sky-400 rotate-[85deg]" />
          <div className="bg-[#041122]/90 border border-sky-700 px-1.5 py-0.5 rounded leading-tight">
            <span className="font-bold text-white">THY368</span> | 10,600m | 850km/h
          </div>
        </div>

        {/* Drone: UAV-SURV-09 */}
        <div className="absolute bottom-[28%] right-[38%] flex items-center gap-1.5 z-10 text-[10px] text-amber-300">
          <Layers size={14} className="text-amber-400 animate-pulse" />
          <div className="bg-[#1f1309]/90 border border-amber-600 px-1.5 py-0.5 rounded leading-tight">
            <span className="font-bold text-amber-300">UAV-SURV-09 (Dron)</span> | 150m | No-Fly Zone Cheti
          </div>
        </div>

        <div className="absolute top-3 left-3 text-xs text-sky-400/80">
          RADAR SCOPE // UZ-AIRSPACE ADS-B 1090MHz
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => seedMutation.mutate()}
          className="bg-sky-800 hover:bg-sky-700 text-white text-xs px-3.5 py-1.5 rounded flex items-center gap-1.5 transition font-medium"
        >
          <Database size={13} /> Aviatsiya Ma'lumotlarini Yangilash
        </button>
      </div>
    </div>
  );
}

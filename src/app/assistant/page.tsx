'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { aiApi, type ChatTurn } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { Bot, Send, User, Sparkles, Cpu, Cloud, CircleOff } from 'lucide-react';

const SUGGESTION_KEYS = [
  'assistant_suggestion_1',
  'assistant_suggestion_2',
  'assistant_suggestion_3',
  'assistant_suggestion_4',
] as const;

interface Msg extends ChatTurn {
  source?: string;
}

function SourceBadge({ source }: { source: string }) {
  const t = useT();
  const local = source.startsWith('local');
  const claude = source === 'claude';
  const Icon = local ? Cpu : claude ? Cloud : CircleOff;
  const label = local ? source.replace('local:', `${t('assistant_source_local_prefix')} · `) : claude ? t('assistant_source_claude') : t('assistant_source_offline');
  const cls = local
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : claude
    ? 'text-violet-400 border-violet-500/30 bg-violet-500/10'
    : 'text-gray-500 border-gray-700/40 bg-gray-500/10';
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>
      <Icon size={9} /> {label}
    </span>
  );
}

export default function AssistantPage() {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pre-populate the chat from past exchanges (oldest-first) on mount. If the
  // endpoint 404s / errors, `data` stays undefined and the chat just starts
  // empty like before — no visible error state.
  const historyQ = useQuery({
    queryKey: ['ai', 'history'],
    queryFn: () => aiApi.history(50),
    retry: false,
  });

  useEffect(() => {
    if (historyLoaded) return;
    if (!historyQ.isSuccess) return;
    setHistoryLoaded(true);
    if (!historyQ.data || historyQ.data.length === 0) return;
    const loaded: Msg[] = [];
    for (const h of historyQ.data) {
      loaded.push({ role: 'user', content: h.message });
      loaded.push({ role: 'assistant', content: h.reply, source: h.source });
    }
    setMessages(loaded);
  }, [historyQ.isSuccess, historyQ.data, historyLoaded]);

  const chatM = useMutation({
    mutationFn: (text: string) =>
      aiApi.chat(
        text,
        messages.map((m) => ({ role: m.role, content: m.content })),
      ),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, source: res.source }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('assistant_unavailable_error'), source: 'simulated' }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chatM.isPending]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || chatM.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', content: t }]);
    setInput('');
    chatM.mutate(t);
  };

  return (
    <WorkspaceLayout>
      <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800/60">
          <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
            <Bot size={18} className="text-cyan-400" /> {t('nav_assistant')}
          </h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">
            {t('assistant_subtitle')}
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles size={26} />
              </div>
              <p className="text-sm text-gray-400 font-mono max-w-sm">
                {t('assistant_empty_intro')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => send(t(key))}
                    className="text-left text-xs font-mono text-gray-300 bg-[#0e1220]/60 border border-gray-800/60 hover:border-cyan-500/40 rounded-xl px-3 py-2.5 transition-all"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                m.role === 'user' ? 'bg-gray-700/30 border-gray-600/40 text-gray-300' : 'bg-cyan-600/15 border-cyan-500/30 text-cyan-400'
              }`}>
                {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-cyan-600/15 border border-cyan-500/20 text-gray-100'
                    : 'bg-[#0e1220]/70 border border-gray-800/60 text-gray-200'
                }`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && m.source && <SourceBadge source={m.source} />}
              </div>
            </div>
          ))}

          {chatM.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-600/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot size={15} />
              </div>
              <div className="bg-[#0e1220]/70 border border-gray-800/60 rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-800/60">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 bg-[#0c0e17] border border-gray-800 rounded-2xl px-3 py-2 focus-within:border-cyan-500/50 transition-all"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('assistant_placeholder')}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatM.isPending}
              className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-cyan-500 transition-all"
            >
              <Send size={15} />
            </button>
          </form>
          <p className="text-[10px] text-gray-600 font-mono mt-2 text-center">
            {t('assistant_footer_note')}
          </p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

'use client';
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { aiApi, attachmentsApi, type AIEvidence, type ChatTurn } from '../../lib/api';
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
  citations?: AIEvidence[];
  grounding?: 'references_checked' | 'insufficient_evidence';
}

function CitationList({ citations }: { citations: AIEvidence[] }) {
  const [states, setStates] = useState<Record<string, string>>({});
  const verify = async (item: AIEvidence) => {
    if (!item.attachment_id) return;
    try {
      const result = await attachmentsApi.verify('entities', item.entity_id, item.attachment_id);
      setStates((old) => ({ ...old, [item.id]: result.status }));
    } catch { setStates((old) => ({ ...old, [item.id]: 'verification failed' })); }
  };
  return <div className="mt-2 w-full space-y-2" aria-label="Evidence citations"><p className="text-[10px] text-[var(--chrome-text-500)]">References were checked against the retrieved records; review each source before relying on the interpretation.</p>{citations.map((item) => <div key={item.id} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-xs">
    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-cyan-300">[{item.id}]</span><Link className="underline text-[var(--chrome-text-200)]" href={`/entity/${encodeURIComponent(item.entity_id)}`}>Open entity {item.entity_id}</Link><span className="text-[var(--chrome-text-500)]">{item.classification}</span></div>
    <p className="mt-1 whitespace-pre-wrap break-words text-[var(--chrome-text-400)]">{item.excerpt}</p>
    <p className="mt-1 break-all font-mono text-[10px] text-[var(--chrome-text-600)]">Snapshot SHA-256: {item.snapshot_sha256}</p>
    {item.attachment_id && <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-[var(--chrome-text-500)]">Stored file SHA-256: {item.file_sha256 || 'not recorded'}</span><button type="button" onClick={() => void verify(item)} className="underline text-cyan-300">Verify file</button>{states[item.id] && <span role="status">{states[item.id]}</span>}</div>}
  </div>)}</div>;
}

function SourceBadge({ source }: { source: string }) {
  const t = useT();
  const local = source.startsWith('local');
  const claude = source === 'claude';
  const Icon = local ? Cpu : claude ? Cloud : CircleOff;
  const label = local ? source.replace('local:', `${t('assistant_source_local_prefix')} · `) : claude ? t('assistant_source_claude') : t('assistant_source_offline');
  const cls = local
    ? 'text-[var(--accent-emerald-soft)] border-emerald-500/30 bg-emerald-500/10'
    : claude
    ? 'text-[var(--accent-violet-soft)] border-violet-500/30 bg-violet-500/10'
    : 'text-[var(--chrome-text-500)] border-[color-mix(in_srgb,var(--chrome-border-700)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]';
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
      loaded.push({ role: 'assistant', content: h.reply, source: h.source, citations: h.citations, grounding: h.grounding });
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
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, source: res.source, citations: res.citations, grounding: res.grounding }]);
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
        <div className="px-6 pt-5 pb-3 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)]">
          <h1 className="text-lg font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
            <Bot size={18} className="text-[var(--accent-cyan-soft)]" /> {t('nav_assistant')}
          </h1>
          <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">
            {t('assistant_subtitle')}
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-[var(--accent-cyan-soft)]">
                <Sparkles size={26} />
              </div>
              <p className="text-sm text-[var(--chrome-text-400)] font-mono max-w-sm">
                {t('assistant_empty_intro')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => send(t(key))}
                    className="text-left text-xs font-mono text-[var(--chrome-text-300)] bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] hover:border-cyan-500/40 rounded-xl px-3 py-2.5 transition-all"
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
                m.role === 'user' ? 'bg-[color-mix(in_srgb,var(--chrome-bg-700)_30%,transparent)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)] text-[var(--chrome-text-300)]' : 'bg-cyan-600/15 border-cyan-500/30 text-[var(--accent-cyan-soft)]'
              }`}>
                {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-cyan-600/15 border border-cyan-500/20 text-[var(--chrome-text-100)]'
                    : 'bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] text-[var(--chrome-text-200)]'
                }`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && m.source && <SourceBadge source={m.source} />}
                {m.role === 'assistant' && m.grounding === 'insufficient_evidence' && <span role="status" className="text-[10px] text-amber-300">Insufficient evidence for a supported answer.</span>}
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && <CitationList citations={m.citations} />}
              </div>
            </div>
          ))}

          {chatM.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-600/15 border border-cyan-500/30 text-[var(--accent-cyan-soft)] flex items-center justify-center shrink-0">
                <Bot size={15} />
              </div>
              <div className="bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-6 pb-5 pt-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)]">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl px-3 py-2 focus-within:border-cyan-500/50 transition-all"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('assistant_placeholder')}
              className="flex-1 bg-transparent text-sm text-[var(--chrome-text-200)] placeholder-gray-600 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatM.isPending}
              className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-cyan-500 transition-all"
            >
              <Send size={15} />
            </button>
          </form>
          <p className="text-[10px] text-[var(--chrome-text-600)] font-mono mt-2 text-center">
            {t('assistant_footer_note')}
          </p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}


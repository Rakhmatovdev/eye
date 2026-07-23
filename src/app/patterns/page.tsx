'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { patternsApi, type Pattern } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { mockPatterns } from '../../data/mockPatterns';
import { Sparkles, AlertCircle } from 'lucide-react';
import { PATTERN_TYPE_KEY, PATTERN_TYPE_ICON, scoreColorClass, scoreBarColorClass } from '../../lib/patternUi';

export default function PatternsPage() {
  const t = useT();
  const { data, isError } = useQuery({ queryKey: ['patterns'], queryFn: () => patternsApi.list() });
  const usingFallback = isError;
  const patterns: Pattern[] = (usingFallback ? mockPatterns : data ?? []).slice().sort((a, b) => b.score - a.score);

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400" /> {t('patterns_title')}
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{t('patterns_subtitle')}</p>
          </div>
          {usingFallback && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono h-fit">
              {t('common_demo_data_badge')}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {patterns.map((p) => {
            const Icon = PATTERN_TYPE_ICON[p.type] || Sparkles;
            return (
              <div key={p.id} data-testid="pattern-row" data-pattern-type={p.type} className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-5 space-y-3 hover:border-cyan-500/20 transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Icon size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-cyan-400">{t(PATTERN_TYPE_KEY[p.type] ?? 'patterns_type_hub_entity')}</span>
                      <h3 className="text-sm font-bold text-gray-200 font-mono">{p.title}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-2xl font-bold font-mono ${scoreColorClass(p.score)}`}>{p.score}</div>
                    <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{t('patterns_score_label')}</div>
                  </div>
                </div>

                <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBarColorClass(p.score)}`} style={{ width: `${Math.min(100, Math.max(0, p.score))}%` }} />
                </div>

                {p.evidence.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold font-mono uppercase tracking-widest text-gray-600 mb-1">{t('patterns_evidence_title')}</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {p.evidence.map((e, i) => (
                        <li key={i} className="text-xxs font-mono text-gray-500">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.entity_ids.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {p.entity_ids.map((id) => (
                      <Link key={id} href={`/entity/${id}`} className="text-xxs font-mono text-cyan-400 hover:underline bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-2 py-1">
                        {id}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {patterns.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('patterns_no_patterns')}</p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { watchlistApi, type WatchlistEntry } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { mockWatchlist } from '../../data/mockWatchlist';
import { Eye, Trash2, User, AlertCircle } from 'lucide-react';

export default function WatchlistPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ['watchlist'], queryFn: () => watchlistApi.list() });
  const usingFallback = isError;
  const entries: WatchlistEntry[] = usingFallback ? mockWatchlist : data ?? [];

  const [error, setError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<WatchlistEntry | null>(null);

  const removeM = useMutation({
    mutationFn: (id: string) => watchlistApi.remove(id),
    onSuccess: () => {
      setError('');
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('watchlist_remove_error')));
      setRemoveTarget(null);
    },
  });

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <Eye size={18} className="text-cyan-400" /> {t('watchlist_title')}
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{t('watchlist_subtitle')}</p>
          </div>
          <span className="text-[10px] font-mono text-gray-600 flex items-center gap-2">
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                {t('common_demo_data_badge')}
              </span>
            )}
            {entries.length}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              data-testid="watchlist-row"
              className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-cyan-500/20 transition-all"
            >
              <div className="min-w-0 flex-1">
                <Link href={`/entity/${e.entity_id}`} className="text-sm font-bold text-gray-200 font-mono hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <User size={13} className="text-cyan-400" /> {e.entity_label}
                </Link>
                {e.note && <p className="text-xs text-gray-500 font-mono mt-1 leading-relaxed">{e.note}</p>}
                <p className="text-xxs font-mono text-gray-600 mt-1">
                  {t('watchlist_added_by_prefix')} {e.created_by} · {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                data-testid="watchlist-remove-btn"
                onClick={() => setRemoveTarget(e)}
                title={t('watchlist_remove_btn')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xxs font-bold font-mono transition-all shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('watchlist_no_entries')}</p>
            </div>
          )}
        </div>
      </div>

      {removeTarget && (
        <ConfirmDialog
          title={t('watchlist_remove_btn')}
          message={`${removeTarget.entity_label}`}
          isPending={removeM.isPending}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => removeM.mutate(removeTarget.id)}
        />
      )}
    </WorkspaceLayout>
  );
}

'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { mockEntities, type Entity } from '../../data/mockEntities';
import { entitiesApi, watchlistApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { Search as SearchIcon, Filter, Eye, AlertCircle, Bookmark, BookmarkCheck } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');

  const watchlistQ = useQuery({ queryKey: ['watchlist'], queryFn: () => watchlistApi.list(), retry: false });
  const watchedIds = new Set((watchlistQ.data ?? []).map((w) => w.entity_id));

  const addWatchlistM = useMutation({
    mutationFn: (entityId: string) => watchlistApi.add(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success(t('watchlist_add_btn'));
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast(t('watchlist_already'));
        return;
      }
      toast.error(apiErrorMessage(err, t('watchlist_add_error')));
    },
  });

  // Live entities from the backend. `type`/`search` are server-side filters;
  // classification is filtered client-side (no server param for it in MVP).
  const { data, isError } = useQuery({
    queryKey: ['entities', query, selectedType],
    queryFn: () => entitiesApi.list({ search: query, type: selectedType }),
  });

  // Fall back to bundled demo data only when the API is unreachable, so the UI
  // still renders something during local development without a backend.
  const usingFallback = isError;
  const sourceEntities: Entity[] = usingFallback ? mockEntities : data ?? [];

  const filteredEntities = sourceEntities.filter(ent => {
    // When falling back, apply the same query/type filters client-side.
    const matchesQuery = !usingFallback || query === '' ||
      ent.name.toLowerCase().includes(query.toLowerCase()) ||
      ent.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
      Object.values(ent.properties).some(v => String(v).toLowerCase().includes(query.toLowerCase()));

    const matchesType = !usingFallback || selectedType === 'all' || ent.type === selectedType;
    const matchesClassification = selectedClassification === 'all' || ent.classification === selectedClassification;

    return matchesQuery && matchesType && matchesClassification;
  });

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase">{t('search_title')}</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{t('search_subtitle')}</p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
            <SearchIcon size={18} />
          </span>
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#0c0e17] border border-gray-800 rounded-2xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-[#0c0e17]/40 p-4 border border-gray-800/60 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
            <Filter size={14} />
            <span>{t('search_filters_label')}</span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono"
          >
            <option value="all">{t('search_type_all')}</option>
            <option value="person">{t('search_type_person')}</option>
            <option value="organization">{t('search_type_organization')}</option>
            <option value="phone">{t('search_type_phone')}</option>
            <option value="location">{t('search_type_location')}</option>
            <option value="vehicle">{t('search_type_vehicle')}</option>
            <option value="document">{t('search_type_document')}</option>
            <option value="transaction">{t('search_type_transaction')}</option>
          </select>

          {/* Classification Filter */}
          <select
            value={selectedClassification}
            onChange={e => setSelectedClassification(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono"
          >
            <option value="all">{t('search_class_all')}</option>
            <option value="public">{t('search_class_public')}</option>
            <option value="internal">{t('search_class_internal')}</option>
            <option value="confidential">{t('search_class_confidential')}</option>
            <option value="secret">{t('search_class_secret')}</option>
          </select>

          <span className="text-[10px] font-mono text-gray-600 ml-auto flex items-center gap-2">
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                {t('common_demo_data_badge')}
              </span>
            )}
            {t('search_showing_prefix')} {filteredEntities.length} {t('search_showing_suffix')}
          </span>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntities.map(ent => (
            <div key={ent.id} className="bg-[#0e1220]/60 border border-gray-800/60 p-5 rounded-2xl flex flex-col justify-between h-48 hover:border-cyan-500/30 transition-all group relative">
              
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold font-mono text-cyan-400 uppercase tracking-widest">{ent.type}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    ent.classification === 'secret' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    ent.classification === 'confidential' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                  }`}>
                    {ent.classification}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-gray-200 group-hover:text-cyan-400 transition-colors font-mono">{ent.name}</h3>
              </div>

              {/* Quick details */}
              <div className="text-xxs font-mono text-gray-500 space-y-1 bg-gray-950/40 p-3 rounded-xl border border-gray-800/40">
                {Object.entries(ent.properties).slice(0, 2).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k.split('_').join(' ')}:</span>
                    <span className="text-gray-300 font-semibold truncate max-w-[150px]">{String(v)}</span>
                  </div>
                ))}
              </div>

              {/* Footer actions */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-800/40 text-xxs font-mono">
                <span className="text-gray-600 truncate max-w-[150px]">{ent.source}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => !watchedIds.has(ent.id) && addWatchlistM.mutate(ent.id)}
                    disabled={watchedIds.has(ent.id) || addWatchlistM.isPending}
                    title={watchedIds.has(ent.id) ? t('watchlist_on_watchlist') : t('watchlist_add_btn')}
                    className={`p-1 rounded transition-all ${watchedIds.has(ent.id) ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
                  >
                    {watchedIds.has(ent.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  </button>
                  <Link
                    href={`/entity/${ent.id}`}
                    className="flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    <Eye size={12} />
                    <span>{t('search_profile_link')}</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {filteredEntities.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('search_no_results')}</p>
            </div>
          )}
        </div>

      </div>
    </WorkspaceLayout>
  );
}

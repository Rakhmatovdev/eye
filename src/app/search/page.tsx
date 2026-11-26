'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { entitiesApi, watchlistApi, savedSearchesApi, casesApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { triggerDownload } from '../../lib/download';
import { useT } from '../../lib/i18n';
import { Search as SearchIcon, Filter, Eye, AlertCircle, Bookmark, BookmarkCheck, Download, BookmarkPlus, Trash2, FolderPlus } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (query.trim() === debouncedQuery) return;
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [attachingEntityId, setAttachingEntityId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState('');
  const casesQ = useQuery({
    queryKey: ['cases'],
    queryFn: () => (casesApi?.list ? casesApi.list() : Promise.resolve([])),
    enabled: !!attachingEntityId,
    retry: false,
  });
  const chosenCase = casesQ.data?.find(c => c.id === selectedCase);
  const attachCaseM = useMutation({
    mutationFn: ({ caseId, entityId }: { caseId: string; entityId: string }) => casesApi.addEntity(caseId, entityId),
    onSuccess: (_data, vars) => {
      setAttachingEntityId(null);
      void queryClient.invalidateQueries({ queryKey: ['case-entities', vars.caseId] });
      toast.success(t('search_add_to_case_success'));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('search_add_to_case_error'))),
  });

  const watchlistQ = useQuery({ queryKey: ['watchlist'], queryFn: () => watchlistApi.list(), retry: false });
  const savedSearchesQ = useQuery({ queryKey: ['saved-searches'], queryFn: () => savedSearchesApi.list(), retry: false });
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

  const saveSearchM = useMutation({
    mutationFn: () => savedSearchesApi.create({ name: savedSearchName.trim(), query: query.trim(), type: selectedType, classification: selectedClassification }),
    onSuccess: () => { setSavedSearchName(''); queryClient.invalidateQueries({ queryKey: ['saved-searches'] }); toast.success(t('search_saved_save')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('common_save'))),
  });
  const deleteSearchM = useMutation({
    mutationFn: (id: string) => savedSearchesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
    onError: (err) => toast.error(apiErrorMessage(err, t('common_delete'))),
  });
	const alertsM = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => savedSearchesApi.setAlerts(id, enabled),
		onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['saved-searches'] }); void queryClient.invalidateQueries({ queryKey: ['workspace-inbox'] }); },
		onError: (err) => toast.error(apiErrorMessage(err, t('common_save'))),
	});

  const params = { search: debouncedQuery, type: selectedType, classification: selectedClassification, page, limit: 20 };
  const { data, isError, isPending, isFetching, refetch } = useQuery({
    queryKey: ['entities', 'search', params],
    queryFn: ({ signal }) => entitiesApi.search(params, signal), retry: false,
  });
  const filteredEntities = isError ? [] : data?.entities ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / params.limit));
  const waitingForQuery = query.trim() !== debouncedQuery;
  const exportCsvM = useMutation({
    mutationFn: () => entitiesApi.exportCsv({ search: debouncedQuery, type: selectedType, classification: selectedClassification }),
    onSuccess: (blob) => triggerDownload(blob, 'entities.csv'),
    onError: (err) => toast.error(apiErrorMessage(err, t('export_csv_error'))),
  });

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase">{t('search_title')}</h1>
          <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">{t('search_subtitle')}</p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[var(--chrome-text-500)]">
            <SearchIcon size={18} />
          </span>
          <input
            type="text"
            aria-label={t('search_placeholder')}
            placeholder={t('search_placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl text-sm text-[var(--chrome-text-300)] placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-[color-mix(in_srgb,var(--bg-card)_40%,transparent)] p-4 border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--chrome-text-500)] uppercase tracking-wider">
            <Filter size={14} />
            <span>{t('search_filters_label')}</span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            aria-label={t('search_type_all')}
            onChange={e => { setSelectedType(e.target.value); setPage(1); }}
            className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-1.5 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono"
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
            aria-label={t('search_class_all')}
            onChange={e => { setSelectedClassification(e.target.value); setPage(1); }}
            className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-1.5 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono"
          >
            <option value="all">{t('search_class_all')}</option>
            <option value="public">{t('search_class_public')}</option>
            <option value="internal">{t('search_class_internal')}</option>
            <option value="confidential">{t('search_class_confidential')}</option>
            <option value="secret">{t('search_class_secret')}</option>
          </select>

          <span className="text-[10px] font-mono text-[var(--chrome-text-600)] ml-auto flex items-center gap-2">
            {t('search_showing_prefix')} {total} {t('search_showing_suffix')}
          </span>

          {!isError && (
            <button
              onClick={() => exportCsvM.mutate()}
              disabled={exportCsvM.isPending || isFetching || waitingForQuery || total === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
            >
              <Download size={12} /> {t('export_csv_btn')}
            </button>
          )}
        </div>

        <section aria-labelledby="saved-searches-heading" className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg-card)_40%,transparent)]">
          <h2 id="saved-searches-heading" className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--chrome-text-400)]">{t('search_saved_heading')}</h2>
          <form onSubmit={(event) => { event.preventDefault(); if (savedSearchName.trim()) saveSearchM.mutate(); }} className="flex flex-1 min-w-[240px] gap-2">
            <input aria-label={t('search_saved_name')} maxLength={80} value={savedSearchName} onChange={(event) => setSavedSearchName(event.target.value)} placeholder={t('search_saved_name')} className="min-w-0 flex-1 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--chrome-text-300)]" />
            <button type="submit" disabled={!savedSearchName.trim() || saveSearchM.isPending || waitingForQuery || savedSearchesQ.isError || (savedSearchesQ.data?.length ?? 0) >= 50} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-600/15 border border-cyan-500/30 text-[var(--accent-cyan-soft)] text-xs font-mono disabled:opacity-40"><BookmarkPlus size={13} />{t('search_saved_save')}</button>
          </form>
          {savedSearchesQ.isError ? <button onClick={() => savedSearchesQ.refetch()} className="text-xs underline">{t('common_retry')}</button> : (
            <div className="flex flex-wrap gap-2">
              {(savedSearchesQ.data ?? []).map((saved) => <div key={saved.id} className="flex items-center gap-1 rounded-lg border border-[var(--chrome-border-800)] px-2 py-1">
                <button onClick={() => { setQuery(saved.query); setDebouncedQuery(saved.query); setSelectedType(saved.type || 'all'); setSelectedClassification(saved.classification || 'all'); setPage(1); }} className="text-xs text-[var(--chrome-text-300)] hover:text-[var(--accent-cyan-soft)]">{saved.name}</button>
                <button aria-label={`${t('search_saved_delete')}: ${saved.name}`} disabled={deleteSearchM.isPending} onClick={() => deleteSearchM.mutate(saved.id)} className="p-1 text-[var(--chrome-text-500)] hover:text-[var(--accent-red-soft)] disabled:opacity-40"><Trash2 size={12} /></button>
				<button aria-label={`${t(saved.alerts_enabled ? 'search_alerts_on' : 'search_alerts_off')}: ${saved.name}`} aria-pressed={!!saved.alerts_enabled} disabled={alertsM.isPending} onClick={() => alertsM.mutate({ id: saved.id, enabled: !saved.alerts_enabled })} className="px-2 py-1 text-xs text-[var(--accent-cyan-soft)] disabled:opacity-40">{t(saved.alerts_enabled ? 'search_alerts_on' : 'search_alerts_off')}</button>
              </div>)}
            </div>
          )}
          <span className="w-full text-[10px] text-[var(--chrome-text-600)] font-mono">{t('search_saved_limit')}</span>
		  <p className="w-full text-xs text-[var(--chrome-text-400)]">{t('search_alerts_note')}</p>
        </section>

        {isError && <div role="alert" className="p-4 rounded-xl border border-red-500/30 text-[var(--accent-red-soft)]">
          <p>{t('common_load_error')}</p>
          <button onClick={() => refetch()} className="mt-2 underline">{t('common_retry')}</button>
        </div>}
        {(isPending || isFetching || waitingForQuery) && <p role="status">{t('common_loading')}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button onClick={() => { setQuery(''); setDebouncedQuery(''); setSelectedType('all'); setSelectedClassification('all'); setPage(1); }} className="underline">{t('search_reset')}</button>
          <nav aria-label={t('search_pages')} className="flex items-center gap-4">
            <button disabled={page <= 1 || isFetching || waitingForQuery} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">{t('search_previous')}</button>
            <span aria-live="polite">{page} / {pages}</span>
            <button disabled={page >= pages || isFetching || isError || waitingForQuery} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">{t('search_next')}</button>
          </nav>
        </div>
        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntities.map(ent => (
            <div key={ent.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-5 rounded-2xl flex flex-col justify-between h-48 hover:border-cyan-500/30 transition-all group relative">
              
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold font-mono text-[var(--accent-cyan-soft)] uppercase tracking-widest">{ent.type}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    ent.classification === 'secret' ? 'bg-red-500/10 text-[var(--accent-red-soft)] border border-red-500/20' :
                    ent.classification === 'confidential' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)] text-[var(--chrome-text-500)] border border-[color-mix(in_srgb,var(--chrome-border-500)_20%,transparent)]'
                  }`}>
                    {ent.classification}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[var(--chrome-text-200)] group-hover:text-[var(--accent-cyan-soft)] transition-colors font-mono">{ent.name}</h3>
              </div>

              {/* Quick details */}
              <div className="text-xxs font-mono text-[var(--chrome-text-500)] space-y-1 bg-[color-mix(in_srgb,var(--bg-main)_40%,transparent)] p-3 rounded-xl border border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)]">
                {Object.entries(ent.properties).slice(0, 2).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k.split('_').join(' ')}:</span>
                    <span className="text-[var(--chrome-text-300)] font-semibold truncate max-w-[150px]">{String(v)}</span>
                  </div>
                ))}
              </div>

              {/* Footer actions */}
              <div className="flex justify-between items-center pt-2 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)] text-xxs font-mono">
                <span className="text-[var(--chrome-text-600)] truncate max-w-[150px]">{ent.source}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`${t('search_add_to_case_btn')}: ${ent.name}`}
                    title={t('search_add_to_case_btn')}
                    onClick={() => {
                      setSelectedCase(new URLSearchParams(window.location.search).get('case') ?? '');
                      setAttachingEntityId(ent.id);
                    }}
                    className="p-1 rounded text-[var(--chrome-text-500)] hover:text-[var(--accent-cyan-soft)] transition-all"
                  >
                    <FolderPlus size={13} />
                  </button>
                  <button
                    onClick={() => !watchedIds.has(ent.id) && addWatchlistM.mutate(ent.id)}
                    disabled={watchedIds.has(ent.id) || addWatchlistM.isPending || watchlistQ.isPending || watchlistQ.isError}
                    title={watchedIds.has(ent.id) ? t('watchlist_on_watchlist') : t('watchlist_add_btn')}
                    className={`p-1 rounded transition-all ${watchedIds.has(ent.id) ? 'text-[var(--accent-amber-soft)]' : 'text-[var(--chrome-text-500)] hover:text-[var(--accent-amber-soft)]'}`}
                  >
                    {watchedIds.has(ent.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  </button>
                  <Link
                    href={`/entity/${ent.id}`}
                    className="flex items-center gap-1 text-[var(--accent-cyan-soft)] hover:underline"
                  >
                    <Eye size={12} />
                    <span>{t('search_profile_link')}</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!isPending && !isError && !waitingForQuery && filteredEntities.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-[var(--chrome-text-500)] gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('search_no_results')}</p>
            </div>
          )}
        </div>

        {attachingEntityId && (
          <div role="dialog" aria-label={t('search_add_to_case_title')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl p-5 space-y-3 max-h-[80vh] flex flex-col font-mono">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--chrome-text-white)]">{t('search_add_to_case_title')}</h2>
              <div className="flex-1 overflow-y-auto space-y-2">
                {casesQ.isLoading && <p role="status" className="text-xs text-[var(--chrome-text-500)]">{t('common_loading')}</p>}
                {casesQ.isError && <button onClick={() => casesQ.refetch()}>{t('common_retry')}</button>}
                {!!casesQ.data?.length && <>
                  <select aria-label={t('search_add_to_case_title')} value={chosenCase?.id ?? ''} disabled={attachCaseM.isPending}
                    onChange={event => setSelectedCase(event.target.value)} className="nexus-input w-full">
                    <option value="" disabled>{t('search_add_to_case_title')}</option>
                    {casesQ.data.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button disabled={!chosenCase || attachCaseM.isPending} className="disabled:opacity-40"
                    onClick={() => chosenCase && attachCaseM.mutate({ caseId: chosenCase.id, entityId: attachingEntityId })}>
                    {t('search_add_to_case_title')}
                  </button>
                </>}
                {!casesQ.isError && !casesQ.isLoading && (casesQ.data ?? []).length === 0 && (
                  <p className="text-xs text-[var(--chrome-text-500)] py-4 text-center">{t('search_add_to_case_empty')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAttachingEntityId(null)}
                className="px-3 py-1.5 text-xs text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] self-start"
              >
                {t('common_cancel')}
              </button>
            </div>
          </div>
        )}

      </div>
    </WorkspaceLayout>
  );
}

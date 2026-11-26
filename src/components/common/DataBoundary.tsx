'use client';
import React from 'react';
import { useT } from '../../lib/i18n';

export type QueryState = {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
};

// Never render operational results while a required source is unavailable.
// Disabled/optional queries must only be passed when their section is active.
export default function DataBoundary({ queries, children }: { queries: QueryState[]; children?: React.ReactNode }) {
  const t = useT();
  const failed = queries.filter(q => q.isError);
  if (failed.length > 0) {
    return <div role="alert" className="m-4 p-5 rounded-xl border border-red-500/30 text-[var(--accent-red-soft)] font-mono text-sm">
      <p>{t('common_load_error')}</p>
      <button disabled={failed.some(q => q.isFetching)} onClick={() => { void Promise.allSettled(failed.map(q => q.refetch())); }} className="mt-3 underline disabled:opacity-40">
        {t('common_retry')}
      </button>
    </div>;
  }
  if (queries.some(q => q.isPending)) {
    return <div role="status" className="p-6 text-[var(--chrome-text-500)] font-mono text-sm">{t('common_loading')}</div>;
  }
  return <>{children}</>;
}

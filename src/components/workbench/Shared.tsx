'use client';
import React from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useLocaleStore } from '../../store/localeStore';

export function QueryState({ query, empty = false }: { query: { isPending: boolean; isError: boolean; refetch: () => unknown }; empty?: boolean }) {
  const t = useT();
  if (query.isPending) return <div role="status" className="wb-empty"><RefreshCw className="animate-spin" size={22} />{t('common_loading')}</div>;
  if (query.isError) return <div role="alert" className="wb-empty"><p>{t('common_load_error')}</p><button className="dashboard-secondary-button" onClick={() => query.refetch()}>{t('common_retry')}</button></div>;
  if (empty) return <div className="wb-empty"><Inbox size={28} strokeWidth={1.3} /><p>{t('wb_empty')}</p></div>;
  return null;
}
export function ErrorMessage({ message }: { message: string }) { return message ? <p className="wb-error" role="alert">{message}</p> : null; }
export function DateLabel({ value }: { value: string }) {
  const locale = useLocaleStore(s => s.locale);
  return <time dateTime={value}>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}</time>;
}

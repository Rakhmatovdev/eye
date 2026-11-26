'use client';
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Send } from 'lucide-react';
import { workspaceApi, type CaseWorkspace } from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { useAuthStore } from '../../store/authStore';
import { DateLabel, ErrorMessage, QueryState } from './Shared';

export default function Discussion({ caseId, context }: { caseId: string; context: CaseWorkspace }) {
  const t = useT(); const user = useAuthStore(s => s.user); const qc = useQueryClient();
  const query = useQuery({ queryKey: ['case-comments', caseId, user?.id], queryFn: () => workspaceApi.comments(caseId), refetchInterval: 30_000 });
  useEffect(() => {
    if (window.location.hash.startsWith('#comment-')) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: 'center' });
  }, [query.data]);
  const [body, setBody] = useState(''); const [mentions, setMentions] = useState<string[]>([]); const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: () => workspaceApi.addComment(caseId, { body: body.trim(), mention_ids: mentions }), onSuccess: () => { setBody(''); setMentions([]); setError(''); void qc.invalidateQueries({ queryKey: ['case-comments', caseId] }); }, onError: e => setError(apiErrorMessage(e, t('wb_error'))) });
  return <div className="wb-stack wb-discussion"><div className="wb-toolbar"><div><h2>{t('wb_discussion')}</h2><p>{t('wb_discussion_note')}</p></div></div>
    {context.can_write && <form className="wb-comment-form wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><label>{t('wb_comment')}<textarea required rows={4} maxLength={8000} value={body} onChange={e => setBody(e.target.value)} /></label><fieldset className="wb-mention-picker"><legend><AtSign size={14} />{t('wb_mentions')}</legend>{context.participants.filter(p => p.id !== user?.id).map(p => <label key={p.id} className={mentions.includes(p.id) ? 'is-selected' : ''}><input type="checkbox" checked={mentions.includes(p.id)} disabled={!mentions.includes(p.id) && mentions.length >= 20} onChange={e => setMentions(old => e.target.checked ? [...old, p.id] : old.filter(id => id !== p.id))} /><span>{p.name}</span></label>)}</fieldset><ErrorMessage message={error} /><button className="dashboard-primary-button" disabled={mutation.isPending || !body.trim()}><Send size={15} />{mutation.isPending ? t('common_loading') : t('wb_post')}</button></form>}
    <QueryState query={query} empty={!query.data?.length} /><div className="wb-comments">{query.data?.map(c => <article key={c.id} id={`comment-${c.id}`} className="wb-comment"><span className="wb-avatar">{c.author.name.slice(0, 1).toLocaleUpperCase()}</span><div><header><strong>{c.author.name}</strong><DateLabel value={c.created_at} /></header><p className="wb-prose">{c.body}</p>{c.mentions.length > 0 && <div className="wb-mentioned">{c.mentions.map(p => <span key={p.id}>@{p.name}</span>)}</div>}</div></article>)}</div>
  </div>;
}

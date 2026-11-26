'use client';
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Mail, Send } from 'lucide-react';
import { workspaceApi, type NotificationPreferences } from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { ErrorMessage, QueryState } from './Shared';

export default function NotificationChannels() {
  const t = useT(); const qc = useQueryClient(); const query = useQuery({queryKey:['workspace-notification-preferences'],queryFn:workspaceApi.notificationPreferences});
  const [form,setForm] = useState<NotificationPreferences>({email_enabled:false,telegram_enabled:false,telegram_chat_id:''}); const [error,setError] = useState('');
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  const save = useMutation({mutationFn:()=>workspaceApi.saveNotificationPreferences(form),onSuccess:data=>{setForm(data);setError('');void qc.invalidateQueries({queryKey:['workspace-notification-preferences']});},onError:e=>setError(apiErrorMessage(e,t('wb_error')))});
  return <details className="wb-channel-settings"><summary><BellRing size={15}/>{t('wb_channels')}</summary><QueryState query={query}/>{query.data && <form className="wb-form" onSubmit={e=>{e.preventDefault();save.mutate();}}><label className="wb-toggle"><input type="checkbox" checked={form.email_enabled} onChange={e=>setForm({...form,email_enabled:e.target.checked})}/><Mail size={15}/>{t('wb_channel_email')}</label><label className="wb-toggle"><input type="checkbox" checked={form.telegram_enabled} onChange={e=>setForm({...form,telegram_enabled:e.target.checked})}/><Send size={15}/>{t('wb_channel_telegram')}</label>{form.telegram_enabled && <label>{t('wb_telegram_chat')}<input required maxLength={80} value={form.telegram_chat_id} onChange={e=>setForm({...form,telegram_chat_id:e.target.value})}/></label>}<p className="wb-muted">{t('wb_channels_note')}</p><ErrorMessage message={error}/><button className="dashboard-primary-button" disabled={save.isPending}>{t('wb_save')}</button></form>}</details>;
}

'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCheck, Loader2, Mail } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const forgot = useMutation({ mutationFn: () => authApi.forgotPassword(email.trim()) });
  return <AuthLayout title={t(forgot.isSuccess ? 'forgot_check_email' : 'forgot_title')} description={t('forgot_subtitle')}>
    {forgot.isSuccess ? <div className="auth-result">
      <span className="auth-result-icon"><CheckCheck size={26} /></span>
      <p role="status">{t('forgot_success')}</p>
      {forgot.data.resetLink && <div className="auth-dev-link">{t('forgot_dev_hint')} <Link href={forgot.data.resetLink}>{forgot.data.resetLink}</Link></div>}
      <button type="button" className="dashboard-secondary-button w-full" onClick={() => { forgot.reset(); setEmail(''); }}>{t('forgot_try_another')}</button>
    </div> : <form onSubmit={event => { event.preventDefault(); if (!forgot.isPending) forgot.mutate(); }} aria-busy={forgot.isPending}>
      {forgot.isError && <p id="forgot-error" role="alert" className="login-form-error">{apiErrorMessage(forgot.error, t('forgot_error'))}</p>}
      <div className="login-field"><label htmlFor="recovery-email">{t('forgot_email_label')}</label><div className="login-input-wrap"><Mail size={15} /><input id="recovery-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={forgot.isPending} className="login-input" placeholder="analyst@platform.io" aria-describedby={forgot.isError ? 'forgot-error' : undefined} /></div></div>
      <button type="submit" disabled={forgot.isPending || !email.trim()} className="dashboard-primary-button login-submit">{forgot.isPending && <Loader2 size={15} className="animate-spin" />}{t(forgot.isPending ? 'forgot_submitting' : 'forgot_submit')}<ArrowRight size={16} /></button>
    </form>}
    <Link href="/login" className="auth-back-link"><ArrowLeft size={14} />{t('forgot_back_to_login')}</Link>
  </AuthLayout>;
}
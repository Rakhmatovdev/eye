'use client';
import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';

function ResetLoading() {
  const t = useT();
  return <AuthLayout title={t('reset_title')} description={t('reset_subtitle')}><p role="status" className="auth-result">{t('common_loading')}</p></AuthLayout>;
}
export default function ResetPasswordPage() {
  return <Suspense fallback={<ResetLoading />}><ResetPasswordForm /></Suspense>;
}
function ResetPasswordForm() {
  const t = useT();
  const token = useSearchParams().get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const reset = useMutation({ mutationFn: () => authApi.resetPassword(token, newPassword) });
  const error = mismatch ? t('reset_mismatch') : reset.isError ? apiErrorMessage(reset.error, t('reset_error_default')) : '';
  return <AuthLayout title={t('reset_title')} description={t('reset_subtitle')}>
    {!token ? <div className="auth-result"><p role="alert" className="login-form-error">{t('reset_missing_token')}</p><Link href="/forgot-password" className="dashboard-primary-button w-full">{t('reset_request_new')}<ArrowRight size={15} /></Link></div>
      : reset.isSuccess ? <div className="auth-result"><span className="auth-result-icon"><CheckCheck size={26} /></span><p role="status">{t('reset_success')}</p><Link href="/login" className="dashboard-primary-button w-full">{t('reset_login_link')}<ArrowRight size={15} /></Link></div>
      : <form onSubmit={event => {
        event.preventDefault();
        if (reset.isPending) return;
        if (newPassword !== confirmPassword) { setMismatch(true); return; }
        setMismatch(false); reset.mutate();
      }} aria-busy={reset.isPending}>
        {error && <p id="reset-error" role="alert" className="login-form-error">{error}</p>}
        <div className="login-field"><label htmlFor="new-password">{t('reset_new_password_label')}</label><div className="login-input-wrap"><KeyRound size={15} /><input id="new-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={event => { setNewPassword(event.target.value); setMismatch(false); }} required minLength={8} disabled={reset.isPending} className="login-input" aria-describedby="password-hint" /><button type="button" onClick={() => setShowPassword(value => !value)} className="workspace-icon-button" aria-label={t(showPassword ? 'login_hide_password' : 'login_show_password')} aria-pressed={showPassword}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><p id="password-hint" className="auth-field-hint">{t('reset_password_hint')}</p></div>
        <div className="login-field"><label htmlFor="confirm-password">{t('reset_confirm_password_label')}</label><div className="login-input-wrap"><KeyRound size={15} /><input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setMismatch(false); }} required minLength={8} disabled={reset.isPending} className="login-input" aria-invalid={mismatch} aria-describedby={error ? 'reset-error' : undefined} /></div>{confirmPassword && confirmPassword === newPassword && <p className="auth-field-hint auth-match"><Check size={13} />{t('reset_password_matches')}</p>}</div>
        <button type="submit" disabled={reset.isPending || newPassword.length < 8 || confirmPassword.length < 8} className="dashboard-primary-button login-submit">{reset.isPending && <Loader2 size={15} className="animate-spin" />}{t(reset.isPending ? 'reset_submitting' : 'reset_submit')}<ArrowRight size={16} /></button>
        {reset.isError && <Link className="auth-back-link" href="/forgot-password">{t('reset_request_new')}</Link>}
      </form>}
    <Link href="/login" className="auth-back-link"><ArrowLeft size={14} />{t('forgot_back_to_login')}</Link>
  </AuthLayout>;
}
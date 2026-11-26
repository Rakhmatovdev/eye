'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import AuthLayout from '../../components/layout/AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const t = useT();
  const [email, setEmail] = useState('analyst@platform.io');
  const [password, setPassword] = useState('Analyst123!');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await authApi.login(email, password, mfaRequired ? otp : undefined);
      if (result.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }
      login(result.user);
      router.push('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, t(mfaRequired ? 'login_invalid_code' : 'login_invalid_credentials')));
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMfaRequired(false);
    setOtp('');
    setError('');
  };

  return <AuthLayout title={mfaRequired ? t('login_mfa_title') : t('login_heading')} description={mfaRequired ? t('login_mfa_subtitle') : t('login_description')}>
        {error && <div id="login-error" role="alert" className="login-form-error">{error}</div>}
        <form onSubmit={handleLogin} aria-busy={loading} aria-describedby={error ? 'login-error' : undefined}>
          {!mfaRequired ? <>
            <div className="login-field"><label htmlFor="login-email">{t('login_identity_label')}</label><div className="login-input-wrap"><Mail size={15} /><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="login-input" placeholder="analyst@platform.io" required disabled={loading} /></div></div>
            <div className="login-field"><label htmlFor="login-password">{t('login_secret_label')}</label><div className="login-input-wrap"><KeyRound size={15} /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" placeholder="••••••••" required disabled={loading} /><button type="button" className="workspace-icon-button" onClick={() => setShowPassword(value => !value)} aria-label={t(showPassword ? 'login_hide_password' : 'login_show_password')} aria-pressed={showPassword}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
            <div className="login-form-options"><Link href="/forgot-password">{t('login_forgot_link')}</Link></div>
          </> : <div className="login-field"><label htmlFor="login-otp">{t('login_verification_label')}</label><div className="login-input-wrap"><ShieldCheck size={16} /><input id="login-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="login-input text-center tracking-[0.4em] font-mono" placeholder="000000" autoFocus required disabled={loading} /></div></div>}
          <button type="submit" disabled={loading || (mfaRequired && otp.length !== 6)} className="dashboard-primary-button login-submit">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? t(mfaRequired ? 'login_verifying' : 'login_submitting') : t(mfaRequired ? 'login_verify' : 'login_submit')}<ArrowRight size={16} />
          </button>
          {mfaRequired && <button type="button" onClick={handleBack} disabled={loading} className="dashboard-secondary-button w-full mt-3">{t('login_back')}</button>}
        </form>
        {!mfaRequired && <details className="login-demo"><summary>{t('login_demo')}</summary><p>analyst@platform.io<br />Analyst123!</p></details>}
  </AuthLayout>;
}

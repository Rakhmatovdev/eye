'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Key, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const t = useT();

  const [email, setEmail] = useState('analyst@platform.io');
  const [password, setPassword] = useState('Analyst123!');
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
      login(result.user, result.token, result.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, mfaRequired ? 'Invalid verification code.' : 'Authorization credentials rejected.'));
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMfaRequired(false);
    setOtp('');
    setError('');
  };

  return (
    <main className="min-h-screen bg-[#07090F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Matrix grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c101b_1px,transparent_1px),linear-gradient(to_bottom,#0c101b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="w-full max-w-md bg-[#0e121e]/80 border border-gray-800/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-cyan-600/10 text-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
            {mfaRequired ? <ShieldCheck size={24} /> : <Terminal size={24} className="animate-pulse" />}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {mfaRequired ? t('login_mfa_title') : t('login_title')}
          </h2>
          <p className="text-gray-500 text-xxs mt-1">
            {mfaRequired ? t('login_mfa_subtitle') : t('login_subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {!mfaRequired ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('login_identity_label')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600">
                  <Terminal size={14} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50"
                  placeholder="analyst@platform.io"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('login_secret_label')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600">
                  <Key size={14} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10"
            >
              {loading ? t('login_submitting') : t('login_submit')}
            </button>
            <div className="text-center mt-3">
              <Link href="/forgot-password" className="text-xxs text-gray-500 hover:text-cyan-400 transition-all">
                {t('login_forgot_link')}
              </Link>
            </div>
            <div className="text-center mt-3">
              <span className="text-[10px] text-gray-600">analyst@platform.io / Analyst123!</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('login_verification_label')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600">
                  <ShieldAlert size={14} />
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-200 placeholder-gray-700 tracking-[0.4em] text-center font-mono focus:outline-none focus:border-cyan-500/50"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-40"
            >
              {loading ? t('login_verifying') : t('login_verify')}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full py-2 text-gray-500 hover:text-gray-300 rounded-xl text-xxs font-semibold transition-all"
            >
              {t('login_back')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

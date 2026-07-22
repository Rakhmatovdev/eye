'use client';
import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';

// useSearchParams() opts the tree into client-side rendering during static
// export, so Next.js requires it to sit under a Suspense boundary — otherwise
// `next build` fails to prerender this page.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const resetM = useMutation({
    mutationFn: () => authApi.resetPassword(token, newPassword),
    onMutate: () => setError(''),
    onError: (err) => setError(apiErrorMessage(err, t('reset_error_default'))),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('reset_mismatch'));
      return;
    }
    resetM.mutate();
  };

  return (
    <main className="min-h-screen bg-[#07090F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c101b_1px,transparent_1px),linear-gradient(to_bottom,#0c101b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="w-full max-w-md bg-[#0e121e]/80 border border-gray-800/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-cyan-600/10 text-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
            <KeyRound size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">{t('reset_title')}</h2>
          <p className="text-gray-500 text-xxs mt-1">{t('reset_subtitle')}</p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {t('reset_missing_token')}
            </div>
            <div className="text-center">
              <Link href="/forgot-password" className="text-xxs text-gray-500 hover:text-cyan-400 transition-all">
                {t('forgot_back_to_login')}
              </Link>
            </div>
          </div>
        ) : resetM.isSuccess ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {t('reset_success')}
            </div>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10"
            >
              {t('reset_login_link')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('reset_new_password_label')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('reset_confirm_password_label')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={resetM.isPending || !newPassword || !confirmPassword}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-40"
            >
              {resetM.isPending ? t('reset_submitting') : t('reset_submit')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

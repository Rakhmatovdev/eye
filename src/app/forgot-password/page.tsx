'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { MailQuestion } from 'lucide-react';
import { authApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState<string | null>(null);

  const forgotM = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onMutate: () => {
      setError('');
      setDevLink(null);
    },
    onSuccess: (data) => {
      if (data.resetLink) {
        setDevLink(data.resetLink);
      }
    },
    onError: (err) => setError(apiErrorMessage(err, 'Request failed.')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotM.mutate();
  };

  return (
    <main className="min-h-screen bg-[#07090F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c101b_1px,transparent_1px),linear-gradient(to_bottom,#0c101b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="w-full max-w-md bg-[#0e121e]/80 border border-gray-800/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-cyan-600/10 text-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
            <MailQuestion size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">{t('forgot_title')}</h2>
          <p className="text-gray-500 text-xxs mt-1">{t('forgot_subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {forgotM.isSuccess ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {t('forgot_success')}
            </div>
            {devLink && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2.5 rounded-xl text-xxs font-mono break-all">
                {t('forgot_dev_hint')}{' '}
                <Link href={devLink} className="underline">
                  {devLink}
                </Link>
              </div>
            )}
            <div className="text-center">
              <Link href="/login" className="text-xxs text-gray-500 hover:text-cyan-400 transition-all">
                {t('forgot_back_to_login')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('forgot_email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50"
                placeholder="analyst@platform.io"
                required
              />
            </div>

            <button
              type="submit"
              disabled={forgotM.isPending}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10"
            >
              {forgotM.isPending ? t('forgot_submitting') : t('forgot_submit')}
            </button>
            <div className="text-center mt-4">
              <Link href="/login" className="text-xxs text-gray-500 hover:text-cyan-400 transition-all">
                {t('forgot_back_to_login')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { useAuthStore } from '../../store/authStore';
import { authApi, mfaApi, type MFAEnrollment } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { ShieldCheck, ShieldOff, User as UserIcon, Mail, BadgeCheck, KeyRound, Copy, Check, Lock } from 'lucide-react';

// Small "select-all on click" text block for the enrollment secret / otpauth
// URL — no QR/clipboard library, just a monospace box the analyst can copy
// from manually (or via the native Clipboard API on click).
function SelectableField({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API unavailable — selection still works */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-cyan-400 transition-all"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? t('settings_copied') : t('settings_copy')}
        </button>
      </div>
      <div
        onClick={(e) => {
          const range = document.createRange();
          range.selectNodeContents(e.currentTarget);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }}
        className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-cyan-300 font-mono break-all cursor-text select-all"
      >
        {value}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-200 placeholder-gray-700 tracking-[0.4em] text-center font-mono focus:outline-none focus:border-cyan-500/50"
    />
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const storedUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  const meQ = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    initialData: storedUser ?? undefined,
  });

  const mfaEnabled = !!meQ.data?.mfaEnabled;

  const [enrollment, setEnrollment] = useState<MFAEnrollment | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const enrollM = useMutation({
    mutationFn: mfaApi.enroll,
    onMutate: resetFeedback,
    onSuccess: (data) => setEnrollment(data),
    onError: (err) => setError(apiErrorMessage(err, 'Failed to start MFA enrollment.')),
  });

  const verifyM = useMutation({
    mutationFn: (code: string) => mfaApi.verify(code),
    onMutate: resetFeedback,
    onSuccess: () => {
      setSuccess('MFA enabled. You will be asked for a code on your next login.');
      setEnrollment(null);
      setOtp('');
      updateUser({ mfaEnabled: true });
      queryClient.setQueryData(['auth', 'me'], (prev: typeof meQ.data) => prev ? { ...prev, mfaEnabled: true } : prev);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Invalid verification code.')),
  });

  const disableM = useMutation({
    mutationFn: (code: string) => mfaApi.disable(code),
    onMutate: resetFeedback,
    onSuccess: () => {
      setSuccess('MFA disabled for your account.');
      setOtp('');
      updateUser({ mfaEnabled: false });
      queryClient.setQueryData(['auth', 'me'], (prev: typeof meQ.data) => prev ? { ...prev, mfaEnabled: false } : prev);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Invalid verification code.')),
  });

  // Password change form state (separate feedback from the MFA card above).
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const changePasswordM = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onMutate: () => {
      setPwError('');
      setPwSuccess('');
    },
    onSuccess: () => {
      setPwSuccess(t('settings_password_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Backend revokes all refresh tokens on a successful password change —
      // the current access token will keep working only until it expires, so
      // force a clean re-login rather than leaving a half-valid session.
      setTimeout(() => {
        logout();
        router.replace('/login');
      }, 1800);
    },
    onError: (err) => setPwError(apiErrorMessage(err, t('settings_password_error'))),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError(t('settings_password_mismatch'));
      setPwSuccess('');
      return;
    }
    changePasswordM.mutate();
  };

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-3xl mx-auto">
        <div>
          <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase">{t('settings_title')}</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{t('settings_subtitle')}</p>
        </div>

        {/* Account info */}
        <div className="bg-[#0e1220]/60 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono flex items-center gap-2">
            <UserIcon size={14} className="text-cyan-400" /> {t('settings_account')}
          </h2>
          {meQ.isLoading ? (
            <p className="text-xs text-gray-500 font-mono">{t('common_loading')}</p>
          ) : meQ.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-gray-400">
                <UserIcon size={12} className="text-gray-600" />
                <span className="text-gray-200">{meQ.data.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Mail size={12} className="text-gray-600" />
                <span className="text-gray-200">{meQ.data.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <BadgeCheck size={12} className="text-gray-600" />
                <span>{t('settings_role')}: <span className="text-gray-200">{meQ.data.role}</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldCheck size={12} className="text-gray-600" />
                <span>{t('settings_clearance')}: <span className="text-gray-200">{meQ.data.clearance}</span></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400 font-mono">{t('settings_load_failed')}</p>
          )}
        </div>

        {/* Change password */}
        <div className="bg-[#0e1220]/60 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono flex items-center gap-2">
            <Lock size={14} className="text-cyan-400" /> {t('settings_password_title')}
          </h2>

          {pwError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {pwSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('settings_password_current')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('settings_password_new')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('settings_password_confirm')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={changePasswordM.isPending || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
            >
              {changePasswordM.isPending ? t('settings_password_submitting') : t('settings_password_submit')}
            </button>
          </form>
        </div>

        {/* MFA */}
        <div className="bg-[#0e1220]/60 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono flex items-center gap-2">
              <KeyRound size={14} className="text-cyan-400" /> {t('settings_mfa_title')}
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                mfaEnabled
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-gray-500 border-gray-700/40 bg-gray-500/10'
              }`}
            >
              {mfaEnabled ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
              {mfaEnabled ? t('settings_mfa_enabled') : t('settings_mfa_disabled')}
            </span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {success}
            </div>
          )}

          {mfaEnabled ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-mono">
                {t('settings_mfa_disable_hint')}
              </p>
              <div className="flex items-center gap-3 max-w-xs">
                <OtpInput value={otp} onChange={setOtp} />
              </div>
              <button
                onClick={() => disableM.mutate(otp)}
                disabled={otp.length !== 6 || disableM.isPending}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
              >
                {disableM.isPending ? t('settings_mfa_disabling') : t('settings_mfa_disable_btn')}
              </button>
            </div>
          ) : enrollment ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-mono">
                {t('settings_mfa_enroll_hint')}
              </p>
              <SelectableField label={t('settings_secret_label')} value={enrollment.secret} />
              <SelectableField label="otpauth:// URL" value={enrollment.otpauthUrl} />
              <div className="flex items-center gap-3 max-w-xs">
                <OtpInput value={otp} onChange={setOtp} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => verifyM.mutate(otp)}
                  disabled={otp.length !== 6 || verifyM.isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
                >
                  {verifyM.isPending ? t('settings_mfa_verifying') : t('settings_mfa_verify_btn')}
                </button>
                <button
                  onClick={() => { setEnrollment(null); setOtp(''); resetFeedback(); }}
                  className="px-4 py-2 text-gray-500 hover:text-gray-300 rounded-xl text-xs font-semibold font-mono transition-all"
                >
                  {t('common_cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-mono">
                {t('settings_mfa_enable_hint')}
              </p>
              <button
                onClick={() => enrollM.mutate()}
                disabled={enrollM.isPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
              >
                {enrollM.isPending ? t('settings_mfa_starting') : t('settings_mfa_enable_btn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

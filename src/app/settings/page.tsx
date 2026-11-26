'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, type Theme } from '../../store/themeStore';
import { authApi, mfaApi, sessionsApi, type MFAEnrollment, type Session } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import {
  ShieldCheck, ShieldOff, User as UserIcon, Mail, BadgeCheck, KeyRound, Copy, Check, Lock, Palette, Sun, Moon,
  Monitor, LogOut, Trash2,
} from 'lucide-react';

// Small "select-all on click" text block for the enrollment secret / otpauth
// URL — no QR/clipboard library, just a monospace box the analyst can copy
// from manually (or via the native Clipboard API on click).
function SelectableField({ label, value, testId }: { label: string; value: string; testId?: string }) {
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
        <label className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-[var(--chrome-text-500)] hover:text-[var(--accent-cyan-soft)] transition-all"
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
        data-testid={testId}
        className="w-full px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-cyan-300 font-mono break-all cursor-text select-all"
      >
        {value}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      data-testid={testId}
      className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-sm text-[var(--chrome-text-200)] placeholder-gray-700 tracking-[0.4em] text-center font-mono focus:outline-none focus:border-cyan-500/50"
    />
  );
}

function SessionsCard() {
  const t = useT();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);

  const sessionsQ = useQuery({ queryKey: ['auth', 'sessions'], queryFn: sessionsApi.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });

  const revokeM = useMutation({
    mutationFn: (id: string) => sessionsApi.revoke(id),
    onSuccess: () => {
      setError('');
      setNotice('');
      setRevokeTarget(null);
      invalidate();
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('settings_sessions_revoke_error')));
      setRevokeTarget(null);
    },
  });

  const revokeOthersM = useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: (count) => {
      setError('');
      setConfirmRevokeOthers(false);
      setNotice(`${count} ${t('settings_sessions_revoked_success')}`);
      invalidate();
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('settings_sessions_revoke_error')));
      setConfirmRevokeOthers(false);
    },
  });

  const sessions = sessionsQ.data ?? [];
  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <div className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xs font-bold text-[var(--chrome-text-300)] uppercase tracking-widest font-mono flex items-center gap-2">
          <Monitor size={14} className="text-[var(--accent-cyan-soft)]" /> {t('settings_sessions_title')}
        </h2>
        <button
          data-testid="sessions-revoke-others-btn"
          onClick={() => setConfirmRevokeOthers(true)}
          disabled={!hasOtherSessions || revokeOthersM.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--accent-red-soft)] border border-red-500/20 hover:bg-red-500/10 rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
        >
          <LogOut size={12} /> {t('settings_sessions_revoke_others_btn')}
        </button>
      </div>

      <p className="text-xxs text-[var(--chrome-text-500)] font-mono leading-relaxed">{t('settings_sessions_hint')}</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-[var(--accent-emerald-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
          {notice}
        </div>
      )}

      {sessionsQ.isError ? (
        <p className="text-xs text-[var(--accent-red-soft)] font-mono">{t('settings_sessions_load_error')}</p>
      ) : (
        <div className="space-y-2" data-testid="sessions-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--chrome-text-200)]">{s.deviceLabel}</span>
                  {s.isCurrent && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-[var(--accent-cyan-soft)] border border-cyan-500/20">
                      {t('settings_sessions_current_badge')}
                    </span>
                  )}
                </div>
                <p className="text-xxs font-mono text-[var(--chrome-text-500)] mt-0.5">
                  {t('settings_sessions_ip_prefix')} {s.ip} · {t('settings_sessions_last_used_prefix')} {new Date(s.lastUsedAt).toLocaleString()}
                </p>
              </div>
              <button
                data-testid="sessions-revoke-btn"
                onClick={() => setRevokeTarget(s)}
                disabled={s.isCurrent || revokeM.isPending}
                title={t('settings_sessions_revoke_btn')}
                className="p-2 rounded-lg text-[var(--accent-red-soft)] hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title={t('settings_sessions_revoke_confirm')}
          message={revokeTarget.deviceLabel}
          confirmLabel={t('settings_sessions_revoke_btn')}
          isPending={revokeM.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => revokeM.mutate(revokeTarget.id)}
        />
      )}

      {confirmRevokeOthers && (
        <ConfirmDialog
          title={t('settings_sessions_revoke_others_confirm')}
          message={t('settings_sessions_hint')}
          confirmLabel={t('settings_sessions_revoke_others_btn')}
          isPending={revokeOthersM.isPending}
          onCancel={() => setConfirmRevokeOthers(false)}
          onConfirm={() => revokeOthersM.mutate()}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
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
      // Backend revokes the refresh token on a successful password change,
      // but that alone doesn't clear the still-live access_token cookie —
      // call authApi.logout() to actually clear both cookies server-side
      // (they're HttpOnly; client-side logout() can only clear local state)
      // rather than leaving a half-valid session until the cookie expires.
      setTimeout(() => {
        authApi.logout().finally(() => {
          logout();
          router.replace('/login');
        });
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto max-w-3xl mx-auto">
        <div>
          <h1 className="text-lg font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase">{t('settings_title')}</h1>
          <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">{t('settings_subtitle')}</p>
        </div>

        {/* Account info */}
        <div className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-[var(--chrome-text-300)] uppercase tracking-widest font-mono flex items-center gap-2">
            <UserIcon size={14} className="text-[var(--accent-cyan-soft)]" /> {t('settings_account')}
          </h2>
          {meQ.isLoading ? (
            <p className="text-xs text-[var(--chrome-text-500)] font-mono">{t('common_loading')}</p>
          ) : meQ.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-[var(--chrome-text-400)]">
                <UserIcon size={12} className="text-[var(--chrome-text-600)]" />
                <span className="text-[var(--chrome-text-200)]">{meQ.data.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--chrome-text-400)]">
                <Mail size={12} className="text-[var(--chrome-text-600)]" />
                <span className="text-[var(--chrome-text-200)]">{meQ.data.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--chrome-text-400)]">
                <BadgeCheck size={12} className="text-[var(--chrome-text-600)]" />
                <span>{t('settings_role')}: <span className="text-[var(--chrome-text-200)]">{meQ.data.role}</span></span>
              </div>
              <div className="flex items-center gap-2 text-[var(--chrome-text-400)]">
                <ShieldCheck size={12} className="text-[var(--chrome-text-600)]" />
                <span>{t('settings_clearance')}: <span className="text-[var(--chrome-text-200)]">{meQ.data.clearance}</span></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--accent-red-soft)] font-mono">{t('settings_load_failed')}</p>
          )}
        </div>

        {/* Appearance */}
        <div className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-[var(--chrome-text-300)] uppercase tracking-widest font-mono flex items-center gap-2">
            <Palette size={14} className="text-[var(--accent-cyan-soft)]" /> {t('settings_appearance_title')}
          </h2>
          <div className="flex items-center gap-2" data-testid="theme-switcher">
            {(['dark', 'light'] as Theme[]).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                data-testid={`theme-option-${option}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all border ${
                  theme === option
                    ? 'bg-cyan-600/10 text-[var(--accent-cyan-soft)] border-cyan-500/30'
                    : 'text-[var(--chrome-text-400)] border-[var(--chrome-border-800)] hover:border-[var(--chrome-border-700)] hover:text-[var(--chrome-text-200)]'
                }`}
              >
                {option === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
                {option === 'dark' ? t('settings_theme_dark') : t('settings_theme_light')}
              </button>
            ))}
          </div>
        </div>

        {/* Change password */}
        <div className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-[var(--chrome-text-300)] uppercase tracking-widest font-mono flex items-center gap-2">
            <Lock size={14} className="text-[var(--accent-cyan-soft)]" /> {t('settings_password_title')}
          </h2>

          {pwError && (
            <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-[var(--accent-emerald-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
              {pwSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
            <div>
              <label htmlFor="settings-current-password" className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">
                {t('settings_password_current')}
              </label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label htmlFor="settings-new-password" className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">
                {t('settings_password_new')}
              </label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">
                {t('settings_password_confirm')}
              </label>
              <input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none focus:border-cyan-500/50"
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

        {/* Active sessions */}
        <SessionsCard />

        {/* MFA */}
        <div className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--chrome-text-300)] uppercase tracking-widest font-mono flex items-center gap-2">
              <KeyRound size={14} className="text-[var(--accent-cyan-soft)]" /> {t('settings_mfa_title')}
            </h2>
            <span
              data-testid="mfa-status-badge"
              data-mfa-enabled={mfaEnabled}
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                mfaEnabled
                  ? 'text-[var(--accent-emerald-soft)] border-emerald-500/30 bg-emerald-500/10'
                  : 'text-[var(--chrome-text-500)] border-[color-mix(in_srgb,var(--chrome-border-700)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]'
              }`}
            >
              {mfaEnabled ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
              {mfaEnabled ? t('settings_mfa_enabled') : t('settings_mfa_disabled')}
            </span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-[var(--accent-emerald-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold">
              {success}
            </div>
          )}

          {mfaEnabled ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--chrome-text-500)] font-mono">
                {t('settings_mfa_disable_hint')}
              </p>
              <div className="flex items-center gap-3 max-w-xs">
                <OtpInput value={otp} onChange={setOtp} testId="mfa-disable-otp-input" />
              </div>
              <button
                onClick={() => disableM.mutate(otp)}
                disabled={otp.length !== 6 || disableM.isPending}
                data-testid="mfa-disable-btn"
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
              >
                {disableM.isPending ? t('settings_mfa_disabling') : t('settings_mfa_disable_btn')}
              </button>
            </div>
          ) : enrollment ? (
            <div className="space-y-4">
              <p className="text-xs text-[var(--chrome-text-500)] font-mono">
                {t('settings_mfa_enroll_hint')}
              </p>
              <SelectableField label={t('settings_secret_label')} value={enrollment.secret} testId="mfa-secret-value" />
              <SelectableField label="otpauth:// URL" value={enrollment.otpauthUrl} testId="mfa-otpauth-value" />
              <div className="flex items-center gap-3 max-w-xs">
                <OtpInput value={otp} onChange={setOtp} testId="mfa-enroll-otp-input" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => verifyM.mutate(otp)}
                  disabled={otp.length !== 6 || verifyM.isPending}
                  data-testid="mfa-verify-btn"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
                >
                  {verifyM.isPending ? t('settings_mfa_verifying') : t('settings_mfa_verify_btn')}
                </button>
                <button
                  onClick={() => { setEnrollment(null); setOtp(''); resetFeedback(); }}
                  className="px-4 py-2 text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] rounded-xl text-xs font-semibold font-mono transition-all"
                >
                  {t('common_cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--chrome-text-500)] font-mono">
                {t('settings_mfa_enable_hint')}
              </p>
              <button
                onClick={() => enrollM.mutate()}
                disabled={enrollM.isPending}
                data-testid="mfa-enroll-btn"
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

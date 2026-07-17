'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { useAuthStore } from '../../store/authStore';
import { authApi, mfaApi, type MFAEnrollment } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { ShieldCheck, ShieldOff, User as UserIcon, Mail, BadgeCheck, KeyRound, Copy, Check } from 'lucide-react';

// Small "select-all on click" text block for the enrollment secret / otpauth
// URL — no QR/clipboard library, just a monospace box the analyst can copy
// from manually (or via the native Clipboard API on click).
function SelectableField({ label, value }: { label: string; value: string }) {
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
          {copied ? 'Copied' : 'Copy'}
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
  const storedUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
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

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-3xl mx-auto">
        <div>
          <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase">Settings</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">Account details and security options.</p>
        </div>

        {/* Account info */}
        <div className="bg-[#0e1220]/60 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono flex items-center gap-2">
            <UserIcon size={14} className="text-cyan-400" /> Account
          </h2>
          {meQ.isLoading ? (
            <p className="text-xs text-gray-500 font-mono">Loading...</p>
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
                <span>Role: <span className="text-gray-200">{meQ.data.role}</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldCheck size={12} className="text-gray-600" />
                <span>Clearance: <span className="text-gray-200">{meQ.data.clearance}</span></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400 font-mono">Failed to load account info.</p>
          )}
        </div>

        {/* MFA */}
        <div className="bg-[#0e1220]/60 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono flex items-center gap-2">
              <KeyRound size={14} className="text-cyan-400" /> Two-Factor Authentication
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                mfaEnabled
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-gray-500 border-gray-700/40 bg-gray-500/10'
              }`}
            >
              {mfaEnabled ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
              {mfaEnabled ? 'Enabled' : 'Disabled'}
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
                Enter a current code from your authenticator app to disable MFA.
              </p>
              <div className="flex items-center gap-3 max-w-xs">
                <OtpInput value={otp} onChange={setOtp} />
              </div>
              <button
                onClick={() => disableM.mutate(otp)}
                disabled={otp.length !== 6 || disableM.isPending}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
              >
                {disableM.isPending ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          ) : enrollment ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-mono">
                Add this secret to your authenticator app (Google Authenticator, Authy, 1Password, ...), then
                enter the 6-digit code it generates to confirm.
              </p>
              <SelectableField label="Secret" value={enrollment.secret} />
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
                  {verifyM.isPending ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => { setEnrollment(null); setOtp(''); resetFeedback(); }}
                  className="px-4 py-2 text-gray-500 hover:text-gray-300 rounded-xl text-xs font-semibold font-mono transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-mono">
                Protect your account with a time-based one-time code in addition to your password.
              </p>
              <button
                onClick={() => enrollM.mutate()}
                disabled={enrollM.isPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
              >
                {enrollM.isPending ? 'Starting...' : 'Enable MFA'}
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

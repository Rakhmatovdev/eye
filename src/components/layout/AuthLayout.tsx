'use client';
import React from 'react';
import { Network, FolderOpen, ShieldCheck } from 'lucide-react';
import Brand from '../common/Brand';
import PreferencesControls from '../common/PreferencesControls';
import { useT } from '../../lib/i18n';

export default function AuthLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const t = useT();
  return <main className="login-page">
    <section className="login-story" aria-label={t('workspace_brand_caption')}>
      <Brand caption={t('workspace_brand_caption')} />
      <div className="login-story-content">
        <h1>{t('login_editorial')}</h1><p>{t('login_editorial_note')}</p>
        <svg className="login-constellation" viewBox="0 0 410 170" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeOpacity=".19"><path d="M25 110 110 45 210 95 305 30 385 100M25 110l105 35 80-50 105 50 70-45M110 45l20 100M305 30l10 115M110 45l195-15M130 145l185 0" /><circle cx="210" cy="95" r="37" strokeDasharray="3 5" /><circle cx="210" cy="95" r="55" strokeOpacity=".08" /></g>
          <g fill="#14181e" stroke="currentColor"><circle cx="25" cy="110" r="5" strokeOpacity=".45" /><circle cx="110" cy="45" r="9" strokeOpacity=".55" /><circle cx="130" cy="145" r="5" strokeOpacity=".45" /><circle cx="305" cy="30" r="5" strokeOpacity=".45" /><circle cx="315" cy="145" r="8" strokeOpacity=".55" /><circle cx="385" cy="100" r="5" strokeOpacity=".45" /><circle cx="210" cy="95" r="20" /></g>
          <circle cx="210" cy="95" r="5" fill="currentColor" /><circle cx="110" cy="45" r="2" fill="currentColor" /><circle cx="315" cy="145" r="2" fill="currentColor" />
        </svg>
      </div>
      <div className="login-story-features"><span><Network size={14} />{t('login_feature_evidence')}</span><span><FolderOpen size={14} />{t('login_feature_cases')}</span><span><ShieldCheck size={14} />{t('login_feature_access')}</span></div>
    </section>
    <section className="login-form-side" aria-labelledby="login-heading">
      <div className="auth-preferences"><PreferencesControls /></div>
      <div className="login-mobile-brand"><Brand caption={t('workspace_brand_caption')} /></div>
      <div className="login-form-card">
        <p className="login-form-eyebrow">{t('workspace_brand_caption')}</p>
        <h2 id="login-heading">{title}</h2>
        <p className="login-form-description">{description}</p>
        {children}
        <p className="login-form-footnote"><ShieldCheck size={14} />{t('login_authorized')}</p>
      </div>
    </section>
  </main>;
}

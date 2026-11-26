'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Globe, Moon, Sun } from 'lucide-react';
import { useLocaleStore, type Locale } from '../../store/localeStore';
import { useThemeStore } from '../../store/themeStore';
import { useT } from '../../lib/i18n';

const languages: { code: Locale; name: string }[] = [
  { code: 'uz', name: 'O‘zbekcha' },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

export function LocaleSwitcher() {
  const t = useT();
  const locale = useLocaleStore(state => state.locale);
  const setLocale = useLocaleStore(state => state.setLocale);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    options.current[languages.findIndex(language => language.code === locale)]?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, locale]);

  return <div ref={container} className="preferences-language" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="workspace-icon-button workspace-language-button" title={t('workspace_language')}
      aria-label={t('workspace_language')} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="listbox"
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}><Globe size={15} /><span>{locale.toUpperCase()}</span></button>
    {open && <div id={id} role="listbox" aria-label={t('workspace_language')} className="preferences-language-menu">
      {languages.map((language, index) => <button key={language.code} ref={node => { options.current[index] = node; }}
        type="button" role="option" aria-selected={language.code === locale} lang={language.code} tabIndex={-1}
        onClick={() => { setLocale(language.code); close(); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? languages.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + languages.length) % languages.length;
            options.current[next]?.focus();
          }
        }}><span>{language.name}</span>{language.code === locale && <Check size={14} />}</button>)}
    </div>}
  </div>;
}

export function ThemeToggle() {
  const t = useT();
  const theme = useThemeStore(state => state.theme);
  const toggle = useThemeStore(state => state.toggleTheme);
  return <button type="button" onClick={toggle} className="workspace-icon-button" aria-label={t('theme_toggle')}
    title={t(theme === 'dark' ? 'theme_use_light' : 'theme_use_dark')} aria-pressed={theme === 'light'}>
    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
  </button>;
}

export default function PreferencesControls() {
  return <div className="preferences-controls"><LocaleSwitcher /><ThemeToggle /></div>;
}

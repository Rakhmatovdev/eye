'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { useT } from '../../lib/i18n';

export default function QuickNavigation({ items }: { items: { name: string; path: string }[] }) {
  const t = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const matches = items.filter(item => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  const open = () => {
    setQuery(''); setSelected(0);
    dialog.current?.showModal(); input.current?.focus();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) close(); else open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (path: string) => { close(); router.push(path); };
  return <>
    <button ref={trigger} onClick={open} className="quick-nav-trigger" aria-label={t('workspace_quick_navigation')}>
      <Search size={16} /><span className="hidden sm:inline">{t('workspace_quick_navigation')}</span>
      <kbd className="hidden md:inline">Ctrl K</kbd>
    </button>
    <dialog ref={dialog} className="quick-nav-dialog" aria-label={t('workspace_quick_navigation')}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      }}>
      <div className="p-4 sm:p-5" onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setSelected(value => matches.length ? (value + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0);
        }
        if (event.key === 'Enter' && event.target === input.current && matches[selected]) {
          event.preventDefault(); navigate(matches[selected].path);
        }
      }}>
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <Search size={20} className="text-[var(--accent-cyan-soft)]" />
          <input ref={input} value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }}
            placeholder={t('workspace_find_page')} aria-label={t('workspace_find_page')}
            aria-controls="quick-nav-results" aria-activedescendant={matches[selected] ? `quick-nav-${selected}` : undefined}
            role="combobox" aria-expanded="true" aria-autocomplete="list"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button onClick={close} aria-label={t('common_close')} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)]"><X size={18} /></button>
        </div>
        <div id="quick-nav-results" role="listbox" aria-label={t('workspace_quick_navigation')} className="max-h-[55dvh] overflow-y-auto py-3">
          {matches.map((item, index) => <button key={`${item.path}:${item.name}`} id={`quick-nav-${index}`} role="option" aria-selected={selected === index}
            tabIndex={-1} onMouseEnter={() => setSelected(index)}
            ref={node => { if (selected === index) node?.scrollIntoView?.({ block: 'nearest' }); }}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm text-left ${selected === index ? 'bg-[var(--bg-elevated)] text-[var(--accent-cyan-soft)]' : ''}`}>
            {item.name}<ArrowUpRight size={15} />
          </button>)}
          {!matches.length && <p className="p-6 text-center text-sm text-[var(--text-secondary)]">{t('workspace_no_results')}</p>}
        </div>
        <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">{t('workspace_keyboard_hint')}</p>
      </div>
    </dialog>
  </>;
}

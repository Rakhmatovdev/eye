import { translate, useT, type Locale } from '../i18n';
import { useLocaleStore } from '../../store/localeStore';
import { renderHook, act } from '@testing-library/react';

describe('translate()', () => {
  it('returns the uz string for a known key when locale is uz', () => {
    expect(translate('nav_home', 'uz')).toBe('Bosh sahifa');
  });

  it('returns the ru string for a known key when locale is ru', () => {
    expect(translate('nav_home', 'ru')).toBe('Главная');
  });

  it('returns the en string for a known key when locale is en', () => {
    expect(translate('nav_home', 'en')).toBe('Home');
  });

  it('falls back to the en string when the requested locale has no entry', () => {
    // Every real Locale ('uz' | 'ru' | 'en') currently has a value for every
    // key, so there's no natural "missing translation" case in the live
    // dictionary. Cast an out-of-union locale through to exercise the same
    // `dict[key][locale] ?? dict[key].en` fallback path the code takes when a
    // locale entry is absent, without touching i18n.ts itself.
    const missingLocale = 'xx' as unknown as Locale;
    expect(translate('nav_home', missingLocale)).toBe(translate('nav_home', 'en'));
  });

  it('resolves distinct keys independently', () => {
    expect(translate('login_submit', 'en')).toBe('Open Workspace');
    expect(translate('settings_password_mismatch', 'en')).toBe('New passwords do not match.');
  });
});

describe('useT()', () => {
  beforeEach(() => {
    // Reset to the store's default locale before each test so tests don't
    // leak state through the persisted Zustand store.
    act(() => {
      useLocaleStore.getState().setLocale('uz');
    });
  });

  it('binds t(key) to the current locale from useLocaleStore', () => {
    const { result } = renderHook(() => useT());
    expect(result.current('nav_home')).toBe('Bosh sahifa');
  });

  it('re-resolves keys against the new locale after the store updates', () => {
    const { result } = renderHook(() => useT());
    expect(result.current('nav_home')).toBe('Bosh sahifa');

    act(() => {
      useLocaleStore.getState().setLocale('ru');
    });

    expect(result.current('nav_home')).toBe('Главная');
  });
});

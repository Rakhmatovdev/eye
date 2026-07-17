import { useLocaleStore, type Locale } from '../store/localeStore';

export type { Locale };

// Lightweight, dependency-free i18n: a flat dictionary of translation keys to
// {uz, ru, en} strings, a Zustand-persisted locale (see localeStore.ts), and
// a `useT()` hook that resolves keys against the active locale. No ICU
// plurals/interpolation — the app's copy doesn't need it yet. Pages can
// adopt `useT()` incrementally; anything not yet wired up simply stays in
// its current (English) literal text.
const dict = {
  // --- Nav / chrome (WorkspaceLayout) -------------------------------------
  nav_home: { uz: 'Bosh sahifa', ru: 'Главная', en: 'Home' },
  nav_search: { uz: 'Qidiruv', ru: 'Поиск', en: 'Search' },
  nav_graph: { uz: 'Grafik tahlil', ru: 'Граф-анализ', en: 'Graph Analysis' },
  nav_map: { uz: 'Geografik xarita', ru: 'Геокарта', en: 'Geospatial Map' },
  nav_surveillance: { uz: 'Kuzatuv', ru: 'Наблюдение', en: 'Surveillance' },
  nav_command: { uz: 'Boshqaruv posti', ru: 'Командный пункт', en: 'Command Post' },
  nav_assistant: { uz: 'AI analitik', ru: 'AI-аналитик', en: 'AI Analyst' },
  nav_timeline: { uz: 'Vaqt tahlili', ru: 'Хронология', en: 'Time Analysis' },
  nav_cases: { uz: 'Ish fayllari', ru: 'Дела', en: 'Case Files' },
  nav_settings: { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  logout: { uz: 'Chiqish', ru: 'Выйти', en: 'Logout' },
  clearance_suffix: { uz: 'ruxsat darajasi', ru: 'уровень допуска', en: 'clearance' },

  // --- Common buttons / states --------------------------------------------
  common_save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
  common_cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  common_delete: { uz: "O'chirish", ru: 'Удалить', en: 'Delete' },
  common_edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
  common_search: { uz: 'Qidiruv', ru: 'Поиск', en: 'Search' },
  common_loading: { uz: 'Yuklanmoqda...', ru: 'Загрузка...', en: 'Loading...' },
  common_error: { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
  common_confirm: { uz: 'Tasdiqlash', ru: 'Подтвердить', en: 'Confirm' },
  common_close: { uz: 'Yopish', ru: 'Закрыть', en: 'Close' },

  // --- Login page ----------------------------------------------------------
  login_title: { uz: 'Brave Analyst Canvas', ru: 'Brave Analyst Canvas', en: 'Brave Analyst Canvas' },
  login_subtitle: { uz: 'Maxfiy razvedka tahlili ish maydoni', ru: 'Защищённое рабочее пространство разведывательного анализа', en: 'Classified Intelligence Analysis Workspace' },
  login_mfa_title: { uz: 'Ikki bosqichli tekshiruv', ru: 'Двухфакторная проверка', en: 'Two-Factor Verification' },
  login_mfa_subtitle: { uz: 'Autentifikator ilovasidagi 6 xonali kodni kiriting.', ru: 'Введите 6-значный код из приложения-аутентификатора.', en: 'Enter the 6-digit code from your authenticator app.' },
  login_identity_label: { uz: 'Analitik identifikatori', ru: 'Идентификатор аналитика', en: 'Analyst Identity' },
  login_secret_label: { uz: 'Kirish paroli', ru: 'Пароль доступа', en: 'Access Secret' },
  login_verification_label: { uz: 'Tasdiqlash kodi', ru: 'Код подтверждения', en: 'Verification Code' },
  login_submit: { uz: 'Ish maydonini ochish', ru: 'Открыть рабочее пространство', en: 'Open Workspace' },
  login_submitting: { uz: 'Xavfsiz muhit ishga tushmoqda...', ru: 'Инициализация защищённой среды...', en: 'Initializing Secure Sandbox...' },
  login_verify: { uz: 'Tasdiqlash va davom etish', ru: 'Подтвердить и продолжить', en: 'Verify & Continue' },
  login_verifying: { uz: 'Tekshirilmoqda...', ru: 'Проверка...', en: 'Verifying...' },
  login_back: { uz: 'Kirishga qaytish', ru: 'Назад ко входу', en: 'Back to login' },

  // --- Settings page ---------------------------------------------------------
  settings_title: { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  settings_subtitle: { uz: 'Hisob ma’lumotlari va xavfsizlik sozlamalari.', ru: 'Данные учётной записи и параметры безопасности.', en: 'Account details and security options.' },
  settings_account: { uz: 'Hisob', ru: 'Аккаунт', en: 'Account' },
  settings_load_failed: { uz: 'Hisob ma’lumotlarini yuklab bo‘lmadi.', ru: 'Не удалось загрузить данные аккаунта.', en: 'Failed to load account info.' },
  settings_role: { uz: 'Rol', ru: 'Роль', en: 'Role' },
  settings_clearance: { uz: 'Ruxsat darajasi', ru: 'Уровень допуска', en: 'Clearance' },
  settings_mfa_title: { uz: 'Ikki bosqichli autentifikatsiya', ru: 'Двухфакторная аутентификация', en: 'Two-Factor Authentication' },
  settings_mfa_enabled: { uz: 'Yoqilgan', ru: 'Включено', en: 'Enabled' },
  settings_mfa_disabled: { uz: "O'chirilgan", ru: 'Отключено', en: 'Disabled' },
  settings_mfa_disable_hint: { uz: 'MFA ni o‘chirish uchun autentifikator ilovasidagi joriy kodni kiriting.', ru: 'Введите текущий код из приложения-аутентификатора, чтобы отключить MFA.', en: 'Enter a current code from your authenticator app to disable MFA.' },
  settings_mfa_disable_btn: { uz: "MFA ni o'chirish", ru: 'Отключить MFA', en: 'Disable MFA' },
  settings_mfa_disabling: { uz: "O'chirilmoqda...", ru: 'Отключение...', en: 'Disabling...' },
  settings_mfa_enroll_hint: { uz: 'Ushbu maxfiy kalitni autentifikator ilovangizga qo‘shing, so‘ng u yaratgan 6 xonali kodni tasdiqlash uchun kiriting.', ru: 'Добавьте этот секрет в приложение-аутентификатор, затем введите сгенерированный им 6-значный код для подтверждения.', en: 'Add this secret to your authenticator app, then enter the 6-digit code it generates to confirm.' },
  settings_mfa_verify_btn: { uz: 'Tasdiqlash va yoqish', ru: 'Подтвердить и включить', en: 'Verify & Enable' },
  settings_mfa_verifying: { uz: 'Tekshirilmoqda...', ru: 'Проверка...', en: 'Verifying...' },
  settings_mfa_enable_hint: { uz: 'Hisobingizni parolga qo‘shimcha vaqtinchalik bir martalik kod bilan himoya qiling.', ru: 'Защитите аккаунт временным одноразовым кодом в дополнение к паролю.', en: 'Protect your account with a time-based one-time code in addition to your password.' },
  settings_mfa_enable_btn: { uz: "MFA ni yoqish", ru: 'Включить MFA', en: 'Enable MFA' },
  settings_mfa_starting: { uz: 'Boshlanmoqda...', ru: 'Запуск...', en: 'Starting...' },
  settings_secret_label: { uz: 'Maxfiy kalit', ru: 'Секретный ключ', en: 'Secret' },
  settings_copy: { uz: 'Nusxalash', ru: 'Копировать', en: 'Copy' },
  settings_copied: { uz: 'Nusxalandi', ru: 'Скопировано', en: 'Copied' },

  settings_password_title: { uz: 'Parolni o‘zgartirish', ru: 'Сменить пароль', en: 'Change Password' },
  settings_password_current: { uz: 'Joriy parol', ru: 'Текущий пароль', en: 'Current password' },
  settings_password_new: { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New password' },
  settings_password_confirm: { uz: 'Yangi parolni tasdiqlang', ru: 'Подтвердите новый пароль', en: 'Confirm new password' },
  settings_password_mismatch: { uz: 'Yangi parollar mos kelmadi.', ru: 'Новые пароли не совпадают.', en: 'New passwords do not match.' },
  settings_password_submit: { uz: 'Parolni yangilash', ru: 'Обновить пароль', en: 'Update Password' },
  settings_password_submitting: { uz: 'Yangilanmoqda...', ru: 'Обновление...', en: 'Updating...' },
  settings_password_success: { uz: 'Parol muvaffaqiyatli o‘zgartirildi. Xavfsizlik uchun qaytadan tizimga kirishingiz kerak.', ru: 'Пароль успешно изменён. В целях безопасности необходимо войти снова.', en: 'Password changed successfully. For security, you need to sign in again.' },
  settings_password_error: { uz: 'Parolni o‘zgartirib bo‘lmadi.', ru: 'Не удалось изменить пароль.', en: 'Failed to change password.' },
} as const;

export type TKey = keyof typeof dict;

export function translate(key: TKey, locale: Locale): string {
  return dict[key][locale] ?? dict[key].en;
}

// `useT()` returns a `t(key)` translator bound to the current locale — pages
// call `const t = useT()` then `t('nav_home')` etc.
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key: TKey) => translate(key, locale);
}

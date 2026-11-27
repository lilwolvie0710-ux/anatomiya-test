import { useI18n } from '../i18n';

/** Короткие двуязычные строки для экранов преподавателя: L('uz matn', 'русский текст'). */
export function useL() {
  const { lang } = useI18n();
  return (uz: string, ru: string) => (lang === 'ru' ? ru : uz);
}

import { useI18n } from '../i18n';
import { setUiSettings, useUiSettings } from '../settings';
import { Screen } from '../components/Layout';

export function SettingsScreen() {
  const { t } = useI18n();
  const ui = useUiSettings();
  const seg = <V extends string>(value: V, cur: V, label: string, on: (v: V) => void) => (
    <button className={'btn' + (value === cur ? ' primary' : '')} aria-pressed={value === cur} onClick={() => on(value)}>
      {label}
    </button>
  );
  return (
    <Screen title={t('settings')}>
      <div className="card stack">
        <h3>{t('language')}</h3>
        <div className="tiles">
          {seg('uz', ui.lang, 'O‘zbekcha', (lang) => setUiSettings({ lang }))}
          {seg('ru', ui.lang, 'Русский', (lang) => setUiSettings({ lang }))}
        </div>
      </div>
      <div className="card stack">
        <h3>{t('theme')}</h3>
        <div className="tiles">
          {seg('dark', ui.theme, t('dark'), (theme) => setUiSettings({ theme }))}
          {seg('light', ui.theme, t('light'), (theme) => setUiSettings({ theme }))}
        </div>
      </div>
      <p className="muted small center">v{__APP_VERSION__}</p>
    </Screen>
  );
}

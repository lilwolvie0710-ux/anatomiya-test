import { useEffect, useState } from 'react';
import { getProfile, setKV } from '../db';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { Screen } from '../components/Layout';
import type { Profile } from '../types';

export const FACULTIES = ['Davolash ishi', 'Pediatriya', 'Stomatologiya', 'Boshqa'];

export function ProfileScreen() {
  const { t } = useI18n();
  const [p, setP] = useState<Profile>({ fullName: '', group: '', faculty: FACULTIES[0] });
  useEffect(() => {
    getProfile().then((x) => x && setP(x));
  }, []);
  const valid = p.fullName.trim().length >= 3 && p.group.trim().length >= 1;
  const save = async () => {
    await setKV('profile', { fullName: p.fullName.trim().replace(/\s+/g, ' '), group: p.group.trim(), faculty: p.faculty });
    navigate('/');
  };
  return (
    <Screen
      title={t('profile')}
      bottom={
        <button className="btn primary" disabled={!valid} onClick={save}>
          {t('save')}
        </button>
      }
    >
      <label className="field">
        {t('fullName')}
        <input className="input" autoComplete="name" value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
      </label>
      <label className="field">
        {t('group')}
        <input className="input" value={p.group} onChange={(e) => setP({ ...p, group: e.target.value })} />
      </label>
      <label className="field">
        {t('faculty')}
        <select className="input" value={p.faculty} onChange={(e) => setP({ ...p, faculty: e.target.value })}>
          {FACULTIES.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <p className="muted small">{t('profileHint')}</p>
    </Screen>
  );
}

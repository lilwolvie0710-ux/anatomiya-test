import { useLiveQuery } from 'dexie-react-hooks';
import { db, getProfile } from '../db';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { Screen } from '../components/Layout';

export function Home() {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile(), [], undefined);
  const lastExam = useLiveQuery(() => db.attempts.where('kind').equals('exam').last(), []);

  return (
    <Screen title={t('appName')} back={false} right={<button className="btn icon ghost" aria-label={t('settings')} onClick={() => navigate('/settings')}>⚙︎</button>}>
      <button className="card row spread" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
        <div>
          <div className="muted small">{t('profile')}</div>
          {profile ? (
            <>
              <div style={{ fontWeight: 700 }}>{profile.fullName}</div>
              <div className="muted small">
                {profile.group} · {profile.faculty}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 700, color: 'var(--warn)' }}>{t('fillProfile')}</div>
          )}
        </div>
        <span aria-hidden>›</span>
      </button>

      <div className="tiles">
        <button className="tile accent wide" onClick={() => navigate('/exam')}>
          <span className="ico">📝</span>
          <span>{t('exam')}</span>
        </button>
        <button className="tile" onClick={() => navigate('/training')}>
          <span className="ico">🦴</span>
          <span>{t('training')}</span>
        </button>
        <button className="tile" onClick={() => navigate('/stats')}>
          <span className="ico">📈</span>
          <span>{t('stats')}</span>
        </button>
        {lastExam?.qr && (
          <button className="tile wide" onClick={() => navigate('/exam/result')}>
            <span className="ico">▦</span>
            <span>{t('lastResult')}</span>
          </button>
        )}
        <button className="tile" onClick={() => navigate('/sources')}>
          <span className="ico">©</span>
          <span>{t('sources')}</span>
        </button>
        <button className="tile" onClick={() => navigate('/teacher')}>
          <span className="ico">🔒</span>
          <span>{t('teacher')}</span>
        </button>
      </div>
      <p className="muted small center">{t('installHint')}</p>
    </Screen>
  );
}

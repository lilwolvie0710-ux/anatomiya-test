import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useI18n } from '../i18n';
import { Screen } from '../components/Layout';
import { Bars, LineChart } from '../components/Charts';
import { TOPICS } from '../content/topics';

export function StatsScreen() {
  const { t, tr, lang } = useI18n();
  const attempts = useLiveQuery(() => db.attempts.orderBy('startedAt').toArray(), []);
  const logs = useLiveQuery(() => db.qlog.toArray(), []);
  if (!attempts || !logs) return null;

  const byTopic = new Map<number, { sum: number; n: number }>();
  for (const l of logs) {
    const c = byTopic.get(l.topic) ?? { sum: 0, n: 0 };
    c.sum += l.score;
    c.n++;
    byTopic.set(l.topic, c);
  }
  const topicRows = [...byTopic.entries()]
    .map(([id, c]) => ({ id, pct: Math.round((c.sum / c.n) * 100), n: c.n }))
    .sort((a, b) => a.pct - b.pct);
  const fmt = new Intl.DateTimeFormat(lang === 'uz' ? 'uz-Latn-UZ' : 'ru-RU', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Screen title={t('stats')}>
      {attempts.length === 0 ? (
        <p className="muted center">{t('noData')}</p>
      ) : (
        <>
          <div className="card stack">
            <h3>{t('progress')}</h3>
            <LineChart values={attempts.slice(-20).map((a) => Math.round((a.correct / Math.max(1, a.total)) * 100))} />
          </div>
          <div className="card stack">
            <h3>{t('weakTopics')}</h3>
            <Bars
              rows={topicRows.map((r) => ({
                label: `${r.id}. ${tr(TOPICS.find((x) => x.id === r.id)?.title)} (${r.n})`,
                value: r.pct,
                max: 100,
                bad: r.pct < 56,
              }))}
            />
          </div>
          <div className="card stack">
            <h3>{t('history')}</h3>
            <div className="list">
              {[...attempts].reverse().map((a) => (
                <div key={a.id} className="row spread">
                  <span className="small">
                    {a.kind === 'exam' ? '📝 ' + t('exam') : '🦴 ' + t('training')} · {fmt.format(a.finishedAt)}
                    <br />
                    <span className="muted">
                      {Math.round(a.correct * 10) / 10}/{a.total}
                    </span>
                  </span>
                  <b>{a.kind === 'exam' ? `${a.grade}` : `${Math.round((a.correct / Math.max(1, a.total)) * 100)}%`}</b>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Screen>
  );
}

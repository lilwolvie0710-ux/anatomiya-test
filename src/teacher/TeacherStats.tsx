import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Screen } from '../components/Layout';
import { Bars } from '../components/Charts';
import { questionAnalysis } from './logic';
import { correctToText } from '../core/session';
import { useI18n } from '../i18n';
import { useL } from './useL';

export function TeacherStats() {
  const L = useL();
  const { lang, tr } = useI18n();
  const tests = useLiveQuery(() => db.tests.orderBy('createdAt').reverse().toArray(), []);
  const journal = useLiveQuery(() => db.journal.toArray(), []);
  const [testId, setTestId] = useState('');
  const [group, setGroup] = useState('');

  const testRows = useMemo(() => (journal ?? []).filter((r) => !testId || r.testId === testId), [journal, testId]);
  const groups = [...new Set(testRows.map((r) => r.group))].sort();
  const rows = testRows.filter((r) => !group || r.group === group);
  const test = tests?.find((t) => t.testId === testId);

  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.grade, 0) / rows.length) * 100) / 100 : 0;
  const avgPct = rows.length ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length) : 0;
  const dist = new Map<number, number>();
  for (const r of rows) dist.set(r.grade, (dist.get(r.grade) ?? 0) + 1);
  const distRows = [...dist.entries()].sort((a, b) => b[0] - a[0]);
  const maxDist = Math.max(1, ...dist.values());
  const analysis = test ? questionAnalysis(test.payload, rows, lang) : [];

  return (
    <Screen title={L('Statistika', 'Статистика')} back="/teacher">
      <select className="input" value={testId} onChange={(e) => setTestId(e.target.value)} aria-label="test">
        <option value="">{L('Barcha testlar', 'Все тесты')}</option>
        {(tests ?? []).map((t) => (
          <option key={t.testId} value={t.testId}>
            {t.title} ({new Date(t.createdAt).toLocaleDateString()})
          </option>
        ))}
      </select>
      <select className="input" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="group">
        <option value="">{L('Barcha guruhlar', 'Все группы')}</option>
        {groups.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      <div className="stats-grid">
        <div className="stat">
          <b>{rows.length}</b>
          <span className="small muted">{L('talaba', 'студентов')}</span>
        </div>
        <div className="stat">
          <b>{avg}</b>
          <span className="small muted">{L('o‘rtacha ball', 'средний балл')}</span>
        </div>
        <div className="stat">
          <b>{avgPct}%</b>
          <span className="small muted">{L('o‘rtacha %', 'средний %')}</span>
        </div>
      </div>
      {distRows.length > 0 && (
        <div className="card stack">
          <h3>{L('Ballar taqsimoti', 'Распределение баллов')}</h3>
          <Bars rows={distRows.map(([g, n]) => ({ label: `${L('Ball', 'Балл')} ${g}`, value: n, max: maxDist, bad: g === 0 }))} />
        </div>
      )}
      {!test && <p className="muted small">{L('Savollar tahlili uchun testni tanlang.', 'Для анализа вопросов выберите тест.')}</p>}
      {analysis.length > 0 && (
        <div className="card stack">
          <h3>{L('Savollar tahlili', 'Анализ вопросов')}</h3>
          {analysis.map((a) => (
            <div key={a.index} className="stack" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div className="row spread">
                <span className="small" style={{ fontWeight: 600 }}>
                  {tr(a.question.prompt)}
                </span>
                <span className={'badge ' + (a.correctPct >= 70 ? 'ok' : a.correctPct >= 40 ? 'warn' : 'bad')}>{a.correctPct}%</span>
              </div>
              <div className={'bar' + (a.correctPct < 40 ? ' bad' : '')}>
                <div style={{ width: a.correctPct + '%' }} />
              </div>
              <div className="small muted">
                {L('To‘g‘ri: ', 'Верно: ')}
                {correctToText(a.question, lang)} · n={a.n}
              </div>
              {a.wrong.map((w, i) => (
                <div key={i} className="small">
                  ✗ {w.text} — <b>{w.count}</b>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { TOPICS } from '../content/topics';
import { questionsForTraining } from '../content/bank';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { Screen } from '../components/Layout';
import { QuestionView } from '../components/QuestionView';
import { gradeAnswer, isAnswered } from '../core/grading';
import { makeDisplayOrder } from '../core/session';
import { shuffled } from '../core/random';
import { db } from '../db';
import type { Answer, Question } from '../types';

interface Item {
  q: Question;
  order: number[];
  answer: Answer;
  score: number | null;
}

export function TrainingScreen() {
  const { t, tr } = useI18n();
  const [topic, setTopic] = useState<number | null>(null);
  const [count, setCount] = useState(10);
  const [items, setItems] = useState<Item[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);

  const available = useMemo(() => (topic ? questionsForTraining([topic]) : []), [topic]);

  const start = () => {
    const pick = shuffled(available).slice(0, count);
    setItems(pick.map((q) => ({ q, order: makeDisplayOrder(q), answer: null, score: null })));
    setIdx(0);
    setDone(false);
    setStartedAt(Date.now());
  };

  // ----- выбор темы -----
  if (!items) {
    return (
      <Screen
        title={t('training')}
        bottom={
          <button className="btn primary" disabled={!topic || available.length === 0} onClick={start}>
            {t('start')}
          </button>
        }
      >
        <h2>{t('chooseTopic')}</h2>
        <div className="stack">
          {TOPICS.map((tp) => {
            const n = questionsForTraining([tp.id]).length;
            return (
              <button
                key={tp.id}
                className={'opt' + (topic === tp.id ? ' selected' : '')}
                onClick={() => setTopic(tp.id)}
                disabled={n === 0}
                style={n === 0 ? { opacity: 0.5 } : undefined}
              >
                <span className="mark">{tp.id}</span>
                <span style={{ flex: 1 }}>
                  {tr(tp.title)}
                  <br />
                  <span className="muted small">{n ? `${n} ${t('question').toLowerCase()}` : t('noQuestions')}</span>
                </span>
              </button>
            );
          })}
        </div>
        {topic && available.length > 0 && (
          <label className="field">
            {t('questionsCount')}
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 20, 30, available.length].filter((v, i, a) => v <= available.length && a.indexOf(v) === i).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
      </Screen>
    );
  }

  // ----- итог -----
  if (done) {
    const sum = items.reduce((s, it) => s + (it.score ?? 0), 0);
    const pct = Math.round((sum / items.length) * 100);
    return (
      <Screen
        title={t('trainingDone')}
        back="/training"
        bottom={
          <>
            <button className="btn" onClick={() => navigate('/')}>
              {t('home')}
            </button>
            <button className="btn primary" onClick={start}>
              {t('again')}
            </button>
          </>
        }
      >
        <div className="card center stack">
          <div className="big-grade">{pct}%</div>
          <div className="muted">
            {Math.round(sum * 10) / 10} / {items.length}
          </div>
        </div>
        <div className="list">
          {items.map((it, i) => (
            <div key={i} className="row spread">
              <span className="small">
                {i + 1}. {tr(it.q.prompt)}
              </span>
              <span className={'badge ' + ((it.score ?? 0) >= 1 ? 'ok' : (it.score ?? 0) > 0 ? 'warn' : 'bad')}>
                {(it.score ?? 0) >= 1 ? '✓' : (it.score ?? 0) > 0 ? '½' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </Screen>
    );
  }

  // ----- вопрос -----
  const it = items[idx];
  const checked = it.score !== null;
  const setAnswer = (a: Answer) => setItems(items.map((x, i) => (i === idx ? { ...x, answer: a } : x)));
  const check = () => {
    const score = gradeAnswer(it.q, it.answer, { partial: true });
    setItems(items.map((x, i) => (i === idx ? { ...x, score } : x)));
  };
  const next = async () => {
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      window.scrollTo(0, 0);
      return;
    }
    const total = items.length;
    const correct = items.reduce((s, x) => s + (x.score ?? 0), 0);
    const attemptId = await db.attempts.add({
      kind: 'training',
      startedAt,
      finishedAt: Date.now(),
      topics: [...new Set(items.map((x) => x.q.topic))],
      total,
      correct,
    });
    await db.qlog.bulkAdd(
      items.map((x) => ({ attemptId, questionId: x.q.id, topic: x.q.topic, score: x.score ?? 0, at: Date.now() })),
    );
    setDone(true);
  };

  return (
    <Screen
      title={`${t('training')} · ${idx + 1}/${items.length}`}
      back="/training"
      bottom={
        checked ? (
          <button className="btn primary" onClick={next}>
            {idx + 1 < items.length ? t('next') : t('finish')}
          </button>
        ) : (
          <button className="btn primary" disabled={!isAnswered(it.q, it.answer)} onClick={check}>
            {t('check')}
          </button>
        )
      }
    >
      <div className="progress">
        <div style={{ width: `${((idx + (checked ? 1 : 0)) / items.length) * 100}%` }} />
      </div>
      <QuestionView key={it.q.id} q={it.q} value={it.answer} onChange={setAnswer} order={it.order} reveal={checked} />
      {checked && (
        <div className={'feedback ' + (it.score! >= 1 ? 'ok' : it.score! > 0 ? 'part' : 'bad')}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {it.score! >= 1 ? t('correct') : it.score! > 0 ? `${t('partly')} (${Math.round(it.score! * 100)}%)` : t('incorrect')}
          </div>
          {it.q.explanation && <div style={{ marginTop: 6 }}>{tr(it.q.explanation)}</div>}
        </div>
      )}
    </Screen>
  );
}

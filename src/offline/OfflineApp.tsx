// Офлайн-тренажёр в одном файле: тренировка с объяснениями и пробный тест на время.
// Ничего не сохраняет на сервер и не требует интернета. Не заменяет экзамен в приложении.
import { useEffect, useMemo, useState } from 'react';
import { I18nProvider, useI18n } from '../i18n';
import { setUiSettings, useUiSettings } from '../settings';
import { activeTopics, questionsForTraining } from '../content/bank';
import { QuestionView } from '../components/QuestionView';
import { gradeAnswer, isAnswered } from '../core/grading';
import { toGrade, DEFAULT_SCORING } from '../core/scoring';
import { makeDisplayOrder } from '../core/session';
import { shuffled } from '../core/random';
import type { Answer, Question } from '../types';

interface Item {
  q: Question;
  order: number[];
  answer: Answer;
  score: number | null;
}
type Mode = 'home' | 'train-setup' | 'train' | 'test-setup' | 'test' | 'result';

const TEST_COUNT = 30;
const TEST_MINUTES = 40;
const APP_URL = 'https://lilwolvie0710-ux.github.io/anatomiya-test/';

export function OfflineApp() {
  const ui = useUiSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
    document.documentElement.lang = ui.lang;
  }, [ui.theme, ui.lang]);
  return (
    <I18nProvider lang={ui.lang}>
      <div className="app">
        <Main />
      </div>
    </I18nProvider>
  );
}

function makeItems(qs: Question[]): Item[] {
  return qs.map((q) => ({ q, order: makeDisplayOrder(q), answer: null, score: null }));
}

function Main() {
  const { lang, tr, t } = useI18n();
  const L = (uz: string, ru: string) => (lang === 'ru' ? ru : uz);
  const ui = useUiSettings();
  const topics = useMemo(() => activeTopics(), []);
  const [mode, setMode] = useState<Mode>('home');
  const [topic, setTopic] = useState<number | null>(null);
  const [count, setCount] = useState(10);
  const [testTopics, setTestTopics] = useState<number[]>(topics.map((x) => x.id));
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);

  // таймер пробного теста
  useEffect(() => {
    if (mode !== 'test') return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt) finishTest();
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, endsAt]);

  const finishTest = () => {
    setItems((prev) => prev.map((x) => ({ ...x, score: gradeAnswer(x.q, x.answer) })));
    setFinishedAt(Date.now());
    setConfirm(false);
    setMode('result');
    window.scrollTo(0, 0);
  };

  const header = (title: string, back?: Mode) => (
    <header className="topbar">
      {back && (
        <button className="btn icon ghost" aria-label={t('back')} onClick={() => setMode(back)}>
          ←
        </button>
      )}
      <h1>{title}</h1>
      <button className="btn small" onClick={() => setUiSettings({ lang: lang === 'uz' ? 'ru' : 'uz' })}>
        {lang === 'uz' ? 'RU' : 'UZ'}
      </button>
      <button className="btn small" aria-label={t('theme')} onClick={() => setUiSettings({ theme: ui.theme === 'dark' ? 'light' : 'dark' })}>
        {ui.theme === 'dark' ? '☀' : '☾'}
      </button>
    </header>
  );

  // ---------- главная ----------
  if (mode === 'home') {
    const total = questionsForTraining(topics.map((x) => x.id)).length;
    return (
      <>
        {header(L('Anatomiya — oflayn', 'Анатомия — офлайн'))}
        <main className="content">
          <div className="card stack">
            <b>{L('Odam anatomiyasi · 1–8-mavzular', 'Анатомия человека · темы 1–8')}</b>
            <span className="muted small">
              {L(`${total} ta savol. Internet kerak emas.`, `${total} вопросов. Интернет не нужен.`)}
            </span>
          </div>
          <div className="tiles">
            <button className="tile accent wide" onClick={() => setMode('train-setup')}>
              <span className="ico">🦴</span>
              <span>{t('training')}</span>
            </button>
            <button className="tile wide" onClick={() => setMode('test-setup')}>
              <span className="ico">⏱</span>
              <span>
                {L('Sinov testi', 'Пробный тест')}
                <span className="muted small"> · {TEST_COUNT} / {TEST_MINUTES} {t('minutes')}</span>
              </span>
            </button>
          </div>
          <p className="muted small">
            {L(
              'Bu fayl — mustaqil tayyorgarlik uchun. Rasmiy imtihon o‘qituvchi bergan kod bilan ilovada topshiriladi: ',
              'Этот файл — для самоподготовки. Официальный экзамен сдаётся в приложении по коду преподавателя: ',
            )}
            <span style={{ wordBreak: 'break-all' }}>{APP_URL}</span>
          </p>
          <details className="card small">
            <summary>{L('Manbalar', 'Источники')}</summary>
            <p>Gray’s Anatomy (1918, public domain); OpenStax Anatomy &amp; Physiology (CC BY 4.0). Terminologia Anatomica.</p>
          </details>
        </main>
      </>
    );
  }

  // ---------- тренировка: выбор темы ----------
  if (mode === 'train-setup') {
    const avail = topic ? questionsForTraining([topic]) : [];
    return (
      <>
        {header(t('training'), 'home')}
        <main className="content">
          <h2>{t('chooseTopic')}</h2>
          <div className="stack">
            {topics.map((tp) => (
              <button key={tp.id} className={'opt' + (topic === tp.id ? ' selected' : '')} onClick={() => setTopic(tp.id)}>
                <span className="mark">{tp.id}</span>
                <span style={{ flex: 1 }}>
                  {tr(tp.title)}
                  <br />
                  <span className="muted small">{questionsForTraining([tp.id]).length}</span>
                </span>
              </button>
            ))}
          </div>
          {topic && (
            <label className="field">
              {t('questionsCount')}
              <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 10, 20, avail.length].filter((v, i, a) => v <= avail.length && a.indexOf(v) === i).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}
        </main>
        <footer className="bottombar">
          <button
            className="btn primary"
            disabled={!topic}
            onClick={() => {
              setItems(makeItems(shuffled(avail).slice(0, count)));
              setIdx(0);
              setMode('train');
            }}
          >
            {t('start')}
          </button>
        </footer>
      </>
    );
  }

  // ---------- тренировка: вопрос ----------
  if (mode === 'train') {
    const it = items[idx];
    if (!it) {
      const sum = items.reduce((s, x) => s + (x.score ?? 0), 0);
      return (
        <>
          {header(t('trainingDone'), 'home')}
          <main className="content">
            <div className="card center stack">
              <div className="big-grade">{Math.round((sum / items.length) * 100)}%</div>
              <div className="muted">
                {Math.round(sum * 10) / 10} / {items.length}
              </div>
            </div>
          </main>
          <footer className="bottombar">
            <button className="btn" onClick={() => setMode('home')}>
              {t('home')}
            </button>
            <button className="btn primary" onClick={() => setMode('train-setup')}>
              {t('again')}
            </button>
          </footer>
        </>
      );
    }
    const checked = it.score !== null;
    const set = (patch: Partial<Item>) => setItems(items.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    return (
      <>
        {header(`${t('training')} · ${idx + 1}/${items.length}`, 'train-setup')}
        <main className="content">
          <QuestionView key={idx} q={it.q} value={it.answer} order={it.order} reveal={checked} onChange={(a) => set({ answer: a })} />
          {checked && (
            <div className={'feedback ' + (it.score! >= 1 ? 'ok' : it.score! > 0 ? 'part' : 'bad')}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{it.score! >= 1 ? t('correct') : it.score! > 0 ? t('partly') : t('incorrect')}</div>
              {it.q.explanation && <div style={{ marginTop: 6 }}>{tr(it.q.explanation)}</div>}
            </div>
          )}
        </main>
        <footer className="bottombar">
          {checked ? (
            <button
              className="btn primary"
              onClick={() => {
                setIdx(idx + 1);
                window.scrollTo(0, 0);
              }}
            >
              {idx + 1 < items.length ? t('next') : t('finish')}
            </button>
          ) : (
            <button className="btn primary" disabled={!isAnswered(it.q, it.answer)} onClick={() => set({ score: gradeAnswer(it.q, it.answer, { partial: true }) })}>
              {t('check')}
            </button>
          )}
        </footer>
      </>
    );
  }

  // ---------- пробный тест: настройка ----------
  if (mode === 'test-setup') {
    const pool = questionsForTraining(testTopics);
    const toggle = (id: number) => setTestTopics(testTopics.includes(id) ? testTopics.filter((x) => x !== id) : [...testTopics, id]);
    return (
      <>
        {header(L('Sinov testi', 'Пробный тест'), 'home')}
        <main className="content">
          <div className="card small">
            {L(
              `${TEST_COUNT} ta savol, ${TEST_MINUTES} daqiqa. Javoblar oxirida ko‘rsatiladi. Ball 0 dan 2.0 gacha (0.1 qadam).`,
              `${TEST_COUNT} вопросов, ${TEST_MINUTES} минут. Ответы показываются в конце. Балл от 0 до 2.0 (шаг 0.1).`,
            )}
          </div>
          <h3>{L('Mavzular', 'Темы')}</h3>
          {topics.map((tp) => (
            <label key={tp.id} className="check">
              <input type="checkbox" checked={testTopics.includes(tp.id)} onChange={() => toggle(tp.id)} />
              <span className="small">
                {tp.id}. {tr(tp.title)}
              </span>
            </label>
          ))}
        </main>
        <footer className="bottombar">
          <button
            className="btn primary"
            disabled={pool.length === 0}
            onClick={() => {
              const n = Date.now();
              setItems(makeItems(shuffled(pool).slice(0, TEST_COUNT)));
              setIdx(0);
              setStartedAt(n);
              setEndsAt(n + TEST_MINUTES * 60_000);
              setNow(n);
              setMode('test');
            }}
          >
            {t('start')}
          </button>
        </footer>
      </>
    );
  }

  // ---------- пробный тест: прохождение ----------
  if (mode === 'test') {
    const it = items[idx];
    const left = Math.max(0, endsAt - now);
    const done = items.filter((x) => isAnswered(x.q, x.answer)).length;
    const set = (a: Answer) => setItems(items.map((x, i) => (i === idx ? { ...x, answer: a } : x)));
    return (
      <>
        <header className="topbar">
          <span className="badge">
            {idx + 1}/{items.length}
          </span>
          <h1 className="small muted" style={{ fontSize: 14 }}>
            {t('answered')}: {done}/{items.length}
          </h1>
          <span className={'timer' + (left < 60_000 ? ' low' : '')}>
            {String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
          </span>
        </header>
        <main className="content">
          <div className="progress">
            <div style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <QuestionView key={idx} q={it.q} value={it.answer} order={it.order} onChange={set} />
        </main>
        <footer className="bottombar">
          <button className="btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            ← {t('prev')}
          </button>
          {idx < items.length - 1 ? (
            <button className="btn primary" onClick={() => { setIdx(idx + 1); window.scrollTo(0, 0); }}>
              {t('next')} →
            </button>
          ) : (
            <button className="btn primary" onClick={() => setConfirm(true)}>
              {t('submit')}
            </button>
          )}
        </footer>
        {confirm && (
          <div className="modal-back">
            <div className="modal">
              <h2>{t('submitConfirm')}</h2>
              {done < items.length && (
                <div className="feedback part">
                  {t('unanswered')}: <b>{items.length - done}</b>
                </div>
              )}
              <div className="row">
                <button className="btn" style={{ flex: 1 }} onClick={() => setConfirm(false)}>
                  {t('cancel')}
                </button>
                <button className="btn primary" style={{ flex: 1 }} onClick={finishTest}>
                  {t('submit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- результат пробного теста ----------
  const sum = items.reduce((s, x) => s + (x.score ?? 0), 0);
  const fraction = sum / Math.max(1, items.length);
  const grade = toGrade(fraction, DEFAULT_SCORING, items.length);
  const secs = Math.round((finishedAt - startedAt) / 1000);
  return (
    <>
      {header(t('result'), 'home')}
      <main className="content">
        <div className="card center stack">
          <div className="big-grade" data-testid="offline-grade">
            {grade.toFixed(1)}
          </div>
          <div className="stats-grid">
            <div className="stat">
              <b>{Math.round(fraction * 100)}%</b>
              <span className="small muted">{t('percent')}</span>
            </div>
            <div className="stat">
              <b>
                {sum}/{items.length}
              </b>
              <span className="small muted">{t('correct')}</span>
            </div>
            <div className="stat">
              <b>
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </b>
              <span className="small muted">{t('time')}</span>
            </div>
          </div>
          <span className="muted small">{L('Sinov natijasi — rasmiy baho emas', 'Результат пробного теста — не официальная оценка')}</span>
        </div>
        <h3>{L('Javoblarni ko‘rish', 'Разбор ответов')}</h3>
        <div className="list">
          {items.map((x, i) => (
            <div key={i}>
              <button className="item row spread" style={{ background: 'transparent', padding: 0, border: 'none', width: '100%', textAlign: 'left' }} onClick={() => setOpen(open === i ? null : i)}>
                <span className="small">
                  {i + 1}. {tr(x.q.prompt)}
                </span>
                <span className={'badge ' + ((x.score ?? 0) >= 1 ? 'ok' : 'bad')}>{(x.score ?? 0) >= 1 ? '✓' : '✗'}</span>
              </button>
              {open === i && (
                <div style={{ marginTop: 10 }} className="stack">
                  <QuestionView q={x.q} value={x.answer} order={x.order} reveal onChange={() => undefined} />
                  {x.q.explanation && <div className="feedback">{tr(x.q.explanation)}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer className="bottombar">
        <button className="btn" onClick={() => setMode('home')}>
          {t('home')}
        </button>
        <button className="btn primary" onClick={() => setMode('test-setup')}>
          {t('again')}
        </button>
      </footer>
    </>
  );
}

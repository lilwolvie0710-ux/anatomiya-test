import { useCallback, useEffect, useRef, useState } from 'react';
import { db, getProfile, type ExamSession } from '../db';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { Modal } from '../components/Layout';
import { QuestionView } from '../components/QuestionView';
import { openTest, submitExam } from '../exam';
import { isAnswered } from '../core/grading';
import { ViolationMonitor, takeBackupViolations } from '../core/violations';
import { enterFullscreen, exitFullscreen, isAndroid, isFullscreen, keepAwake, releaseAwake } from '../core/device';
import type { Answer, TestPayload, Violation } from '../types';

type Notice = null | 'warn' | 'online' | 'fullscreen' | 'submit' | 'nav';

export function ExamRun() {
  const { t } = useI18n();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [test, setTest] = useState<TestPayload | null>(null);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<Notice>(null);
  const sRef = useRef<ExamSession | null>(null);
  const testRef = useRef<TestPayload | null>(null);
  const submitting = useRef(false);
  const monitorRef = useRef<ViolationMonitor | null>(null);

  const persist = useCallback((patch: Partial<ExamSession>) => {
    const cur = sRef.current;
    if (!cur) return;
    const next = { ...cur, ...patch };
    sRef.current = next;
    setSession(next);
    void db.exam.put(next);
  }, []);

  const finish = useCallback(async (reason?: 'auto' | 'time') => {
    const s = sRef.current;
    const tp = testRef.current;
    if (!s || !tp || submitting.current) return;
    submitting.current = true;
    monitorRef.current?.stop();
    const profile = await getProfile();
    await submitExam(s, tp, profile ?? { fullName: '?', group: '?', faculty: '?' });
    await releaseAwake();
    await exitFullscreen();
    navigate('/exam/result' + (reason ? '?r=' + reason : ''), true);
  }, []);

  // загрузка/восстановление
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await db.exam.get('current');
      if (!s) return navigate('/exam', true);
      if (s.finished) return navigate('/exam/result', true);
      const tp = await openTest(s.file, s.code);
      if (cancelled) return;
      // нарушения, записанные синхронно перед закрытием/перезагрузкой страницы
      const backup = takeBackupViolations();
      let { violations, strikes } = s;
      for (const [v, counted] of backup) {
        if (!violations.some((x) => x.at === v.at && x.kind === v.kind)) {
          violations = [...violations, v];
          if (counted) strikes++;
        }
      }
      if (Date.now() < s.lastBeat - 60_000) violations = [...violations, { kind: 'clock', at: Date.now() }];
      const next = { ...s, violations, strikes, lastBeat: Date.now() };
      sRef.current = next;
      testRef.current = tp;
      setSession(next);
      setTest(tp);
      await db.exam.put(next);
      if (tp.rules.autoSubmitAt > 0 && strikes >= tp.rules.autoSubmitAt) return finish('auto');
      if (Date.now() >= next.endsAt) return finish('time');
      if (backup.some(([, c]) => c) && tp.rules.warn) setNotice('warn');
      void keepAwake();
    })();
    return () => {
      cancelled = true;
    };
  }, [finish]);

  // наблюдение за нарушениями
  useEffect(() => {
    if (!test) return;
    const m = new ViolationMonitor(test.rules, {
      onViolation: (v: Violation, counted: boolean) => {
        const s = sRef.current;
        if (!s || submitting.current) return;
        const strikes = s.strikes + (counted ? 1 : 0);
        persist({ violations: [...s.violations, v], strikes });
        if (test.rules.autoSubmitAt > 0 && strikes >= test.rules.autoSubmitAt) {
          void finish('auto');
          return;
        }
        if (v.kind === 'online') setNotice('online');
        else if (v.kind === 'fullscreen') setNotice('fullscreen');
        else if (counted && test.rules.warn) setNotice('warn');
      },
    });
    monitorRef.current = m;
    m.start();
    // запрет копирования, выделения и контекстного меню
    const block = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (e.type === 'contextmenu' || !el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) e.preventDefault();
    };
    const blockAlways = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    document.addEventListener('copy', blockAlways);
    document.addEventListener('cut', blockAlways);
    document.addEventListener('dragstart', blockAlways);
    const vis = () => document.visibilityState === 'visible' && void keepAwake();
    document.addEventListener('visibilitychange', vis);
    return () => {
      m.stop();
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('copy', blockAlways);
      document.removeEventListener('cut', blockAlways);
      document.removeEventListener('dragstart', blockAlways);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [test, persist, finish]);

  // таймер от абсолютного времени окончания + «пульс» для восстановления
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const s = sRef.current;
      if (!s) return;
      if (n >= s.endsAt) void finish('time');
      else if (n - s.lastBeat > 5000) persist({ lastBeat: n });
    }, 500);
    return () => clearInterval(id);
  }, [finish, persist]);

  if (!session || !test) return null;

  const idx = session.current;
  const q = test.questions[session.order[idx]];
  const total = session.order.length;
  const left = Math.max(0, session.endsAt - now);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const answeredCount = session.order.filter((qi, k) => isAnswered(test.questions[qi], session.answers[k])).length;

  const setAnswer = (a: Answer) => {
    const answers = [...session.answers];
    answers[idx] = a;
    persist({ answers });
  };
  const go = (k: number) => {
    persist({ current: Math.max(0, Math.min(total - 1, k)) });
    window.scrollTo(0, 0);
  };

  return (
    <div className="exam-root" style={{ display: 'contents' }}>
      <header className="topbar">
        <button className="btn small" onClick={() => setNotice('nav')} aria-label="questions">
          {idx + 1}/{total}
        </button>
        <h1 className="small muted" style={{ fontSize: 14 }}>
          {t('answered')}: {answeredCount}/{total}
        </h1>
        <span className={'timer' + (left < 60_000 ? ' low' : '')} data-testid="timer">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </span>
      </header>
      <main className="content">
        <div className="progress">
          <div style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <QuestionView key={idx} q={q} value={session.answers[idx] ?? null} onChange={setAnswer} order={session.optionOrders[idx]} />
      </main>
      <footer className="bottombar">
        <button className="btn" disabled={idx === 0} onClick={() => go(idx - 1)}>
          ← {t('prev')}
        </button>
        {idx < total - 1 ? (
          <button className="btn primary" onClick={() => go(idx + 1)}>
            {t('next')} →
          </button>
        ) : (
          <button className="btn primary" onClick={() => setNotice('submit')}>
            {t('submit')}
          </button>
        )}
      </footer>

      {notice === 'nav' && (
        <Modal>
          <h2>{t('question')}</h2>
          <div className="qnav">
            {session.order.map((qi, k) => (
              <button
                key={k}
                className={(isAnswered(test.questions[qi], session.answers[k]) ? 'done' : '') + (k === idx ? ' cur' : '')}
                onClick={() => {
                  go(k);
                  setNotice(null);
                }}
              >
                {k + 1}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn" style={{ flex: 1 }} onClick={() => setNotice(null)}>
              {t('close')}
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => setNotice('submit')}>
              {t('submit')}
            </button>
          </div>
        </Modal>
      )}
      {notice === 'submit' && (
        <Modal>
          <h2>{t('submitConfirm')}</h2>
          {answeredCount < total && (
            <div className="feedback part">
              {t('unanswered')}: <b>{total - answeredCount}</b>
            </div>
          )}
          <div className="row">
            <button className="btn" style={{ flex: 1 }} onClick={() => setNotice(null)}>
              {t('cancel')}
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => finish()} data-testid="confirm-submit">
              {t('submit')}
            </button>
          </div>
        </Modal>
      )}
      {notice === 'warn' && (
        <Modal warn>
          <h2 style={{ color: 'var(--warn)' }}>⚠ {t('warningTitle')}</h2>
          <p>{t('warningText')}</p>
          <button className="btn primary" onClick={() => setNotice(null)}>
            {t('understood')}
          </button>
        </Modal>
      )}
      {notice === 'online' && (
        <Modal warn>
          <h2 style={{ color: 'var(--warn)' }}>⚠ {t('warningTitle')}</h2>
          <p>{t('onlineWarning')}</p>
          <button className="btn primary" onClick={() => setNotice(null)}>
            {t('understood')}
          </button>
        </Modal>
      )}
      {notice === 'fullscreen' && isAndroid() && !isFullscreen() && (
        <Modal warn>
          <h2 style={{ color: 'var(--warn)' }}>⚠ {t('warningTitle')}</h2>
          <p>{t('warningText')}</p>
          <button
            className="btn primary"
            onClick={async () => {
              await enterFullscreen();
              monitorRef.current?.markFullscreen();
              setNotice(null);
            }}
          >
            ⛶ {t('understood')}
          </button>
        </Modal>
      )}
    </div>
  );
}

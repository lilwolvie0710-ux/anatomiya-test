import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getProfile } from '../db';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { Screen } from '../components/Layout';
import { openTest, parseTestFile, startExam } from '../exam';
import { WrongCodeError } from '../core/crypto';
import { enterFullscreen, isAndroid, isIOS, keepAwake } from '../core/device';
import type { EncryptedTestFile, TestPayload } from '../types';

function useOnline(): boolean {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return on;
}

export function ExamStart() {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile(), [], undefined);
  const session = useLiveQuery(() => db.exam.get('current'), []);
  const [file, setFile] = useState<EncryptedTestFile | null>(null);
  const [code, setCode] = useState('');
  const [payload, setPayload] = useState<TestPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guided, setGuided] = useState(false);
  const online = useOnline();
  const inputRef = useRef<HTMLInputElement>(null);
  const ios = isIOS();

  if (profile === undefined) return null;
  if (profile === null) {
    return (
      <Screen title={t('exam')} bottom={<button className="btn primary" onClick={() => navigate('/profile')}>{t('profile')}</button>}>
        <p>{t('fillProfile')}</p>
      </Screen>
    );
  }

  if (session && !session.finished) {
    return (
      <Screen title={t('exam')} bottom={<button className="btn primary" onClick={() => navigate('/exam/run')}>{t('continueExam')}</button>}>
        <p>{t('examInProgress')}</p>
      </Screen>
    );
  }

  const onFile = async (f: File | undefined) => {
    setError('');
    setPayload(null);
    if (!f) return;
    try {
      setFile(parseTestFile(await f.text()));
    } catch {
      setFile(null);
      setError(t('badFile'));
    }
  };

  const unlock = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setPayload(await openTest(file, code));
    } catch (e) {
      setError(e instanceof WrongCodeError ? t('wrongCode') : t('badFile'));
    } finally {
      setBusy(false);
    }
  };

  const begin = async () => {
    if (!file || !payload) return;
    if (payload.rules.requireOffline && navigator.onLine) return;
    if (payload.rules.fullscreen && isAndroid()) await enterFullscreen();
    await keepAwake();
    await startExam(file, code, payload);
    navigate('/exam/run', true);
  };

  // ----- шаг 1: файл и код -----
  if (!payload) {
    return (
      <Screen
        title={t('exam')}
        bottom={
          <button className="btn primary" disabled={!file || code.replace(/[^a-z0-9]/gi, '').length < 4 || busy} onClick={unlock}>
            {busy ? t('decrypting') : t('next')}
          </button>
        }
      >
        <div className="card stack">
          <h3>1. {t('importTest')}</h3>
          <p className="muted small">{t('importHint')}</p>
          <input ref={inputRef} type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button className="btn" onClick={() => inputRef.current?.click()} data-testid="pick-file">
            📂 {file ? file.title : t('importTest')}
          </button>
        </div>
        <div className="card stack">
          <h3>2. {t('startCode')}</h3>
          <p className="muted small">{t('startCodeHint')}</p>
          <input
            className="input code"
            value={code}
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        {error && <div className="feedback bad">{error}</div>}
      </Screen>
    );
  }

  // ----- шаг 2: подготовка устройства -----
  const offlineOk = !payload.rules.requireOffline || !online;
  const ready = offlineOk && (!ios || guided);
  return (
    <Screen
      title={payload.title}
      bottom={
        <button className="btn primary" disabled={!ready} onClick={begin} data-testid="begin">
          {t('start')}
        </button>
      }
    >
      <div className="card stack">
        <div className="row spread">
          <span>{t('questionsCount')}</span>
          <b>{Math.min(payload.count, payload.questions.length)}</b>
        </div>
        <div className="row spread">
          <span>{t('time')}</span>
          <b>
            {payload.durationMin} {t('minutes')}
          </b>
        </div>
      </div>

      {payload.rules.requireOffline && (
        <div className={'feedback ' + (online ? 'bad' : 'ok')} data-testid="online-state">
          <b>{online ? t('youAreOnline') : t('youAreOffline')}</b>
          {online && <div>{t('goOffline')}</div>}
        </div>
      )}

      {ios && (
        <div className="card stack">
          <h3>{t('guidedTitle')}</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
            <li>{t('guided1')}</li>
            <li>{t('guided2')}</li>
            <li>{t('guided3')}</li>
            <li>{t('guided4')}</li>
          </ol>
          <label className="check">
            <input type="checkbox" checked={guided} onChange={(e) => setGuided(e.target.checked)} />
            {t('guidedDone')}
          </label>
        </div>
      )}

      <div className="card stack">
        <h3>{t('rulesTitle')}</h3>
        <div className="small">
          {payload.rules.autoSubmitAt > 0 ? t('ruleLeave', { n: payload.rules.autoSubmitAt }) : t('ruleLeaveNoAuto')}
        </div>
        <div className="small">{t('ruleOnline')}</div>
      </div>
    </Screen>
  );
}

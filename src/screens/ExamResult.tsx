import { useEffect, useState } from 'react';
import { db } from '../db';
import { useI18n } from '../i18n';
import { navigate, currentPath } from '../router';
import { Screen } from '../components/Layout';
import { QrCode } from '../components/QrCode';
import { decodeResult } from '../core/resultCodec';
import { shareOrDownload } from '../core/device';
import { VIOLATION_LABEL } from '../core/violations';
import type { ResultPayload, ViolationKind } from '../types';

export function ExamResult() {
  const { t, lang } = useI18n();
  const [qr, setQr] = useState<string | null>(null);
  const reason = new URLSearchParams(currentPath().split('?')[1] ?? '').get('r');

  useEffect(() => {
    (async () => {
      const s = await db.exam.get('current');
      if (s?.finished && s.resultQr) return setQr(s.resultQr);
      const last = await db.attempts.where('kind').equals('exam').last();
      if (last?.qr) setQr(last.qr);
      else navigate('/', true);
    })();
  }, []);

  if (!qr) return null;
  let p: ResultPayload;
  try {
    p = decodeResult(qr);
  } catch {
    return null;
  }
  const secs = Math.max(0, p.e - p.s);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <Screen
      title={t('result')}
      back="/"
      bottom={
        <button className="btn" onClick={() => shareOrDownload(`natija-${p.t}-${p.n.replace(/\s+/g, '_')}.txt`, qr, 'text/plain')}>
          💾 {t('saveResultFile')}
        </button>
      }
    >
      {reason === 'auto' && <div className="feedback bad">{t('autoSubmitted')}</div>}
      {reason === 'time' && <div className="feedback part">{t('timeUp')}</div>}
      <div className="card center stack">
        <div className="muted">
          {p.n} · {p.g}
        </div>
        <div className="big-grade" data-testid="grade">
          {p.b / 100}
        </div>
        <div className="stats-grid">
          <div className="stat">
            <b>{Math.round(p.p / 10)}%</b>
            <span className="small muted">{t('percent')}</span>
          </div>
          <div className="stat">
            <b>{time}</b>
            <span className="small muted">{t('time')}</span>
          </div>
          <div className="stat">
            <b style={{ color: p.w.length ? 'var(--warn)' : undefined }}>{p.w.length}</b>
            <span className="small muted">{t('violations')}</span>
          </div>
        </div>
      </div>
      <h3 className="center">{t('showQr')}</h3>
      <QrCode text={qr} />
      {p.w.length > 0 && (
        <div className="card small stack">
          {p.w.map(([k, sec], i) => (
            <div key={i}>
              {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')} — {VIOLATION_LABEL[k as ViolationKind]?.[lang] ?? k}
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

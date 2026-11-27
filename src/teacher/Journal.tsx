import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type JournalEntry } from '../db';
import { Modal, Screen } from '../components/Layout';
import { journalRows, toCsv, toXlsx } from './logic';
import { shareOrDownload } from '../core/device';
import { VIOLATION_LABEL } from '../core/violations';
import { useI18n } from '../i18n';
import { useL } from './useL';
import type { ViolationKind } from '../types';

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function JournalScreen() {
  const L = useL();
  const { lang } = useI18n();
  const all = useLiveQuery(() => db.journal.orderBy('finishedAt').reverse().toArray(), []);
  const [group, setGroup] = useState('');
  const [day, setDay] = useState('');
  const [open, setOpen] = useState<JournalEntry | null>(null);

  const groups = useMemo(() => [...new Set((all ?? []).map((r) => r.group))].sort(), [all]);
  const days = useMemo(() => [...new Set((all ?? []).map((r) => dayKey(r.finishedAt)))].sort().reverse(), [all]);
  const rows = (all ?? []).filter((r) => (!group || r.group === group) && (!day || dayKey(r.finishedAt) === day));

  const fname = `jurnal${group ? '-' + group : ''}${day ? '-' + day : ''}`;
  const statusBadge = (r: JournalEntry) =>
    r.status === 'ok' ? null : (
      <span className={'badge ' + (r.status === 'unknown-test' ? 'warn' : 'bad')}>
        {r.status === 'bad-signature' ? L('imzo xato', 'подпись') : r.status === 'mismatch' ? L('ball', 'балл') : L('test?', 'тест?')}
      </span>
    );

  return (
    <Screen
      title={L('Jurnal', 'Журнал')}
      back="/teacher"
      bottom={
        <>
          <button className="btn" disabled={!rows.length} onClick={async () => shareOrDownload(fname + '.xlsx', await toXlsx(journalRows(rows)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}>
            Excel
          </button>
          <button className="btn" disabled={!rows.length} onClick={() => shareOrDownload(fname + '.csv', toCsv(journalRows(rows)), 'text/csv')}>
            CSV
          </button>
        </>
      }
    >
      <div className="row">
        <select className="input" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="group">
          <option value="">{L('Barcha guruhlar', 'Все группы')}</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className="input" value={day} onChange={(e) => setDay(e.target.value)} aria-label="date">
          <option value="">{L('Barcha sanalar', 'Все даты')}</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="muted center">{L('Yozuvlar yo‘q', 'Записей нет')}</p>
      ) : (
        <div className="list">
          {rows.map((r) => (
            <button key={r.id} className="item row spread" onClick={() => setOpen(r)}>
              <span>
                <b>{r.fullName}</b> {statusBadge(r)}
                <br />
                <span className="muted small">
                  {r.group} · {new Date(r.finishedAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-Latn-UZ')} · {r.percent}%
                  {r.violations.length ? ` · ⚠${r.violations.length}` : ''}
                </span>
              </span>
              <b style={{ fontSize: 22 }}>{r.grade}</b>
            </button>
          ))}
        </div>
      )}
      {open && (
        <Modal>
          <h2>{open.fullName}</h2>
          <div className="small">
            {open.group} · {open.faculty}
            <br />
            {open.testTitle ?? open.testId}
            <br />
            {new Date(open.startedAt).toLocaleTimeString()} – {new Date(open.finishedAt).toLocaleTimeString()}
          </div>
          <div className="stats-grid">
            <div className="stat">
              <b>{open.grade}</b>
              <span className="small muted">{L('Ball', 'Балл')}</span>
            </div>
            <div className="stat">
              <b>{open.percent}%</b>
            </div>
            <div className="stat">
              <b>{open.violations.length}</b>
              <span className="small muted">⚠</span>
            </div>
          </div>
          {open.claimedGrade !== open.grade && (
            <div className="feedback bad small">
              {L('Talaba telefonidagi ball: ', 'Балл на телефоне студента: ')}
              {open.claimedGrade}
            </div>
          )}
          {open.violations.length > 0 && (
            <div className="small">
              {open.violations.map(([k, s], i) => (
                <div key={i}>
                  {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')} — {VIOLATION_LABEL[k as ViolationKind]?.[lang] ?? k}
                </div>
              ))}
            </div>
          )}
          <div className="row">
            <button
              className="btn danger"
              onClick={async () => {
                if (confirm(L('Yozuvni o‘chirasizmi?', 'Удалить запись?'))) {
                  await db.journal.delete(open.id!);
                  setOpen(null);
                }
              }}
            >
              {L('O‘chirish', 'Удалить')}
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => setOpen(null)}>
              OK
            </button>
          </div>
        </Modal>
      )}
    </Screen>
  );
}

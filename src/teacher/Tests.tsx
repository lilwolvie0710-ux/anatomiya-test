import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TeacherTest } from '../db';
import { Modal, Screen } from '../components/Layout';
import { shareOrDownload } from '../core/device';
import { WrongCodeError } from '../core/crypto';
import { parseTestFile } from '../exam';
import { importTestFile, recheckUnknown } from './logic';
import { useL } from './useL';
import type { EncryptedTestFile } from '../types';

export function TestsScreen() {
  const L = useL();
  const tests = useLiveQuery(() => db.tests.orderBy('createdAt').reverse().toArray(), []);
  const [open, setOpen] = useState<TeacherTest | null>(null);
  const [imp, setImp] = useState<EncryptedTestFile | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Screen
      title={L('Mening testlarim', 'Мои тесты')}
      back="/teacher"
      bottom={
        <button className="btn" onClick={() => fileRef.current?.click()}>
          📥 {L('Test faylini import qilish', 'Импортировать файл теста')}
        </button>
      }
    >
      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".json,application/json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setImp(parseTestFile(await f.text()));
            setMsg('');
          } catch {
            setMsg(L('Bu test fayli emas', 'Это не файл теста'));
          }
        }}
      />
      <p className="muted small">
        {L(
          'Natijalarni tekshirish uchun test shu qurilmada bo‘lishi kerak. Boshqa qurilmada yaratilgan bo‘lsa, faylini kod bilan import qiling.',
          'Чтобы проверять результаты, тест должен быть на этом устройстве. Если он создан на другом — импортируйте файл с кодом.',
        )}
      </p>
      {msg && <div className="feedback part">{msg}</div>}
      {(tests ?? []).length === 0 ? (
        <p className="muted center">{L('Testlar yo‘q', 'Тестов нет')}</p>
      ) : (
        <div className="list">
          {tests!.map((t) => (
            <button key={t.testId} className="item row spread" onClick={() => setOpen(t)}>
              <span>
                <b>{t.title}</b>
                <br />
                <span className="muted small">
                  {new Date(t.createdAt).toLocaleString()} · {t.payload.count}/{t.payload.questions.length} · {t.payload.durationMin}′
                </span>
              </span>
              <span className="badge" style={{ fontFamily: 'monospace' }}>
                {t.code}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <Modal>
          <h2>{open.title}</h2>
          <div className="big-code">{open.code}</div>
          <div className="small muted">ID: {open.testId}</div>
          <button className="btn primary" onClick={() => shareOrDownload(`test-${open.testId}.json`, JSON.stringify(open.file))}>
            📤 {L('Faylni yuborish', 'Отправить файл')}
          </button>
          <div className="row">
            <button
              className="btn danger"
              onClick={async () => {
                if (confirm(L('Testni o‘chirasizmi? Natijalarni tekshirib bo‘lmaydi.', 'Удалить тест? Результаты по нему нельзя будет проверить.'))) {
                  await db.tests.delete(open.testId);
                  setOpen(null);
                }
              }}
            >
              {L('O‘chirish', 'Удалить')}
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => setOpen(null)}>
              OK
            </button>
          </div>
        </Modal>
      )}
      {imp && (
        <Modal>
          <h2>{imp.title}</h2>
          <input className="input code" value={code} placeholder="XXXX-XXXX" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <div className="row">
            <button className="btn" onClick={() => setImp(null)}>
              {L('Bekor', 'Отмена')}
            </button>
            <button
              className="btn primary"
              style={{ flex: 1 }}
              onClick={async () => {
                try {
                  await importTestFile(imp, code);
                  const n = await recheckUnknown();
                  setMsg(L('Import qilindi. Qayta tekshirildi: ', 'Импортировано. Перепроверено записей: ') + n);
                  setImp(null);
                  setCode('');
                } catch (e) {
                  setMsg(e instanceof WrongCodeError ? L('Kod noto‘g‘ri', 'Неверный код') : String(e));
                }
              }}
            >
              {L('Import', 'Импорт')}
            </button>
          </div>
        </Modal>
      )}
    </Screen>
  );
}

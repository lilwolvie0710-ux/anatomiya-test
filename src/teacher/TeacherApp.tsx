import { useEffect, useState } from 'react';
import { getKV, setKV } from '../db';
import { hashPin } from '../core/crypto';
import { navigate } from '../router';
import { Screen } from '../components/Layout';
import { useI18n } from '../i18n';
import { TeacherHome } from './TeacherHome';
import { ScanScreen } from './Scan';
import { JournalScreen } from './Journal';
import { TeacherStats } from './TeacherStats';
import { BuilderScreen } from './Builder';
import { TestsScreen } from './Tests';
import { MyQuestionsScreen } from './MyQuestions';
import { ZoneEditor } from './ZoneEditor';
import { BackupScreen } from './Backup';

// Разблокировка живёт до перезагрузки страницы.
let unlocked = false;

export function TeacherApp({ path }: { path: string }) {
  const [ok, setOk] = useState(unlocked);
  if (!ok)
    return (
      <PinGate
        onOk={() => {
          unlocked = true;
          setOk(true);
        }}
      />
    );
  switch (path) {
    case '/teacher/scan':
      return <ScanScreen />;
    case '/teacher/journal':
      return <JournalScreen />;
    case '/teacher/stats':
      return <TeacherStats />;
    case '/teacher/builder':
      return <BuilderScreen />;
    case '/teacher/tests':
      return <TestsScreen />;
    case '/teacher/questions':
      return <MyQuestionsScreen />;
    case '/teacher/zones':
      return <ZoneEditor />;
    case '/teacher/backup':
      return <BackupScreen />;
    default:
      return <TeacherHome onLock={() => { unlocked = false; navigate('/'); }} />;
  }
}

function PinGate({ onOk }: { onOk: () => void }) {
  const { lang } = useI18n();
  const ru = lang === 'ru';
  const [stored, setStored] = useState<{ salt: string; hash: string } | null | undefined>(undefined);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    getKV<{ salt: string; hash: string } | null>('teacherPin', null).then(setStored);
  }, []);
  if (stored === undefined) return null;
  const creating = stored === null;

  const submit = async () => {
    setErr('');
    if (creating) {
      if (pin.length < 4) return setErr(ru ? 'Минимум 4 цифры' : 'Kamida 4 ta raqam');
      if (pin !== pin2) return setErr(ru ? 'PIN не совпадает' : 'PIN mos kelmadi');
      await setKV('teacherPin', await hashPin(pin));
      onOk();
    } else {
      const h = await hashPin(pin, stored.salt);
      if (h.hash === stored.hash) onOk();
      else {
        setErr(ru ? 'Неверный PIN' : 'PIN noto‘g‘ri');
        setPin('');
      }
    }
  };

  return (
    <Screen
      title={ru ? 'Преподаватель' : 'O‘qituvchi'}
      bottom={
        <button className="btn primary" onClick={submit} disabled={pin.length < 4}>
          {creating ? (ru ? 'Сохранить PIN' : 'PIN saqlash') : ru ? 'Войти' : 'Kirish'}
        </button>
      }
    >
      {creating && (
        <p className="muted">
          {ru
            ? 'Придумайте PIN для режима преподавателя. Сбросить его можно только очисткой данных приложения — заранее делайте резервную копию журнала.'
            : 'O‘qituvchi rejimi uchun PIN o‘ylab toping. Uni faqat ilova ma’lumotlarini tozalash orqali tiklash mumkin — jurnal nusxasini oldindan saqlang.'}
        </p>
      )}
      <label className="field">
        PIN
        <input
          className="input code"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
      {creating && (
        <label className="field">
          {ru ? 'Повторите PIN' : 'PIN ni takrorlang'}
          <input
            className="input code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </label>
      )}
      {err && <div className="feedback bad">{err}</div>}
    </Screen>
  );
}

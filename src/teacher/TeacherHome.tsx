import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { navigate } from '../router';
import { Screen } from '../components/Layout';
import { useL } from './useL';

export function TeacherHome({ onLock }: { onLock: () => void }) {
  const L = useL();
  const journalCount = useLiveQuery(() => db.journal.count(), []);
  const testCount = useLiveQuery(() => db.tests.count(), []);
  const tile = (path: string, ico: string, label: string, extra?: string, cls = '') => (
    <button className={'tile ' + cls} onClick={() => navigate(path)}>
      <span className="ico">{ico}</span>
      <span>
        {label}
        {extra && <span className="muted small"> · {extra}</span>}
      </span>
    </button>
  );
  return (
    <Screen
      title={L('O‘qituvchi', 'Преподаватель')}
      back="/"
      right={
        <button className="btn small" onClick={onLock}>
          🔒
        </button>
      }
    >
      <div className="tiles">
        {tile('/teacher/scan', '📷', L('QR skanerlash', 'Сканировать QR'), undefined, 'accent wide')}
        {tile('/teacher/journal', '📒', L('Jurnal', 'Журнал'), String(journalCount ?? 0))}
        {tile('/teacher/stats', '📊', L('Statistika', 'Статистика'))}
        {tile('/teacher/builder', '🧩', L('Test yaratish', 'Конструктор теста'))}
        {tile('/teacher/tests', '🗂', L('Mening testlarim', 'Мои тесты'), String(testCount ?? 0))}
        {tile('/teacher/questions', '❓', L('Mening savollarim', 'Мои вопросы'))}
        {tile('/teacher/zones', '🎯', L('Zonalar muharriri', 'Редактор зон'))}
        {tile('/teacher/backup', '💾', L('Zaxira nusxa', 'Резервная копия'), undefined, 'wide')}
      </div>
    </Screen>
  );
}

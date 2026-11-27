import { useRef, useState } from 'react';
import { Screen } from '../components/Layout';
import { makeBackup, restoreBackup } from './logic';
import { shareOrDownload } from '../core/device';
import { useL } from './useL';

export function BackupScreen() {
  const L = useL();
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Screen title={L('Zaxira nusxa', 'Резервная копия')} back="/teacher">
      <p className="muted small">
        {L(
          'Jurnal, testlar (kodlari bilan) va savollaringiz bitta faylga saqlanadi. Faylni xavfsiz joyda saqlang: unda test kodlari bor.',
          'Журнал, тесты (с кодами) и ваши вопросы сохраняются в один файл. Храните его в надёжном месте: в нём есть коды тестов.',
        )}
      </p>
      <button
        className="btn primary"
        onClick={async () => shareOrDownload(`anatomiya-backup-${new Date().toISOString().slice(0, 10)}.json`, await makeBackup())}
      >
        💾 {L('Zaxira nusxa yaratish', 'Создать резервную копию')}
      </button>
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
            const r = await restoreBackup(await f.text());
            setMsg(`${L('Tiklandi', 'Восстановлено')}: ${L('jurnal', 'журнал')} +${r.journal}, ${L('testlar', 'тесты')} ${r.tests}, ${L('savollar', 'вопросы')} ${r.questions}`);
          } catch {
            setMsg(L('Bu zaxira fayli emas', 'Это не файл резервной копии'));
          }
        }}
      />
      <button className="btn" onClick={() => fileRef.current?.click()}>
        ♻️ {L('Fayldan tiklash', 'Восстановить из файла')}
      </button>
      {msg && <div className="feedback ok">{msg}</div>}
    </Screen>
  );
}

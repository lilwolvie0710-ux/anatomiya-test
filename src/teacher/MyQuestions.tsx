import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Screen } from '../components/Layout';
import { validateBank } from '../core/validate';
import { shareOrDownload } from '../core/device';
import { useL } from './useL';
import type { Question } from '../types';

/**
 * «Мои вопросы» — приватный пул преподавателя (например, только для экзамена).
 * Хранится только на этом устройстве и попадает к студентам лишь внутри зашифрованного файла теста.
 */
export function MyQuestionsScreen() {
  const L = useL();
  const rows = useLiveQuery(() => db.myQuestions.toArray(), []);
  const [report, setReport] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const byTopic = new Map<number, { total: number; approved: number }>();
  for (const r of rows ?? []) {
    const c = byTopic.get(r.q.topic) ?? { total: 0, approved: 0 };
    c.total++;
    if (r.q.status === 'approved') c.approved++;
    byTopic.set(r.q.topic, c);
  }

  const onFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as unknown;
      const list = (Array.isArray(data) ? data : (data as { questions?: unknown[] }).questions) ?? [];
      const errors = validateBank(list);
      const bad = new Set(errors.map((e) => e.id));
      const good = (list as Question[]).filter((q) => !bad.has(q.id));
      await db.myQuestions.bulkPut(good.map((q) => ({ id: q.id, q, importedAt: Date.now() })));
      setReport(
        `${L('Qo‘shildi', 'Добавлено')}: ${good.length}. ${L('Xatolar', 'Ошибок')}: ${errors.length}` +
          (errors.length ? '\n' + errors.map((e) => `${e.id}: ${e.errors.join('; ')}`).join('\n') : ''),
      );
    } catch (e) {
      setReport(L('Fayl o‘qilmadi: ', 'Не удалось прочитать файл: ') + String(e));
    }
  };

  return (
    <Screen
      title={L('Mening savollarim', 'Мои вопросы')}
      back="/teacher"
      bottom={
        <button className="btn primary" onClick={() => fileRef.current?.click()}>
          📥 {L('JSON import', 'Импорт JSON')}
        </button>
      }
    >
      <input ref={fileRef} type="file" hidden accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
      <p className="muted small">
        {L(
          'Bu savollar faqat shu qurilmada saqlanadi va talabalarga faqat shifrlangan test faylida yetib boradi. Excel shablonidan JSON olish: npm run xlsx2json.',
          'Эти вопросы хранятся только на этом устройстве и попадают к студентам только внутри зашифрованного файла теста. JSON из Excel-шаблона: npm run xlsx2json.',
        )}
      </p>
      {report && <pre className="code">{report}</pre>}
      <div className="list">
        {[...byTopic.entries()].sort((a, b) => a[0] - b[0]).map(([tp, c]) => (
          <div key={tp} className="row spread">
            <span>
              {L('Mavzu', 'Тема')} {tp}
            </span>
            <span className="small">
              {c.approved} approved / {c.total}
            </span>
          </div>
        ))}
        {(rows ?? []).length === 0 && <div className="muted center">{L('Savollar yo‘q', 'Вопросов нет')}</div>}
      </div>
      {(rows ?? []).length > 0 && (
        <div className="row">
          <button className="btn" style={{ flex: 1 }} onClick={() => shareOrDownload('mening-savollarim.json', JSON.stringify(rows!.map((r) => r.q), null, 2))}>
            {L('Eksport', 'Экспорт')}
          </button>
          <button
            className="btn danger"
            onClick={async () => {
              if (confirm(L('Barcha savollarni o‘chirasizmi?', 'Удалить все мои вопросы?'))) await db.myQuestions.clear();
            }}
          >
            {L('Tozalash', 'Очистить')}
          </button>
        </div>
      )}
    </Screen>
  );
}

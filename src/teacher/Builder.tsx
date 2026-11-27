import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { activeTopics } from '../content/bank';
import { db } from '../db';
import { Screen } from '../components/Layout';
import { availableQuestions, buildTest, DEFAULT_RULES, DEFAULT_SCORING } from './logic';
import { FINAL_EXAM_SCORING } from '../core/scoring';
import { shareOrDownload } from '../core/device';
import { useI18n } from '../i18n';
import { useL } from './useL';
import type { ScoringRule, ViolationRules } from '../types';
import type { TeacherTest } from '../db';

type ScoringMode = 'thresholds' | 'linear' | 'points';

export function BuilderScreen() {
  const L = useL();
  const { tr } = useI18n();
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState<number[]>([1]);
  const [count, setCount] = useState(30);
  const [pool, setPool] = useState(0);
  const [duration, setDuration] = useState(40);
  const [rules, setRules] = useState<ViolationRules>(DEFAULT_RULES);
  const [mode, setMode] = useState<ScoringMode>('linear');
  const [t2, setT2] = useState(86);
  const [t1, setT1] = useState(56);
  const [step, setStep] = useState(0.1);
  const [perQ, setPerQ] = useState(2);
  const [partial, setPartial] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [includeMine, setIncludeMine] = useState(true);
  const [avail, setAvail] = useState(0);
  const [result, setResult] = useState<TeacherTest | null>(null);
  const myTopicIds = useLiveQuery(async () => [...new Set((await db.myQuestions.toArray()).map((m) => m.q.topic))], []);
  const shownTopics = activeTopics(myTopicIds ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    availableQuestions({ topics, includeDrafts, includeMine }).then((q) => setAvail(q.length));
  }, [topics, includeDrafts, includeMine]);

  const scoring: ScoringRule =
    mode === 'thresholds'
      ? { mode, thresholds: [{ min: t2, grade: 2 }, { min: t1, grade: 1 }], otherwise: 0 }
      : mode === 'linear'
        ? { mode, max: 2, step }
        : { mode, perQuestion: perQ };

  const toggleTopic = (id: number) => setTopics(topics.includes(id) ? topics.filter((x) => x !== id) : [...topics, id].sort((a, b) => a - b));

  const finalPreset = () => {
    setTitle(L('Yakuniy nazorat', 'Итоговый контроль'));
    setTopics(shownTopics.map((x) => x.id));
    setCount(35);
    setDuration(50);
    setMode('points');
    setPerQ((FINAL_EXAM_SCORING as { perQuestion: number }).perQuestion);
  };

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setResult(
        await buildTest({ title, topics, count, pool, durationMin: duration, rules, scoring, partialCredit: partial, includeDrafts, includeMine }),
      );
    } catch (e) {
      setError((e as Error).message === 'no-questions' ? L('Savollar yo‘q', 'Нет вопросов') : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Screen
        title={result.title}
        back="/teacher"
        bottom={
          <button className="btn primary" onClick={() => shareOrDownload(`test-${result.testId}.json`, JSON.stringify(result.file))}>
            📤 {L('Faylni yuborish', 'Отправить файл')}
          </button>
        }
      >
        <div className="card stack center">
          <div className="muted">{L('Boshlash kodi', 'Код старта')}</div>
          <div className="big-code" data-testid="start-code">
            {result.code}
          </div>
          <div className="muted small">
            {L('Kodni testdan oldin ovoz chiqarib ayting. Faylni Telegram orqali yuboring.', 'Назовите код вслух перед началом. Файл отправьте через Telegram.')}
          </div>
        </div>
        <div className="card small stack">
          <div>ID: {result.testId}</div>
          <div>
            {L('Savollar: ', 'Вопросов: ')}
            {result.payload.count} / {L('pul', 'пул')} {result.payload.questions.length}
          </div>
          <div>
            {L('Vaqt: ', 'Время: ')}
            {result.payload.durationMin} {L('daq', 'мин')}
          </div>
        </div>
        <button className="btn" onClick={() => setResult(null)}>
          {L('Yana test yaratish', 'Создать ещё тест')}
        </button>
      </Screen>
    );
  }

  const num = (v: number, set: (n: number) => void, min: number, max: number, stepv = 1) => (
    <input className="input" type="number" inputMode="decimal" min={min} max={max} step={stepv} value={v} onChange={(e) => set(Number(e.target.value))} />
  );

  return (
    <Screen
      title={L('Test yaratish', 'Конструктор теста')}
      back="/teacher"
      bottom={
        <button className="btn primary" disabled={busy || topics.length === 0 || avail === 0} onClick={create} data-testid="create-test">
          {busy ? '…' : L('Shifrlangan fayl yaratish', 'Создать зашифрованный файл')}
        </button>
      }
    >
      <button className="btn small" onClick={finalPreset}>
        {L('Yakuniy nazorat shabloni (35 savol, 50 daq, 2 balldan)', 'Шаблон итогового контроля (35 вопр., 50 мин, по 2 балла)')}
      </button>
      <label className="field">
        {L('Nomi', 'Название')}
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L('Masalan: 1-mavzu, 101-guruh', 'Например: Тема 1, группа 101')} />
      </label>
      <div className="card stack">
        <h3>{L('Mavzular', 'Темы')}</h3>
        {shownTopics.map((tp) => (
          <label key={tp.id} className="check">
            <input type="checkbox" checked={topics.includes(tp.id)} onChange={() => toggleTopic(tp.id)} />
            <span className="small">
              {tp.id}. {tr(tp.title)}
            </span>
          </label>
        ))}
        <label className="check">
          <input type="checkbox" checked={includeMine} onChange={(e) => setIncludeMine(e.target.checked)} />
          {L('Mening savollarimni qo‘shish', 'Включить мои вопросы')}
        </label>
        <label className="check">
          <input type="checkbox" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} />
          {L('Qoralamalarni qo‘shish (faqat sinov uchun!)', 'Включить черновики (только для проверки!)')}
        </label>
        <div className={avail ? 'muted small' : 'feedback bad small'}>
          {L('Mavjud savollar: ', 'Доступно вопросов: ')}
          <b>{avail}</b>
          {!includeDrafts && avail === 0 && L(' — savollarni “approved” qiling', ' — отметьте вопросы как “approved”')}
        </div>
      </div>
      <div className="card stack">
        <label className="field">
          {L('Har bir talabaga savollar', 'Вопросов каждому студенту')}
          {num(count, setCount, 1, 200)}
        </label>
        <label className="field">
          {L('Pul hajmi (0 — barcha mavjud)', 'Размер пула (0 — все доступные)')}
          {num(pool, setPool, 0, 1000)}
        </label>
        <label className="field">
          {L('Vaqt, daqiqa', 'Время, мин')}
          {num(duration, setDuration, 1, 300)}
        </label>
      </div>
      <div className="card stack">
        <h3>{L('Baholash', 'Перевод в балл')}</h3>
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value as ScoringMode)}>
          <option value="thresholds">{L('Chegaralar bo‘yicha (0/1/2)', 'По порогам (0/1/2)')}</option>
          <option value="linear">{L('Chiziqli 0–2', 'Линейно 0–2')}</option>
          <option value="points">{L('Har bir savolga ball', 'Баллы за каждый вопрос')}</option>
        </select>
        {mode === 'thresholds' && (
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              2 {L('ball ≥ %', 'балла при ≥ %')}
              {num(t2, setT2, 0, 100)}
            </label>
            <label className="field" style={{ flex: 1 }}>
              1 {L('ball ≥ %', 'балл при ≥ %')}
              {num(t1, setT1, 0, 100)}
            </label>
          </div>
        )}
        {mode === 'linear' && (
          <label className="field">
            {L('Qadam', 'Шаг')}
            {num(step, setStep, 0.01, 1, 0.01)}
          </label>
        )}
        {mode === 'points' && (
          <label className="field">
            {L('Bir savolga ball', 'Баллов за вопрос')}
            {num(perQ, setPerQ, 0.5, 10, 0.5)}
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
          {L('Qisman ball (bir nechta javob, moslashtirish, tartib…)', 'Частичный балл (несколько ответов, сопоставление, порядок…)')}
        </label>
      </div>
      <div className="card stack">
        <h3>{L('Qoidabuzarliklar', 'Нарушения')}</h3>
        <label className="check">
          <input type="checkbox" checked={rules.requireOffline} onChange={(e) => setRules({ ...rules, requireOffline: e.target.checked })} />
          {L('Faqat oflayn boshlash', 'Старт только офлайн')}
        </label>
        <label className="field">
          {L('Nechanchi chiqishda avtomatik topshirish (0 — hech qachon)', 'Автосдача на N-м уходе (0 — никогда)')}
          {num(rules.autoSubmitAt, (n) => setRules({ ...rules, autoSubmitAt: n }), 0, 20)}
        </label>
        <label className="check">
          <input type="checkbox" checked={rules.warn} onChange={(e) => setRules({ ...rules, warn: e.target.checked })} />
          {L('Ogohlantirish ko‘rsatish', 'Показывать предупреждение')}
        </label>
        <label className="field">
          {L('Fokus yo‘qolishiga ruxsat, ms', 'Допуск потери фокуса, мс')}
          {num(rules.blurGraceMs, (n) => setRules({ ...rules, blurGraceMs: n }), 0, 10000, 500)}
        </label>
        <label className="check">
          <input type="checkbox" checked={rules.onlineCounts} onChange={(e) => setRules({ ...rules, onlineCounts: e.target.checked })} />
          {L('Internet paydo bo‘lishi avtotopshirishga hisoblanadi', 'Появление сети считается в автосдачу')}
        </label>
        <label className="check">
          <input type="checkbox" checked={rules.fullscreen} onChange={(e) => setRules({ ...rules, fullscreen: e.target.checked })} />
          {L('Android: to‘liq ekran', 'Android: полноэкранный режим')}
        </label>
      </div>
      {error && <div className="feedback bad">{error}</div>}
    </Screen>
  );
}

export { DEFAULT_SCORING };

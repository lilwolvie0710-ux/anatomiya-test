import { useEffect, useRef, useState } from 'react';
import { Screen, Toast } from '../components/Layout';
import { acceptResult, type ScanOutcome } from './logic';
import { useL } from './useL';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

async function makeDetector(): Promise<Detector> {
  // ponyfill на zxing-wasm; .wasm берём из своей сборки, чтобы сканер работал офлайн
  const mod = await import('barcode-detector/ponyfill');
  const wasmUrl = (await import('zxing-wasm/reader/zxing_reader.wasm?url')).default;
  mod.prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  });
  return new mod.BarcodeDetector({ formats: ['qr_code'] }) as unknown as Detector;
}

export function ScanScreen() {
  const L = useL();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [count, setCount] = useState(0);
  const [manual, setManual] = useState('');
  const lastText = useRef('');
  const busy = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const describe = (r: ScanOutcome): { text: string; bad?: boolean } => {
    if (r.kind === 'invalid') return { text: L('Bu natija QR-kodi emas', 'Это не QR результата'), bad: true };
    const e = r.entry;
    const who = `${e.fullName} (${e.group}) — ${e.grade}`;
    if (r.kind === 'duplicate') return { text: L('Allaqachon bor: ', 'Уже есть: ') + who };
    if (e.status === 'bad-signature') return { text: L('IMZO NOTO‘G‘RI: ', 'ПОДПИСЬ НЕВЕРНА: ') + who, bad: true };
    if (e.status === 'unknown-test')
      return { text: L('Qo‘shildi, lekin test import qilinmagan: ', 'Добавлено, но тест не импортирован: ') + who, bad: true };
    if (e.status === 'mismatch') return { text: L('Ball mos emas, qayta hisoblandi: ', 'Балл не совпал, пересчитан: ') + who, bad: true };
    return { text: '✓ ' + who };
  };

  const handle = async (text: string) => {
    if (busy.current || text === lastText.current) return;
    busy.current = true;
    lastText.current = text;
    try {
      const r = await acceptResult(text);
      setToast(describe(r));
      if (r.kind === 'added') {
        setCount((c) => c + 1);
        navigator.vibrate?.(80);
      }
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let stop = false;
    let timer = 0;
    (async () => {
      try {
        const detector = await makeDetector();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        const v = videoRef.current!;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        await v.play();
        const tick = async () => {
          if (stop) return;
          try {
            if (v.readyState >= 2) {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) await handle(codes[0].rawValue);
            }
          } catch {
            /* кадр не распознан */
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        setError(L('Kameraga ruxsat yo‘q: ', 'Нет доступа к камере: ') + (e as Error).message);
        setActive(false);
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <Screen
      title={L('QR skanerlash', 'Сканирование QR')}
      back="/teacher"
      bottom={
        <button className={'btn ' + (active ? '' : 'primary')} onClick={() => setActive(!active)}>
          {active ? L('To‘xtatish', 'Остановить') : '📷 ' + L('Kamerani yoqish', 'Включить камеру')}
        </button>
      }
    >
      {active && (
        <div className="video-box">
          <video ref={videoRef} muted playsInline />
          <div className="frame" />
        </div>
      )}
      <div className="card row spread">
        <span>{L('Bu seansda qo‘shildi', 'Добавлено за сеанс')}</span>
        <b>{count}</b>
      </div>
      {error && <div className="feedback bad">{error}</div>}
      <details className="card">
        <summary>{L('QRsiz qo‘shish', 'Добавить без QR')}</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <input ref={fileRef} type="file" hidden accept=".txt,text/plain" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handle((await f.text()).trim());
            e.target.value = '';
          }} />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📄 {L('Natija faylini yuklash', 'Загрузить файл результата')}
          </button>
          <textarea className="input" rows={3} placeholder="AT1:..." value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="btn" disabled={!manual.trim()} onClick={() => { void handle(manual.trim()); setManual(''); }}>
            {L('Qo‘shish', 'Добавить')}
          </button>
        </div>
      </details>
      {toast && <Toast text={toast.text} bad={toast.bad} onDone={() => { setToast(null); lastText.current = ''; }} />}
    </Screen>
  );
}

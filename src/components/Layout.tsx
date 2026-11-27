import { useEffect, useRef, type ReactNode } from 'react';
import { navigate } from '../router';
import { useI18n } from '../i18n';

export function Screen({
  title,
  back,
  right,
  children,
  bottom,
}: {
  title: string;
  /** Путь для кнопки «назад»; false — без кнопки. */
  back?: string | false;
  right?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <header className="topbar">
        {back !== false && (
          <button className="btn icon ghost" aria-label={t('back')} onClick={() => navigate(back ?? '/')}>
            ←
          </button>
        )}
        <h1>{title}</h1>
        {right}
      </header>
      <main className="content">{children}</main>
      {bottom && <footer className="bottombar">{bottom}</footer>}
    </>
  );
}

export function Modal({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true">
      <div className={'modal' + (warn ? ' warn' : '')}>{children}</div>
    </div>
  );
}

export function Toast({ text, bad, onDone }: { text: string; bad?: boolean; onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), 3500);
    return () => clearTimeout(id);
  }, [text]);
  return (
    <div className={'toast' + (bad ? ' bad' : '')} role="status">
      {text}
    </div>
  );
}

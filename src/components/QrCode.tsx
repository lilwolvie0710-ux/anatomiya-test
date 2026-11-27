import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ text }: { text: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 3 })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [text]);
  return <div className="qr-box" data-testid="result-qr" data-qr={text} dangerouslySetInnerHTML={{ __html: svg }} />;
}

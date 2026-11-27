// Простые SVG-графики без библиотек.

export function LineChart({ values, height = 140 }: { values: number[]; height?: number }) {
  if (values.length === 0) return null;
  const w = 320;
  const pad = 24;
  const n = values.length;
  const x = (i: number) => pad + (n === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (n - 1));
  const y = (v: number) => height - pad - (v / 100) * (height - 2 * pad);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" role="img" aria-label="progress">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" />
          <text x={2} y={y(g) + 4} fontSize="10" fill="var(--muted)">
            {g}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="var(--accent)" />
      ))}
    </svg>
  );
}

export function Bars({ rows }: { rows: { label: string; value: number; max: number; bad?: boolean }[] }) {
  return (
    <div className="stack">
      {rows.map((r, i) => (
        <div key={i} className="stack" style={{ gap: 4 }}>
          <div className="row spread small">
            <span>{r.label}</span>
            <b>{r.max ? r.value : 0}</b>
          </div>
          <div className={'bar' + (r.bad ? ' bad' : '')}>
            <div style={{ width: `${r.max ? (r.value / r.max) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

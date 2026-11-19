/**
 * Gráficos em SVG puro + framer-motion.
 * Uma série = sem legenda (o título nomeia). Marcas finas, ponta arredondada ancorada na base,
 * grade discreta, tooltip por marca e texto sempre na cor de texto (nunca na cor da série).
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MonthPoint } from '../data/stats';

const ease = [0.22, 1, 0.36, 1] as const;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  const n = Math.ceil(v / step);
  const m = n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  const max = m * step;
  return max % 4 === 0 || max <= 10 ? max : Math.ceil(v / 4) * 4;
}

/** Largura real do contêiner: o SVG é desenhado em pixels reais para o texto nunca encolher no celular. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function MonthlyBars({ data }: { data: MonthPoint[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = W < 480 ? 220 : 250;
  const pad = { l: 30, r: 4, t: 26, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.count)));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const slot = iw / data.length;
  const bw = Math.min(46, slot * 0.46);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Atendimentos por mês: ${data.map((d) => `${d.long}, ${d.count}`).join('; ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} strokeDasharray={t === 0 ? undefined : '3 5'} />
            <text className="axis-text" x={pad.l - 10} y={y(t) + 4} textAnchor="end">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const h = (d.count / max) * ih;
          const r = Math.min(4, h / 2);
          const x0 = cx - bw / 2;
          const yb = pad.t + ih;
          const path = `M${x0},${yb} V${yb - h + r} Q${x0},${yb - h} ${x0 + r},${yb - h} H${x0 + bw - r} Q${x0 + bw},${yb - h} ${x0 + bw},${yb - h + r} V${yb} Z`;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} style={{ outline: 'none' }}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={ih + 4} fill="transparent" />
              {hover === i && <rect x={cx - slot / 2 + 6} y={pad.t - 4} width={slot - 12} height={ih + 8} rx={10} fill="var(--surface-2)" />}
              <motion.path
                d={path}
                fill={d.current ? 'var(--forest-700)' : 'color-mix(in srgb, var(--forest-600) 45%, white)'}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.7, ease }}
                style={{ originY: 1, transformBox: 'fill-box' }}
              />
              <motion.text
                className="value-text"
                x={cx}
                y={y(d.count) - 8}
                textAnchor="middle"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.4 }}
              >
                {d.count}
              </motion.text>
              <text className="axis-text" x={cx} y={H - 10} textAnchor="middle" style={d.current ? { fill: 'var(--ink)', fontWeight: 700 } : undefined}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(data[hover].count) / H) * 100}%` }}>
          <div>{data[hover].long}</div>
          <b className="num">{data[hover].count}</b> atendimentos{data[hover].current ? ' até hoje' : ''}
        </div>
      )}
    </div>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export function Donut({ slices, center, centerLabel }: { slices: DonutSlice[]; center: ReactNode; centerLabel: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 80;
  const C = 2 * Math.PI * R;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let acc = 0;

  return (
    <div className="donut-wrap">
      <div style={{ position: 'relative', width: '100%', maxWidth: 210, aspectRatio: '1' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line-2)" strokeWidth="22" />
          {slices.map((s, i) => {
            const len = (s.value / total) * C;
            const off = acc;
            acc += len;
            if (s.value === 0) return null;
            return (
              <motion.circle
                key={s.key}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === s.key ? 26 : 22}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                initial={reduce ? false : { strokeDashoffset: -off + len, opacity: 0 }}
                animate={{ strokeDashoffset: -off, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.18, duration: 0.9, ease }}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width .2s' }}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>{center}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {centerLabel}
            </div>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {slices.map((s) => (
          <div key={s.key} className="item" onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)} style={{ opacity: hover && hover !== s.key ? 0.5 : 1, transition: 'opacity .2s' }}>
            <span className="sw" style={{ background: s.color }} />
            <span>
              <span className="name">{s.label}</span>
              <span className="pc">{s.pct}% das fichas</span>
            </span>
            <span className="ct">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ rows, color = 'var(--forest-600)' }: { rows: Array<{ key: string; label: ReactNode; value: number; title?: string }>; color?: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div className="hbars">
      {rows.map((r, i) => (
        <div key={r.key} className="hbar" onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} title={`${r.title ?? r.key}: ${r.value} (${Math.round((r.value / total) * 100)}%)`}>
          <div className="hbar-label">{r.label}</div>
          <div className="hbar-track">
            <motion.div
              className="hbar-fill"
              style={{ width: `${(r.value / max) * 100}%`, background: color, filter: hover === r.key ? 'brightness(1.12)' : undefined }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.7, ease }}
            />
          </div>
          <div className="hbar-val">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

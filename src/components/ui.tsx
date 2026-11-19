import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Accessibility, Globe, Heart, Leaf, Shield, Tent, UserRound, Users } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CATEGORY_BY_ID, type Category } from '../data/categories';
import type { CategoryId, Priority } from '../data/types';
import { PRIORITY_LABEL } from '../lib/format';

/** Inclinação 3D suave que segue o ponteiro, com reflexo de luz. Desliga com movimento reduzido. */
export function Tilt({ children, className, max = 6, as = 'div', ...rest }: { children: ReactNode; className?: string; max?: number; as?: 'div' | 'button' } & Record<string, unknown>) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 22 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,255,255,0.55), transparent 45%)`;
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });
  const Comp = as === 'button' ? motion.button : motion.div;

  return (
    <Comp
      {...rest}
      className={`tilt ${className ?? ''}`}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        if (reduce || e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
        glareOpacity.set(1);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
        glareOpacity.set(0);
      }}
    >
      {children}
      {!reduce && <motion.span aria-hidden className="tilt-glare" style={{ background: glare, opacity: glareOpacity }} />}
    </Comp>
  );
}

/** Número que conta até o valor uma vez, quando aparece. */
export function CountUp({ value, suffix = '', duration = 1.1 }: { value: number; suffix?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const c = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v))
    });
    from.current = value;
    return () => c.stop();
  }, [value, reduce, duration]);
  return (
    <span className="num">
      {shown.toLocaleString('pt-BR')}
      {suffix}
    </span>
  );
}

const ICONS = { users: Users, heart: Heart, 'user-round': UserRound, tent: Tent, leaf: Leaf, accessibility: Accessibility, shield: Shield, globe: Globe };

export function CategoryIcon({ cat, size = 26 }: { cat: Category; size?: number }) {
  const I = ICONS[cat.icon];
  return <I size={size} strokeWidth={2} aria-hidden />;
}

export function CatChip({ id }: { id: CategoryId }) {
  const c = CATEGORY_BY_ID[id];
  return (
    <span className="cat-chip">
      <span className="cat-dot" style={{ background: c.color }} />
      {c.short}
    </span>
  );
}

export function PriorityPill({ p }: { p: Priority }) {
  return (
    <span className={`pill pill-${p}`}>
      {p === 'urgente' && (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3 2 21h20L12 3z" fill="currentColor" />
        </svg>
      )}
      {p === 'regular' && <span className="cat-dot" style={{ background: 'currentColor' }} />}
      {p === 'nao_informado' && <span className="cat-dot" style={{ background: 'transparent', border: '1.5px solid currentColor' }} />}
      {PRIORITY_LABEL[p]}
    </span>
  );
}

export const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16 } }
} as const;

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const stagger = (i: number, base = 0.06) => ({
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { delay: i * base, duration: 0.5, ease: EASE } }
});

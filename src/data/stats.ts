/** Funções puras de agregação. Tudo que o painel e os relatórios mostram sai daqui (e é testado). */
import type { Atendimento, CategoryId, Priority } from './types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const monthLabel = (d: Date) => MONTHS[d.getMonth()];
export const monthLong = (d: Date) => `${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export interface MonthPoint {
  key: string;
  label: string;
  long: string;
  count: number;
  current: boolean;
}

export function monthlySeries(records: Atendimento[], ref: Date, months = 6): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: monthLabel(d), long: monthLong(d), count: 0, current: i === 0 });
  }
  const idx = new Map(out.map((p, i) => [p.key, i]));
  for (const r of records) {
    const i = idx.get(monthKey(new Date(r.createdAt)));
    if (i !== undefined) out[i].count++;
  }
  return out;
}

export function inLastMonths(records: Atendimento[], ref: Date, months: number): Atendimento[] {
  const start = new Date(ref.getFullYear(), ref.getMonth() - (months - 1), 1).getTime();
  return records.filter((r) => new Date(r.createdAt).getTime() >= start);
}

export interface Kpis {
  total: number;
  thisMonth: number;
  lastMonth: number;
  urgent: number;
  urgentPct: number;
  informed: number;
  informedPct: number;
  pending: number;
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export function kpis(records: Atendimento[], ref: Date): Kpis {
  const series = monthlySeries(records, ref, 2);
  const urgent = records.filter((r) => r.prioridade === 'urgente').length;
  const informed = records.filter((r) => r.prioridade !== 'nao_informado').length;
  return {
    total: records.length,
    thisMonth: series[1].count,
    lastMonth: series[0].count,
    urgent,
    urgentPct: pct(urgent, records.length),
    informed,
    informedPct: pct(informed, records.length),
    pending: records.filter((r) => r.sync !== 'synced').length
  };
}

export function countBy<T extends string>(records: Atendimento[], key: (r: Atendimento) => T | T[]): Array<{ key: T; count: number }> {
  const m = new Map<T, number>();
  for (const r of records) {
    const k = key(r);
    for (const v of Array.isArray(k) ? k : [k]) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

export const PRIORITY_ORDER: Priority[] = ['urgente', 'regular', 'nao_informado'];

export function priorityBreakdown(records: Atendimento[]) {
  return PRIORITY_ORDER.map((p) => {
    const count = records.filter((r) => r.prioridade === p).length;
    return { key: p, count, pct: pct(count, records.length) };
  });
}

export const byCategory = (records: Atendimento[]) => countBy<CategoryId>(records, (r) => r.categorias);
export const byModalidade = (records: Atendimento[]) => countBy(records, (r) => r.modalidade);
export const byUnidade = (records: Atendimento[]) => countBy(records, (r) => r.unidade);
export const byEncaminhamento = (records: Atendimento[]) => countBy(records, (r) => r.encaminhamentos);
export const byIngresso = (records: Atendimento[]) => countBy(records, (r) => r.ingresso);

/** CSV com separador ";" (padrão do Excel em pt-BR) e só dados não sensíveis. */
export function toCsv(records: Atendimento[]): string {
  const head = ['codigo', 'data', 'unidade', 'categorias', 'modalidade', 'ingresso', 'prioridade', 'status', 'encaminhamentos'];
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = records.map((r) =>
    [r.id, r.createdAt.slice(0, 10), r.unidade, r.categorias.join('|'), r.modalidade, r.ingresso, r.prioridade, r.status, r.encaminhamentos.join('|')].map(esc).join(';')
  );
  return [head.join(';'), ...rows].join('\n');
}

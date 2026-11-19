import type { CaseStatus, Priority } from '../data/types';

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgente: 'Urgente',
  regular: 'Regular',
  nao_informado: 'Não informado'
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  em_acompanhamento: 'Em acompanhamento',
  aguardando_retorno: 'Aguardando retorno',
  encerrado: 'Encerrado'
};

const dtf = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const tf = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const longf = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtDate = (iso: string) => dtf.format(new Date(iso));
export const fmtTime = (iso: string) => tf.format(new Date(iso));
export const fmtDateTime = (iso: string) => `${fmtDate(iso)} às ${fmtTime(iso)}`;
export const fmtLong = (d: Date) => longf.format(d);

/** "2026-11-18" → "18/11/2026" (datas de campos de formulário, sem fuso). */
export const fmtIsoDay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v);

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

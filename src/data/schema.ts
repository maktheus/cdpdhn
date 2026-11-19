/**
 * Motor de formulários dirigido por JSON Schema.
 *
 * Cada subformulário é um arquivo em src/data/schemas/*.json (draft 2020-12 + extensões "x-").
 * A interface NÃO conhece campos: ela lê o schema e desenha. Para trocar pelos schemas
 * oficiais, basta substituir os arquivos da pasta mantendo as extensões abaixo.
 *
 *   x-order      número da seção (ordem na barra lateral)
 *   x-appliesTo  ["*"] ou ids de categoria; fora delas a seção vira opcional
 *   x-ui         { widget, span, placeholder, help, mask, sensitive, mono, autofill, showIf }
 */
import type { CategoryId, SectionAnswers } from './types';

export interface ShowIf {
  field: string;
  equals?: unknown;
  in?: unknown[];
}

export interface XUi {
  widget?: 'textarea' | 'radio' | 'checkboxes' | 'select';
  span?: 1 | 2;
  placeholder?: string;
  help?: string;
  mask?: 'cpf' | 'phone';
  sensitive?: boolean;
  mono?: boolean;
  autofill?: 'today' | 'now' | 'user' | 'unit' | 'code';
  showIf?: ShowIf;
}

export interface PropertySchema {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  title: string;
  enum?: string[];
  format?: 'date' | 'time';
  pattern?: string;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  readOnly?: boolean;
  default?: unknown;
  items?: { type: string; enum?: string[] };
  'x-ui'?: XUi;
}

export interface SectionSchema {
  $id: string;
  title: string;
  description?: string;
  type: 'object';
  'x-order': number;
  'x-appliesTo'?: Array<CategoryId | '*'>;
  properties: Record<string, PropertySchema>;
  required?: string[];
}

export type FieldKind = 'text' | 'textarea' | 'date' | 'time' | 'number' | 'select' | 'radio' | 'checkboxes' | 'boolean';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  options: string[];
  required: boolean;
  schema: PropertySchema;
  ui: XUi;
}

export interface Section {
  id: string; // nome do arquivo sem .json, ex.: 01-identificacao-atendimento
  order: number;
  title: string;
  description: string;
  appliesTo: Array<CategoryId | '*'>;
  fields: Field[];
  schema: SectionSchema;
}

/** Decide o widget a partir do schema. Regra simples, previsível e sobrescrevível por x-ui.widget. */
export function fieldKind(p: PropertySchema): FieldKind {
  const w = p['x-ui']?.widget;
  if (p.type === 'array') return 'checkboxes';
  if (p.type === 'boolean') return 'boolean';
  if (p.type === 'integer' || p.type === 'number') return 'number';
  if (w === 'textarea') return 'textarea';
  if (p.format === 'date') return 'date';
  if (p.format === 'time') return 'time';
  if (p.enum) {
    if (w === 'radio') return 'radio';
    if (w === 'select') return 'select';
    return p.enum.length <= 3 ? 'radio' : 'select';
  }
  return 'text';
}

export function toSection(id: string, schema: SectionSchema): Section {
  const required = new Set(schema.required ?? []);
  return {
    id,
    order: schema['x-order'],
    title: schema.title,
    description: schema.description ?? '',
    appliesTo: schema['x-appliesTo'] ?? ['*'],
    schema,
    fields: Object.entries(schema.properties).map(([key, p]) => ({
      key,
      label: p.title,
      kind: fieldKind(p),
      options: p.enum ?? p.items?.enum ?? [],
      required: required.has(key),
      schema: p,
      ui: p['x-ui'] ?? {}
    }))
  };
}

/** Carrega todos os JSON da pasta schemas em tempo de build, ordenados por x-order. */
export function loadSections(): Section[] {
  const mods = import.meta.glob('./schemas/*.json', { eager: true, import: 'default' }) as Record<string, SectionSchema>;
  return Object.entries(mods)
    .map(([path, schema]) => toSection(path.split('/').pop()!.replace('.json', ''), schema))
    .sort((a, b) => a.order - b.order);
}

export function isVisible(field: Field, answers: SectionAnswers): boolean {
  const cond = field.ui.showIf;
  if (!cond) return true;
  const v = answers[cond.field];
  if (cond.in) return cond.in.includes(v);
  return v === cond.equals;
}

export function sectionApplies(section: Section, categorias: CategoryId[]): boolean {
  return section.appliesTo.includes('*') || section.appliesTo.some((c) => categorias.includes(c as CategoryId));
}

export function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** CPF com dígitos verificadores (módulo 11). */
export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Valida as respostas de uma seção. Retorna { campo: mensagem }. Campos ocultos não são validados. */
export function validateSection(section: Section, answers: SectionAnswers, enforceRequired = true): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of section.fields) {
    if (!isVisible(f, answers)) continue;
    const v = answers[f.key];
    const p = f.schema;
    if (isEmpty(v)) {
      if (enforceRequired && f.required) errors[f.key] = f.kind === 'checkboxes' ? 'Marque pelo menos uma opção.' : 'Preencha este campo.';
      continue;
    }
    if (f.kind === 'boolean' && typeof v !== 'boolean') errors[f.key] = 'Responda sim ou não.';
    if (p.enum && !p.enum.includes(v as string)) errors[f.key] = 'Escolha uma das opções da lista.';
    if (p.type === 'array' && p.items?.enum && (v as string[]).some((x) => !p.items!.enum!.includes(x)))
      errors[f.key] = 'Há uma opção que não existe mais nesta lista.';
    if (p.minItems && Array.isArray(v) && v.length < p.minItems) errors[f.key] = `Marque pelo menos ${p.minItems}.`;
    if (p.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) errors[f.key] = 'Use o formato dd/mm/aaaa.';
    if (p.format === 'time' && !/^\d{2}:\d{2}$/.test(String(v))) errors[f.key] = 'Use o formato hh:mm.';
    if (p.minLength && String(v).trim().length < p.minLength) errors[f.key] = `Escreva pelo menos ${p.minLength} caracteres.`;
    if ((p.type === 'integer' || p.type === 'number') && typeof v === 'number') {
      if (p.minimum !== undefined && v < p.minimum) errors[f.key] = `O mínimo é ${p.minimum}.`;
      if (p.maximum !== undefined && v > p.maximum) errors[f.key] = `O máximo é ${p.maximum}.`;
    }
    if (p.pattern && !new RegExp(p.pattern).test(String(v))) errors[f.key] = 'Formato inválido.';
    else if (f.ui.mask === 'cpf' && !isValidCpf(String(v))) errors[f.key] = 'CPF inválido: confira os dígitos.';
  }
  return errors;
}

export type SectionState = 'empty' | 'partial' | 'complete' | 'error';

export function sectionState(section: Section, answers: SectionAnswers = {}): { state: SectionState; filled: number; total: number } {
  const visible = section.fields.filter((f) => isVisible(f, answers) && !f.schema.readOnly);
  const filled = visible.filter((f) => !isEmpty(answers[f.key])).length;
  const errors = validateSection(section, answers);
  const missingRequired = section.fields.some((f) => f.required && isVisible(f, answers) && isEmpty(answers[f.key]));
  const formatErrors = Object.keys(errors).some((k) => !isEmpty(answers[k]));
  let state: SectionState = 'empty';
  if (formatErrors) state = 'error';
  else if (filled === 0) state = 'empty';
  else if (!missingRequired) state = 'complete';
  else state = 'partial';
  return { state, filled, total: visible.length };
}

/** Máscaras de entrada. */
export function applyMask(mask: XUi['mask'], raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (mask === 'cpf') {
    const x = d.slice(0, 11);
    return x
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  if (mask === 'phone') {
    const x = d.slice(0, 11);
    if (x.length <= 2) return x.length ? `(${x}` : '';
    if (x.length <= 7) return `(${x.slice(0, 2)}) ${x.slice(2)}`;
    return `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}`;
  }
  return raw;
}

/** Exibe dado sensível mascarado: 123.456.789-09 → ***.456.***-** */
export function maskSensitive(value: string): string {
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) return `•••.${value.slice(4, 7)}.•••-••`;
  if (value.length <= 2) return '••';
  return value[0] + '•'.repeat(Math.min(8, value.length - 1));
}

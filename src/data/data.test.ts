import { describe, expect, it } from 'vitest';
import { applyMask, isValidCpf, isVisible, loadSections, sectionApplies, sectionState, validateSection } from './schema';
import { fakeCpf, generateSeed, mulberry32 } from './seed';
import { byCategory, kpis, monthlySeries, priorityBreakdown, toCsv } from './stats';

const REF = new Date(2026, 10, 18, 18, 0); // 18/11/2026
const sections = loadSections();
const byId = (id: string) => sections.find((s) => s.id === id)!;

describe('schemas dos 10 subformulários', () => {
  it('carrega 10 seções em ordem', () => {
    expect(sections).toHaveLength(10);
    expect(sections.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(sections[0].title).toBe('Identificação do atendimento');
  });

  it('todo campo obrigatório existe nas propriedades', () => {
    for (const s of sections) for (const r of s.schema.required ?? []) expect(s.schema.properties[r], `${s.id}.${r}`).toBeDefined();
  });

  it('seções específicas só se aplicam às categorias certas', () => {
    expect(sectionApplies(byId('04-responsaveis-protecao-criancas'), ['situacao_rua'])).toBe(false);
    expect(sectionApplies(byId('04-responsaveis-protecao-criancas'), ['criancas'])).toBe(true);
    expect(sectionApplies(byId('01-identificacao-atendimento'), [])).toBe(true);
  });
});

describe('validação', () => {
  const s1 = byId('01-identificacao-atendimento');

  it('acusa obrigatórios vazios', () => {
    const errors = validateSection(s1, {});
    expect(Object.keys(errors).sort()).toEqual(['data', 'hora', 'ingresso', 'modalidade', 'profissional', 'tipo', 'unidade'].sort());
  });

  it('aceita seção completa', () => {
    const ok = { data: '2026-11-18', hora: '09:30', unidade: 'Unidade Centro', profissional: 'Luiza', tipo: 'Acolhida inicial', modalidade: 'Presencial', ingresso: 'Busca ativa' };
    expect(validateSection(s1, ok)).toEqual({});
    expect(sectionState(s1, ok).state).toBe('complete');
  });

  it('rejeita opção fora do enum', () => {
    expect(validateSection(s1, { tipo: 'Inventado' }, false).tipo).toMatch(/opções/);
  });

  it('campo condicional só aparece quando a condição vale', () => {
    const s2 = byId('02-identificacao-contato-seguro');
    const f = s2.fields.find((x) => x.key === 'orientacao_contato')!;
    expect(isVisible(f, { contato_seguro: 'Sim' })).toBe(false);
    expect(isVisible(f, { contato_seguro: 'Não' })).toBe(true);
  });

  it('CPF: dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) expect(isValidCpf(fakeCpf(rng))).toBe(true);
  });

  it('máscaras', () => {
    expect(applyMask('cpf', '52998224725')).toBe('529.982.247-25');
    expect(applyMask('phone', '92981234567')).toBe('(92) 98123-4567');
  });
});

describe('dados fictícios e estatísticas', () => {
  const records = generateSeed(REF);

  it('seed é determinístico', () => {
    expect(generateSeed(REF).map((r) => r.id)).toEqual(records.map((r) => r.id));
  });

  it('nenhum registro no futuro e ids únicos', () => {
    expect(records.every((r) => new Date(r.createdAt) <= REF)).toBe(true);
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  });

  it('série mensal soma o total dos 6 meses', () => {
    const series = monthlySeries(records, REF);
    expect(series).toHaveLength(6);
    expect(series[5]).toMatchObject({ label: 'nov', current: true });
    expect(series.reduce((s, p) => s + p.count, 0)).toBe(records.length);
  });

  it('KPIs batem com as contagens', () => {
    const k = kpis(records, REF);
    const pb = priorityBreakdown(records);
    expect(k.urgent).toBe(pb[0].count);
    expect(pb.reduce((s, p) => s + p.count, 0)).toBe(records.length);
    expect(k.thisMonth).toBe(monthlySeries(records, REF)[5].count);
  });

  it('não há registros de formulários ainda indisponíveis', () => {
    const cats = byCategory(records).map((c) => c.key);
    expect(cats).not.toContain('mulheres');
    expect(cats).not.toContain('idosa');
  });

  it('CSV não vaza dado sensível', () => {
    const csv = toCsv(records.slice(0, 5));
    expect(csv.split('\n')).toHaveLength(6);
    expect(csv).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });
});

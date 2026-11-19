/**
 * Gerador de fichas FICTÍCIAS para demonstração.
 * Determinístico (mesma semente → mesmos dados) e relativo à data de hoje,
 * para que a demo sempre pareça viva sem nunca usar dado real de ninguém.
 */
import type { Atendimento, CaseStatus, CategoryId, Priority } from './types';

export const UNIDADES = [
  'Unidade Centro',
  'Unidade Zona Norte',
  'Unidade Zona Leste',
  'Equipe de Abordagem Social',
  'Projeto Ribeirinho (Rio Negro)'
];

export const PROFISSIONAIS = [
  'Luiza Andrade, assistente social',
  'Carlos Menezes, psicólogo',
  'Joana Lima, educadora social',
  'Rafael Souza, advogado',
  'Beatriz Nogueira, assistente social',
  'Tiago Prado, educador social'
];

const BAIRROS = ['Centro', 'Compensa', 'Cidade de Deus', 'Jorge Teixeira', 'São José Operário', 'Educandos', 'Coroado', 'Tarumã', 'Mauazinho', 'Colônia Antônio Aleixo'];
const NOMES = ['Maria', 'Ana', 'Joana', 'Rita', 'Lúcia', 'Paulo', 'José', 'Marcos', 'Pedro', 'Yorgelis', 'Daniela', 'Luis', 'Raimunda', 'Francisco', 'Kelly'];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
function weighted<T>(rng: Rng, pairs: Array<[T, number]>): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
}
const pad = (n: number, len = 2) => String(n).padStart(len, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** CPF fictício com dígitos verificadores válidos. */
export function fakeCpf(rng: Rng): string {
  const n = Array.from({ length: 9 }, () => Math.floor(rng() * 10));
  const dv = (base: number[]) => {
    const sum = base.reduce((s, x, i) => s + x * (base.length + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  const s = n.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

const CAT_WEIGHTS: Array<[CategoryId, number]> = [
  ['criancas', 30],
  ['situacao_rua', 21],
  ['violencia', 17],
  ['migrantes', 13],
  ['alcool_drogas', 11],
  ['deficiencia', 8]
];

const DEMANDAS: Record<string, string[]> = {
  criancas: ['Educação', 'Proteção contra violência', 'Alimentação', 'Documentação'],
  situacao_rua: ['Moradia', 'Alimentação', 'Documentação', 'Trabalho e renda'],
  violencia: ['Proteção contra violência', 'Orientação jurídica', 'Moradia'],
  migrantes: ['Regularização migratória', 'Documentação', 'Trabalho e renda', 'Educação'],
  alcool_drogas: ['Saúde', 'Trabalho e renda', 'Moradia'],
  deficiencia: ['Saúde', 'Documentação', 'Orientação jurídica']
};

const ENCAMINHA: Record<string, string[]> = {
  criancas: ['Conselho Tutelar', 'CRAS', 'UBS', 'CREAS'],
  situacao_rua: ['Centro POP', 'CRAS', 'Casa de acolhimento', 'UBS'],
  violencia: ['Defensoria Pública', 'Delegacia especializada', 'CREAS', 'Casa de acolhimento'],
  migrantes: ['Centro de Referência para Migrantes', 'CRAS', 'Defensoria Pública'],
  alcool_drogas: ['CAPS AD', 'Centro POP', 'UBS'],
  deficiencia: ['CRAS', 'UBS', 'Defensoria Pública']
};

const SINTESES: Record<string, string[]> = {
  criancas: [
    'Adolescente chegou acompanhada da avó, relatando afastamento escolar há dois meses. Família sem renda fixa. Combinado contato com a escola e acionamento do CRAS.',
    'Criança de 9 anos com faltas frequentes e sinais de negligência relatados pela escola. Conselho Tutelar acionado; visita domiciliar agendada.'
  ],
  situacao_rua: [
    'Homem adulto abordado no Centro, pernoita em praça há cerca de um ano. Quer emitir documentos e conhecer o Centro POP.',
    'Mulher em situação de rua há seis meses após perda da moradia. Aceitou acolhimento temporário e acompanhamento no CRAS.'
  ],
  violencia: [
    'Pessoa relata ameaças recorrentes de familiar. Definido contato seguro apenas por mensagem. Encaminhada à Defensoria Pública para medida protetiva.',
    'Relato de violência psicológica no ambiente doméstico. Plano de segurança construído com a pessoa; retorno combinado em uma semana.'
  ],
  migrantes: [
    'Família venezuelana com três crianças, chegada recente a Manaus. Precisa de regularização migratória e matrícula escolar.',
    'Homem haitiano com protocolo de refúgio vencido. Orientado sobre renovação e encaminhado ao Centro de Referência para Migrantes.'
  ],
  alcool_drogas: [
    'Relata uso prejudicial de álcool e desejo de reduzir. Aceitou acompanhamento no CAPS AD; vínculos familiares fragilizados.',
    'Jovem em uso de crack, com histórico de internações. Construído plano de redução de danos e retorno semanal.'
  ],
  deficiencia: [
    'Pessoa com deficiência visual sem acesso ao BPC. Orientada sobre documentos e encaminhada ao CRAS para o requerimento.',
    'Cadeirante sem acessibilidade em casa, em área de palafita. Encaminhada à Defensoria para pedido de adequação habitacional.'
  ]
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  em_acompanhamento: 'Em acompanhamento',
  aguardando_retorno: 'Aguardando retorno',
  encerrado: 'Encerrado'
};

/** Atendimentos por mês, do mais antigo ao atual (o atual é proporcional aos dias corridos). */
const MONTHLY = [18, 24, 27, 31, 36, 34];

export function generateSeed(ref: Date = new Date(), seed = 2026): Atendimento[] {
  const rng = mulberry32(seed);
  const items: Omit<Atendimento, 'id'>[] = [];

  for (let m = 0; m < 6; m++) {
    const monthStart = new Date(ref.getFullYear(), ref.getMonth() - (5 - m), 1);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const isCurrent = m === 5;
    const lastDay = isCurrent ? ref.getDate() : daysInMonth;
    const count = isCurrent ? Math.max(1, Math.round((MONTHLY[m] * ref.getDate()) / daysInMonth)) : MONTHLY[m];

    for (let i = 0; i < count; i++) {
      const day = 1 + Math.floor(rng() * lastDay);
      const created = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 8 + Math.floor(rng() * 9), Math.floor(rng() * 60));
      if (created > ref) created.setTime(ref.getTime() - 3600_000 * (1 + i));

      const primary = weighted(rng, CAT_WEIGHTS);
      const categorias: CategoryId[] = [primary];
      if (rng() < 0.22) {
        const second = weighted(rng, CAT_WEIGHTS);
        if (second !== primary) categorias.push(second);
      }

      const unidade = primary === 'situacao_rua' && rng() < 0.6 ? 'Equipe de Abordagem Social' : weighted(rng, [
        [UNIDADES[0], 30], [UNIDADES[1], 22], [UNIDADES[2], 22], [UNIDADES[3], 12], [UNIDADES[4], 14]
      ]);
      const modalidade =
        unidade === 'Equipe de Abordagem Social' || unidade.startsWith('Projeto Ribeirinho')
          ? weighted(rng, [['Itinerante em campo', 75], ['Presencial', 15], ['Visita domiciliar', 10]])
          : weighted(rng, [['Presencial', 58], ['Visita domiciliar', 18], ['Remoto (telefone ou vídeo)', 14], ['Itinerante em campo', 10]]);
      const tipo = weighted(rng, [['Acolhida inicial', 38], ['Atendimento particularizado', 22], ['Acompanhamento ou retorno', 24], ['Abordagem social', primary === 'situacao_rua' ? 30 : 4], ['Visita domiciliar', 8]]);
      const ingresso = weighted(rng, [['Demanda espontânea', 36], ['Busca ativa', primary === 'situacao_rua' ? 40 : 14], ['Encaminhamento da rede', 34], ['Denúncia (Disque 100 ou ouvidoria)', primary === 'violencia' || primary === 'criancas' ? 16 : 3]]);
      const origem = weighted(rng, [['CRAS', 20], ['CREAS', 14], ['Conselho Tutelar', primary === 'criancas' ? 22 : 4], ['Defensoria Pública', 9], ['Saúde (UBS ou CAPS)', 12], ['Escola', primary === 'criancas' ? 14 : 2], ['Comunidade ou liderança local', 16], ['Outra', 5]]);

      const prioridade: Priority = weighted(rng, [['urgente', primary === 'violencia' ? 26 : 11], ['regular', 63], ['nao_informado', 24]]);
      const risco = prioridade === 'urgente' ? weighted(rng, [['Alto', 60], ['Iminente', 40]]) : prioridade === 'regular' ? weighted(rng, [['Baixo', 55], ['Médio', 45]]) : 'Não informado';

      const ageDays = (ref.getTime() - created.getTime()) / 86_400_000;
      const status: CaseStatus = ageDays > 90
        ? weighted(rng, [['encerrado', 58], ['em_acompanhamento', 30], ['aguardando_retorno', 12]])
        : weighted(rng, [['em_acompanhamento', 58], ['aguardando_retorno', 27], ['encerrado', 15]]);

      const dem = DEMANDAS[primary];
      const demandas = dem.filter((_, idx) => idx === 0 || rng() < 0.4);
      const enc = ENCAMINHA[primary];
      const encaminhamentos = enc.filter((_, idx) => idx === 0 || rng() < 0.35);

      const profissional = pick(rng, PROFISSIONAIS);
      const nome = pick(rng, NOMES);
      const sobrenome = pick(rng, ['S.', 'R.', 'L.', 'M.', 'C.', 'P.', 'A.']);
      const pessoa = `P-${pad(100 + Math.floor(rng() * 899), 4)}`;
      const prontuario = `PR-${created.getFullYear()}-${pad(Math.floor(rng() * 9999), 4)}`;
      const caso = `C-${pad(Math.floor(rng() * 9999), 4)}`;
      const sintese = pick(rng, SINTESES[primary]);
      const retorno = new Date(created.getTime() + (7 + Math.floor(rng() * 21)) * 86_400_000);

      const timeline = [{ at: created.toISOString(), label: 'Atendimento registrado', by: profissional.split(',')[0] }];
      encaminhamentos.forEach((e, k) =>
        timeline.push({ at: new Date(created.getTime() + (k + 1) * 3600_000 * 20).toISOString(), label: `Encaminhada(o) para ${e}`, by: profissional.split(',')[0] })
      );
      if (status === 'encerrado') timeline.push({ at: new Date(Math.min(ref.getTime(), created.getTime() + 40 * 86_400_000)).toISOString(), label: 'Caso encerrado', by: profissional.split(',')[0] });

      items.push({
        pessoa,
        prontuario,
        caso,
        iniciais: `${nome[0]}. ${sobrenome}`,
        createdAt: created.toISOString(),
        unidade,
        profissional,
        categorias,
        tipo,
        modalidade,
        ingresso,
        origem,
        prioridade,
        risco,
        status,
        demandas,
        encaminhamentos,
        timeline,
        sync: 'synced',
        respostas: {
          '01-identificacao-atendimento': { codigo_pessoa: pessoa, prontuario, codigo_caso: caso, data: isoDate(created), hora: isoTime(created), unidade, profissional, tipo, modalidade, ingresso, origem },
          '02-identificacao-contato-seguro': {
            nome_social: `${nome} ${sobrenome}`,
            cpf: fakeCpf(rng),
            nacionalidade: primary === 'migrantes' ? weighted(rng, [['Venezuelana', 70], ['Haitiana', 18], ['Cubana', 12]]) : 'Brasileira',
            contato_seguro: primary === 'violencia' ? 'Somente em horários combinados' : 'Sim',
            bairro: pick(rng, BAIRROS),
            municipio: 'Manaus',
            ciencia_lgpd: true
          },
          '08-demandas-riscos-rede': { demandas, nivel_risco: risco === 'Não informado' ? undefined : risco, prioridade: prioridade === 'urgente' ? 'Urgente' : prioridade === 'regular' ? 'Regular' : undefined },
          '09-sintese-plano-encaminhamentos': { sintese, encaminhamentos, prazo_retorno: isoDate(retorno), responsavel_plano: profissional },
          '10-evolucao-avaliacao-encerramento': { status: STATUS_LABEL[status] }
        }
      });
    }
  }

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return items.map((it, idx) => ({ ...it, id: `AT-${new Date(it.createdAt).getFullYear()}-${pad(1000 + idx + 1, 4)}` }));
}

/** Respostas de exemplo (fictícias) para o botão "Preencher com exemplo" da demonstração. */
import type { Answers, CategoryId } from './types';

export function exampleAnswers(categorias: CategoryId[], base: Answers): Answers {
  const has = (c: CategoryId) => categorias.includes(c);
  const today = new Date();
  const plus = (d: number) => new Date(today.getTime() + d * 86_400_000).toISOString().slice(0, 10);

  return {
    ...base,
    '01-identificacao-atendimento': {
      ...base['01-identificacao-atendimento'],
      codigo_pessoa: 'P-0417',
      prontuario: `PR-${today.getFullYear()}-0912`,
      codigo_caso: 'C-2231',
      tipo: has('situacao_rua') ? 'Abordagem social' : 'Acolhida inicial',
      modalidade: has('situacao_rua') ? 'Itinerante em campo' : 'Presencial',
      ingresso: has('criancas') ? 'Encaminhamento da rede' : 'Busca ativa',
      origem: has('criancas') ? 'Conselho Tutelar' : 'Comunidade ou liderança local'
    },
    '02-identificacao-contato-seguro': {
      ...base['02-identificacao-contato-seguro'],
      nome_social: 'Kauã R.',
      data_nascimento: '2011-04-09',
      sexo: 'Masculino',
      raca_cor: 'Parda',
      nacionalidade: 'Brasileira',
      telefone: '(92) 98123-4567',
      contato_seguro: 'Somente em horários combinados',
      orientacao_contato: 'Ligar para a avó depois das 18h. Não deixar recado com vizinhos.',
      bairro: 'Educandos',
      municipio: 'Manaus',
      ciencia_lgpd: true
    },
    '03-documentacao-familia-renda': {
      documentos: ['Certidão de nascimento', 'Cartão do SUS'],
      precisa_documentos: true,
      pessoas_familia: 4,
      renda_familiar: 'Até 1/4 do salário mínimo',
      beneficios: ['Bolsa Família'],
      cadunico: 'Sim'
    },
    ...(has('criancas')
      ? {
          '04-responsaveis-protecao-criancas': {
            responsavel_nome: 'Raimunda R.',
            vinculo: 'Avó ou avô',
            convive_responsavel: true,
            direitos_violados: ['Negligência', 'Afastamento escolar'],
            conselho_tutelar: true,
            data_conselho: plus(-3),
            medida_protetiva: 'Em análise'
          },
          '05-moradia-alimentacao-educacao': {
            tipo_moradia: 'Palafita ou área de risco',
            condicoes: ['Energia elétrica'],
            seguranca_alimentar: 'Insegurança moderada',
            refeicoes_dia: 2,
            matriculado: true,
            serie: '7º ano',
            frequencia: 'Irregular'
          }
        }
      : {}),
    ...(has('situacao_rua')
      ? {
          '06-situacao-rua-pernoite-apoios': {
            em_situacao_rua: true,
            tempo_rua: '6 meses a 1 ano',
            pernoite: 'Rua ou praça',
            motivos: ['Conflitos familiares', 'Perda da moradia'],
            apoios: ['Alimentação'],
            vinculos: 'Fragilizados'
          }
        }
      : {}),
    '07-saude-necessidades-apoio': {
      deficiencia: 'Não',
      acompanhamento_saude: ['UBS'],
      medicacao_continua: false,
      uso_substancias: 'Prefere não informar',
      gestante: 'Não se aplica',
      apoios_necessarios: ['Transporte']
    },
    '08-demandas-riscos-rede': {
      demandas: has('criancas') ? ['Educação', 'Alimentação', 'Documentação'] : ['Moradia', 'Documentação'],
      nivel_risco: 'Alto',
      prioridade: 'Urgente',
      justificativa_urgencia: 'Afastamento escolar há dois meses e insegurança alimentar moderada na casa.',
      rede_acessada: ['CRAS']
    },
    '09-sintese-plano-encaminhamentos': {
      ...base['09-sintese-plano-encaminhamentos'],
      sintese:
        'Adolescente de 15 anos chegou acompanhado da avó, encaminhado pelo Conselho Tutelar. Está fora da escola há dois meses e a família vive com menos de 1/4 do salário mínimo por pessoa.',
      objetivos: 'Retomar a frequência escolar em 30 dias e garantir acesso a benefício alimentar.',
      encaminhamentos: has('criancas') ? ['CRAS', 'Conselho Tutelar'] : ['Centro POP', 'CRAS'],
      prazo_retorno: plus(14)
    },
    '10-evolucao-avaliacao-encerramento': {
      status: 'Em acompanhamento',
      avaliacao_encaminhamentos: 'Aguardando resposta'
    }
  };
}

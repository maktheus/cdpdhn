export type CategoryId =
  | 'criancas'
  | 'mulheres'
  | 'idosa'
  | 'situacao_rua'
  | 'alcool_drogas'
  | 'deficiencia'
  | 'violencia'
  | 'migrantes';

export type Priority = 'urgente' | 'regular' | 'nao_informado';
export type CaseStatus = 'em_acompanhamento' | 'aguardando_retorno' | 'encerrado';
export type SyncState = 'synced' | 'pending' | 'syncing';

/** Respostas de um subformulário: chave do campo → valor. */
export type SectionAnswers = Record<string, unknown>;
/** Respostas da ficha inteira: id do schema → respostas. */
export type Answers = Record<string, SectionAnswers>;

export interface TimelineEvent {
  at: string;
  label: string;
  by: string;
}

export interface Atendimento {
  id: string; // AT-2026-0001
  pessoa: string; // P-0142 (pseudônimo; nome fica só na seção 2, mascarado)
  prontuario: string;
  caso: string;
  iniciais: string;
  createdAt: string; // ISO
  unidade: string;
  profissional: string;
  categorias: CategoryId[];
  tipo: string;
  modalidade: string;
  ingresso: string;
  origem: string;
  prioridade: Priority;
  risco: string;
  status: CaseStatus;
  demandas: string[];
  encaminhamentos: string[];
  respostas: Answers;
  timeline: TimelineEvent[];
  sync: SyncState;
}

export interface Session {
  name: string;
  role: 'tecnico' | 'coordenacao';
  roleLabel: string;
  email: string;
  unidade: string;
}

export interface Draft {
  categorias: CategoryId[];
  respostas: Answers;
  section: number;
  startedAt: string;
  savedAt?: string;
}

export interface AuditEntry {
  at: string;
  user: string;
  action: string;
  recordId: string;
}

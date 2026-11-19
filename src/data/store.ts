/**
 * Estado da aplicação (zustand + persistência local).
 *
 * Aqui mora o "back-end de mentira": todas as operações são assíncronas e com latência
 * simulada, com a mesma forma que a API real terá. Trocar por fetch() é trocar o corpo
 * destas funções, sem mexer nas telas.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateSeed, isoDate, isoTime } from './seed';
import { exampleAnswers } from './demoFill';
import { loadSections } from './schema';
import type { Answers, Atendimento, AuditEntry, CaseStatus, CategoryId, Draft, Priority, Session } from './types';

export const SECTIONS = loadSections();
const STORAGE_KEY = 'cdpdhn-demo-v1';

const memory = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  }
};

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Toast {
  id: number;
  tone: 'ok' | 'info' | 'warn';
  text: string;
}

interface AppState {
  session: Session | null;
  records: Atendimento[];
  draft: Draft | null;
  audit: AuditEntry[];
  simulatedOffline: boolean;
  netOnline: boolean;
  syncing: boolean;
  toasts: Toast[];
  lastCreatedId: string | null;

  login: (email: string, role: Session['role']) => Promise<void>;
  logout: () => void;
  startDraft: (categorias: CategoryId[]) => void;
  setDraftCategories: (categorias: CategoryId[]) => void;
  updateField: (sectionId: string, key: string, value: unknown) => void;
  setSection: (index: number) => void;
  fillExample: () => void;
  discardDraft: () => void;
  submitDraft: () => Promise<Atendimento>;
  setSimulatedOffline: (v: boolean) => void;
  setNetOnline: (v: boolean) => void;
  syncPending: () => Promise<number>;
  logAccess: (recordId: string, action: string) => void;
  toast: (tone: Toast['tone'], text: string) => void;
  dismissToast: (id: number) => void;
  resetDemo: () => void;
}

export const isOnline = (s: Pick<AppState, 'simulatedOffline' | 'netOnline'>) => s.netOnline && !s.simulatedOffline;

function nextId(records: Atendimento[]): string {
  const year = new Date().getFullYear();
  const max = records.reduce((m, r) => Math.max(m, Number(r.id.split('-')[2]) || 0), 1000);
  return `AT-${year}-${String(max + 1).padStart(4, '0')}`;
}

function autofill(session: Session | null, records: Atendimento[]): Answers {
  const now = new Date();
  const user = session ? `${session.name}, ${session.roleLabel.toLowerCase()}` : '';
  return {
    '01-identificacao-atendimento': {
      codigo_atendimento: nextId(records),
      data: isoDate(now),
      hora: isoTime(now),
      unidade: session?.unidade,
      profissional: user
    },
    '02-identificacao-contato-seguro': { municipio: 'Manaus' },
    '09-sintese-plano-encaminhamentos': { responsavel_plano: user },
    '10-evolucao-avaliacao-encerramento': { status: 'Em acompanhamento' }
  };
}

const PRIORITY_MAP: Record<string, Priority> = { Urgente: 'urgente', Regular: 'regular' };
const STATUS_MAP: Record<string, CaseStatus> = {
  'Em acompanhamento': 'em_acompanhamento',
  'Aguardando retorno': 'aguardando_retorno',
  Encerrado: 'encerrado'
};

let toastSeq = 1;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      session: null,
      records: generateSeed(),
      draft: null,
      audit: [],
      simulatedOffline: false,
      netOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      syncing: false,
      toasts: [],
      lastCreatedId: null,

      async login(email, role) {
        await wait(700);
        set({
          session:
            role === 'coordenacao'
              ? { name: 'Marta Cavalcante', role, roleLabel: 'Coordenadora', email, unidade: 'Unidade Centro' }
              : { name: 'Luiza Andrade', role, roleLabel: 'Assistente social', email, unidade: 'Unidade Centro' }
        });
      },

      logout() {
        set({ session: null });
      },

      startDraft(categorias) {
        const { session, records } = get();
        set({ draft: { categorias, respostas: autofill(session, records), section: 0, startedAt: new Date().toISOString() } });
      },

      setDraftCategories(categorias) {
        const d = get().draft;
        if (d) set({ draft: { ...d, categorias } });
      },

      updateField(sectionId, key, value) {
        const d = get().draft;
        if (!d) return;
        set({
          draft: {
            ...d,
            savedAt: new Date().toISOString(),
            respostas: { ...d.respostas, [sectionId]: { ...(d.respostas[sectionId] ?? {}), [key]: value } }
          }
        });
      },

      setSection(index) {
        const d = get().draft;
        if (d) set({ draft: { ...d, section: index } });
      },

      fillExample() {
        const d = get().draft;
        if (!d) return;
        set({ draft: { ...d, respostas: exampleAnswers(d.categorias, d.respostas), savedAt: new Date().toISOString() } });
      },

      discardDraft() {
        set({ draft: null });
      },

      async submitDraft() {
        const { draft, session, records } = get();
        if (!draft) throw new Error('Nenhum atendimento em andamento.');
        await wait(1100);
        const r = draft.respostas;
        const s1 = r['01-identificacao-atendimento'] ?? {};
        const s2 = r['02-identificacao-contato-seguro'] ?? {};
        const s8 = r['08-demandas-riscos-rede'] ?? {};
        const s9 = r['09-sintese-plano-encaminhamentos'] ?? {};
        const s10 = r['10-evolucao-avaliacao-encerramento'] ?? {};
        const id = nextId(records);
        const now = new Date().toISOString();
        const by = session?.name ?? 'Equipe';
        const online = isOnline(get());
        const encaminhamentos = (s9.encaminhamentos as string[]) ?? [];
        const nome = String(s2.nome_social ?? s2.nome_civil ?? 'Sem nome');
        const rec: Atendimento = {
          id,
          pessoa: String(s1.codigo_pessoa || `P-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`),
          prontuario: String(s1.prontuario ?? ''),
          caso: String(s1.codigo_caso ?? ''),
          iniciais: nome
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('. ') + '.',
          createdAt: now,
          unidade: String(s1.unidade ?? session?.unidade ?? ''),
          profissional: String(s1.profissional ?? by),
          categorias: draft.categorias,
          tipo: String(s1.tipo ?? ''),
          modalidade: String(s1.modalidade ?? ''),
          ingresso: String(s1.ingresso ?? ''),
          origem: String(s1.origem ?? ''),
          prioridade: PRIORITY_MAP[String(s8.prioridade)] ?? 'nao_informado',
          risco: String(s8.nivel_risco ?? 'Não informado'),
          status: STATUS_MAP[String(s10.status)] ?? 'em_acompanhamento',
          demandas: (s8.demandas as string[]) ?? [],
          encaminhamentos,
          respostas: { ...r, '01-identificacao-atendimento': { ...s1, codigo_atendimento: id } },
          timeline: [
            { at: now, label: online ? 'Atendimento registrado' : 'Registrado sem internet, aguardando envio', by },
            ...encaminhamentos.map((e) => ({ at: now, label: `Encaminhada(o) para ${e}`, by }))
          ],
          sync: online ? 'synced' : 'pending'
        };
        set({ records: [...records, rec], draft: null, lastCreatedId: id });
        return rec;
      },

      setSimulatedOffline(v) {
        set({ simulatedOffline: v });
        if (!v) void get().syncPending();
      },

      setNetOnline(v) {
        set({ netOnline: v });
        if (v) void get().syncPending();
      },

      async syncPending() {
        const pending = get().records.filter((r) => r.sync === 'pending');
        if (!pending.length || !isOnline(get()) || get().syncing) return 0;
        set({ syncing: true, records: get().records.map((r) => (r.sync === 'pending' ? { ...r, sync: 'syncing' } : r)) });
        await wait(1600);
        const at = new Date().toISOString();
        set({
          syncing: false,
          records: get().records.map((r) =>
            r.sync === 'syncing' ? { ...r, sync: 'synced', timeline: [...r.timeline, { at, label: 'Enviado ao servidor', by: 'Sincronização automática' }] } : r
          )
        });
        get().toast('ok', pending.length === 1 ? '1 atendimento enviado ao servidor.' : `${pending.length} atendimentos enviados ao servidor.`);
        return pending.length;
      },

      logAccess(recordId, action) {
        const user = get().session?.name ?? 'Desconhecido';
        set({ audit: [{ at: new Date().toISOString(), user, action, recordId }, ...get().audit].slice(0, 200) });
      },

      toast(tone, text) {
        const id = toastSeq++;
        set({ toasts: [...get().toasts, { id, tone, text }] });
        setTimeout(() => get().dismissToast(id), 4200);
      },

      dismissToast(id) {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      },

      resetDemo() {
        set({ records: generateSeed(), draft: null, audit: [], lastCreatedId: null, simulatedOffline: false });
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ session: s.session, records: s.records, draft: s.draft, audit: s.audit, simulatedOffline: s.simulatedOffline })
    }
  )
);

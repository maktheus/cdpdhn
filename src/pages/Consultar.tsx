import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, CloudOff, Eye, LoaderCircle, Lock, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from '../data/categories';
import { isEmpty, maskSensitive } from '../data/schema';
import { SECTIONS, useApp } from '../data/store';
import { UNIDADES } from '../data/seed';
import type { Atendimento, CaseStatus, CategoryId, Priority } from '../data/types';
import { CatChip, PriorityPill } from '../components/ui';
import { fmtDate, fmtDateTime, fmtIsoDay, fmtTime, STATUS_LABEL } from '../lib/format';
import { useUi } from '../lib/ui';

const PAGE = 20;

export default function Consultar() {
  const records = useApp((s) => s.records);
  const lastCreatedId = useApp((s) => s.lastCreatedId);
  const openId = useUi((s) => s.openRecordId);
  const setOpen = useUi((s) => s.setOpenRecord);
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState<Priority | 'todas'>('todas');
  const [status, setStatus] = useState<CaseStatus | 'todos'>('todos');
  const [cat, setCat] = useState<CategoryId | ''>('');
  const [unit, setUnit] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...records]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((r) => prio === 'todas' || r.prioridade === prio)
      .filter((r) => status === 'todos' || r.status === status)
      .filter((r) => !cat || r.categorias.includes(cat))
      .filter((r) => !unit || r.unidade === unit)
      .filter((r) => {
        if (!term) return true;
        const bairro = String(r.respostas['02-identificacao-contato-seguro']?.bairro ?? '');
        return [r.id, r.pessoa, r.prontuario, r.caso, r.unidade, bairro, r.profissional].some((v) => v.toLowerCase().includes(term));
      });
  }, [records, q, prio, status, cat, unit]);

  useEffect(() => setLimit(PAGE), [q, prio, status, cat, unit]);
  const open = records.find((r) => r.id === openId) ?? null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Consultar atendimentos</h1>
          <p>
            {filtered.length === records.length ? `${records.length} fichas registradas.` : `${filtered.length} de ${records.length} fichas com os filtros escolhidos.`} Dados pessoais ficam ocultos até que alguém peça para ver.
          </p>
        </div>
      </div>

      <div className="card toolbar">
        <div className="search">
          <Search size={19} />
          <input className="input" type="search" placeholder="Buscar por código, prontuário, unidade, bairro ou profissional" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar atendimentos" />
        </div>
        <div className="filters">
          <div className="filter-group" role="radiogroup" aria-label="Prioridade">
            <span>Prioridade</span>
            {(
              [
                ['todas', 'Todas'],
                ['urgente', 'Urgente'],
                ['regular', 'Regular'],
                ['nao_informado', 'Não informada']
              ] as const
            ).map(([v, l]) => (
              <button key={v} className="seg-opt" role="radio" aria-checked={prio === v} onClick={() => setPrio(v)}>
                {l}
              </button>
            ))}
          </div>
          <div className="filter-group" role="radiogroup" aria-label="Situação">
            <span>Situação</span>
            {(
              [
                ['todos', 'Todas'],
                ['em_acompanhamento', 'Em acompanhamento'],
                ['aguardando_retorno', 'Aguardando retorno'],
                ['encerrado', 'Encerradas']
              ] as const
            ).map(([v, l]) => (
              <button key={v} className="seg-opt" role="radio" aria-checked={status === v} onClick={() => setStatus(v)}>
                {l}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <label htmlFor="f-cat" className="sr-only">
              Categoria
            </label>
            <select id="f-cat" className="select" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | '')}>
              <option value="">Todas as categorias</option>
              {CATEGORIES.filter((c) => c.available).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <label htmlFor="f-unit" className="sr-only">
              Unidade
            </label>
            <select id="f-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">Todas as unidades</option>
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card table">
        <div className="t-head" aria-hidden>
          <span>Atendimento</span>
          <span className="t-person">Pessoa</span>
          <span>Categorias</span>
          <span className="t-unit">Unidade</span>
          <span>Prioridade</span>
          <span>Situação</span>
          <span className="t-sync" />
        </div>
        {filtered.length === 0 ? (
          <div className="empty">
            <Search size={28} className="muted" />
            <b>Nenhuma ficha com esses filtros.</b>
            <span className="muted">Tente remover um filtro ou buscar por outro código.</span>
          </div>
        ) : (
          filtered.slice(0, limit).map((r, i) => (
            <motion.button
              key={r.id}
              className={`t-row ${r.id === lastCreatedId ? 'fresh' : ''}`}
              onClick={() => setOpen(r.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.3 }}
            >
              <span className="t-cell">
                <span className="mono" style={{ fontWeight: 700 }}>
                  {r.id}
                </span>
                <small>
                  {fmtDate(r.createdAt)} às {fmtTime(r.createdAt)}
                </small>
              </span>
              <span className="t-cell t-person">
                <span className="mono">{r.pessoa}</span>
                <small>{r.iniciais}</small>
              </span>
              <span className="t-cats">
                {r.categorias.map((c) => (
                  <CatChip key={c} id={c} />
                ))}
              </span>
              <span className="t-cell t-unit">
                <span className="ellipsis">{r.unidade}</span>
                <small className="ellipsis">{r.profissional.split(',')[0]}</small>
              </span>
              <span>
                <PriorityPill p={r.prioridade} />
              </span>
              <span>
                <span className={`pill pill-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </span>
              <span className={`sync-ico t-sync ${r.sync !== 'synced' ? 'pending' : ''}`} title={r.sync === 'synced' ? 'Enviado ao servidor' : 'Aguardando envio'}>
                {r.sync === 'synced' ? <ChevronRight size={18} color="var(--ink-3)" /> : r.sync === 'syncing' ? <LoaderCircle size={18} className="spin" /> : <CloudOff size={18} />}
              </span>
            </motion.button>
          ))
        )}
        {filtered.length > 0 && (
          <div className="list-foot">
            <span>
              Mostrando {Math.min(limit, filtered.length)} de {filtered.length}
            </span>
            {limit < filtered.length && (
              <button className="btn btn-ghost btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
                Mostrar mais {Math.min(PAGE, filtered.length - limit)}
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>{open && <RecordDrawer key={open.id} rec={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

const MOTIVOS = ['Atendimento ou acompanhamento em andamento', 'Encaminhamento para a rede de proteção', 'Requisição judicial ou do Ministério Público'];

function RecordDrawer({ rec, onClose }: { rec: Atendimento; onClose: () => void }) {
  const logAccess = useApp((s) => s.logAccess);
  const allAudit = useApp((s) => s.audit);
  const audit = useMemo(() => allAudit.filter((a) => a.recordId === rec.id), [allAudit, rec.id]);
  const [revealed, setRevealed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const sintese = rec.respostas['09-sintese-plano-encaminhamentos']?.sintese as string | undefined;
  const filledSections = SECTIONS.map((s) => {
    const a = rec.respostas[s.id] ?? {};
    const rows = s.fields.filter((f) => !isEmpty(a[f.key]) && f.key !== 'sintese');
    return { s, a, rows };
  }).filter((x) => x.rows.length);

  const show = (v: unknown, sensitive?: boolean) => {
    const str = Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : fmtIsoDay(String(v));
    return sensitive && !revealed ? <span className="mono muted">{maskSensitive(str)}</span> : str;
  };

  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dr-title"
        initial={{ x: '100%', opacity: 0.6 }}
        animate={{ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 34 } }}
        exit={{ x: '100%', opacity: 0.6, transition: { duration: 0.22 } }}
      >
        <div className="drawer-head">
          <div className="row">
            <h2 id="dr-title" className="mono">
              {rec.id}
            </h2>
            <span style={{ flex: 1 }} />
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
            <PriorityPill p={rec.prioridade} />
            <span className={`pill pill-status ${rec.status}`}>{STATUS_LABEL[rec.status]}</span>
            {rec.categorias.map((c) => (
              <CatChip key={c} id={c} />
            ))}
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            {fmtDateTime(rec.createdAt)}, {rec.unidade}, por {rec.profissional}
          </p>
        </div>

        <div className="drawer-body">
          <div className="lgpd-box">
            <div className="row">
              {revealed ? <ShieldCheck size={18} /> : <Lock size={18} />}
              {revealed ? 'Dados sensíveis visíveis nesta tela' : 'Dados sensíveis ocultos'}
            </div>
            {revealed ? (
              <span style={{ fontSize: 13.5, color: '#285B87' }}>Acesso registrado na trilha de auditoria com o motivo informado. Ao fechar a ficha, os dados voltam a ficar ocultos.</span>
            ) : asking ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <label htmlFor="motivo" style={{ fontSize: 14, fontWeight: 600 }}>
                  Por que você precisa ver os dados pessoais?
                </label>
                <select id="motivo" className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      logAccess(rec.id, `Visualizou dados sensíveis: ${motivo}`);
                      setRevealed(true);
                      setAsking(false);
                    }}
                  >
                    <Eye size={16} /> Mostrar e registrar acesso
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, color: '#285B87', flex: 1, minWidth: 200 }}>Nome, CPF, raça/cor e saúde aparecem mascarados. Para ver, informe o motivo.</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setAsking(true)}>
                  <Eye size={16} /> Ver dados sensíveis
                </button>
              </div>
            )}
          </div>

          {sintese && (
            <div className="drawer-section">
              <h3>Síntese do atendimento</h3>
              <p className="sintese">{sintese}</p>
            </div>
          )}

          {filledSections.map(({ s, a, rows }) => (
            <div className="drawer-section" key={s.id}>
              <h3>
                {s.order}. {s.title}
              </h3>
              <dl className="kv">
                {rows.map((f) => (
                  <div key={f.key} style={{ display: 'contents' }}>
                    <dt>{f.label}</dt>
                    <dd>{show(a[f.key], f.ui.sensitive)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          <div className="drawer-section">
            <h3>Linha do tempo</h3>
            <div className="timeline">
              {[...rec.timeline].reverse().map((t, i) => (
                <div className="tl-item" key={i}>
                  <span style={{ fontWeight: 650 }}>{t.label}</span>
                  <small>
                    {fmtDateTime(t.at)}, {t.by}
                  </small>
                </div>
              ))}
            </div>
          </div>

          {audit.length > 0 && (
            <div className="drawer-section">
              <h3>Acessos a dados sensíveis</h3>
              <div className="timeline">
                {audit.map((a, i) => (
                  <div className="tl-item" key={i}>
                    <span style={{ fontWeight: 650 }}>{a.user}</span>
                    <small>
                      {fmtDateTime(a.at)}. {a.action.replace('Visualizou dados sensíveis: ', 'Motivo: ')}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <CheckCircle2 size={15} /> {rec.sync === 'synced' ? 'Ficha sincronizada com o servidor.' : 'Ficha guardada neste aparelho, aguardando envio.'}
          </p>
        </div>
      </motion.aside>
    </>
  );
}

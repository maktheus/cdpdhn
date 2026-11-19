import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, CircleAlert, CloudOff, Info, ListChecks, LoaderCircle, Lock, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty, isVisible, sectionApplies, sectionState, validateSection, type Section } from '../data/schema';
import { isOnline, SECTIONS, useApp } from '../data/store';
import type { Atendimento } from '../data/types';
import { FieldRenderer } from '../components/FieldRenderer';
import { CatChip, PriorityPill } from '../components/ui';
import { fmtTime } from '../lib/format';
import { go } from '../lib/router';
import { useUi } from '../lib/ui';

const Tree3D = lazy(() => import('../components/Tree3D'));
const REVIEW = SECTIONS.length;
const CAT_FOR: Record<string, string> = { criancas: 'Crianças e adolescentes', situacao_rua: 'Situação de rua' };

function missingRequired(section: Section, answers: Record<string, unknown> = {}) {
  return section.fields.filter((f) => f.required && isVisible(f, answers) && isEmpty(answers[f.key]));
}

export default function Ficha() {
  const draft = useApp((s) => s.draft);
  const updateField = useApp((s) => s.updateField);
  const setSection = useApp((s) => s.setSection);
  const fillExample = useApp((s) => s.fillExample);
  const submitDraft = useApp((s) => s.submitDraft);
  const toast = useApp((s) => s.toast);
  const online = useApp(isOnline);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Atendimento | null>(null);
  const prev = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (!draft && !done && !submitting.current) go('novo');
  }, [draft, done]);

  const idx = draft?.section ?? 0;
  const dir = idx >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = idx;
  }, [idx]);

  const states = useMemo(
    () => (draft ? SECTIONS.map((s) => ({ ...sectionState(s, draft.respostas[s.id]), applies: sectionApplies(s, draft.categorias) })) : []),
    [draft]
  );

  if (done) return <Success rec={done} />;
  if (!draft) return null;

  const completeCount = states.filter((s) => s.state === 'complete' || (!s.applies && s.state === 'empty')).length;
  const blocking = SECTIONS.map((s, i) => ({ s, i, miss: states[i].applies ? missingRequired(s, draft.respostas[s.id]) : [], err: Object.keys(validateSection(s, draft.respostas[s.id] ?? {}, false)).length }))
    .filter((x) => x.miss.length || x.err);

  const goTo = (i: number) => {
    setTouched((t) => ({ ...t, [SECTIONS[idx]?.id ?? 'review']: true }));
    setSection(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setBusy(true);
    submitting.current = true;
    const rec = await submitDraft();
    setBusy(false);
    setDone(rec);
    toast(rec.sync === 'synced' ? 'ok' : 'warn', rec.sync === 'synced' ? `Atendimento ${rec.id} registrado.` : `Atendimento ${rec.id} salvo no aparelho. Será enviado quando a internet voltar.`);
  };

  const section = SECTIONS[idx];

  return (
    <>
      <div className="wizard-top">
        <button className="btn btn-ghost btn-sm" onClick={() => go('novo')}>
          <ChevronLeft size={17} /> Alterar categorias
        </button>
        <div className="cats-sel">
          {draft.categorias.map((c) => (
            <CatChip key={c} id={c} />
          ))}
        </div>
        <button className="btn btn-quiet btn-sm" onClick={() => fillExample()} title="Preenche a ficha com dados fictícios para a demonstração">
          <Sparkles size={16} /> Preencher exemplo
        </button>
        {draft.savedAt && (
          <motion.span key={draft.savedAt} className="saved-at" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
            <Check size={15} color="var(--ok)" /> Rascunho salvo neste aparelho às {fmtTime(draft.savedAt)}
          </motion.span>
        )}
      </div>

      <div className="wizard">
        <aside className="card steps" aria-label="Seções do formulário">
          <div className="steps-head">
            <h2>Seções do formulário</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {SECTIONS.length} seções
            </span>
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={SECTIONS.length} aria-valuenow={completeCount} aria-label="Seções completas">
            <motion.div initial={false} animate={{ scaleX: completeCount / SECTIONS.length }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
          <div className="steps-list">
            {SECTIONS.map((s, i) => {
              const st = states[i];
              const pct = st.total ? Math.round((st.filled / st.total) * 100) : 0;
              return (
                <button key={s.id} className={`step ${st.applies ? '' : 'not-applicable'}`} aria-current={i === idx ? 'step' : undefined} onClick={() => goTo(i)}>
                  {i === idx && <motion.span layoutId="step-bg" className="step-active-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <span className={`step-num ${st.state}`} style={{ ['--p' as string]: `${pct}%` }}>
                    {st.state === 'complete' ? (
                      <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} style={{ display: 'grid' }}>
                        <Check size={16} strokeWidth={3} />
                      </motion.span>
                    ) : st.state === 'error' ? (
                      <CircleAlert size={16} />
                    ) : st.state === 'partial' ? (
                      <span>{i + 1}</span>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="step-title">
                    <span>{s.title}</span>
                    {!st.applies && <small>Opcional para as categorias escolhidas</small>}
                    {st.applies && s.appliesTo[0] !== '*' && <small>{CAT_FOR[s.appliesTo[0]] ?? 'Específica'}</small>}
                  </span>
                </button>
              );
            })}
            <button className="step" aria-current={idx === REVIEW ? 'step' : undefined} onClick={() => goTo(REVIEW)}>
              {idx === REVIEW && <motion.span layoutId="step-bg" className="step-active-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span className="step-num" style={{ background: 'var(--leaf-soft)', color: 'var(--forest-800)' }}>
                <ListChecks size={16} />
              </span>
              <span className="step-title">
                <span>Revisar e registrar</span>
              </span>
            </button>
          </div>
        </aside>

        <section className="card form-card" aria-live="polite">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, x: dir * -20, transition: { duration: 0.14 } }}
            >
              {idx < REVIEW ? (
                <SectionForm
                  section={section}
                  applies={states[idx].applies}
                  answers={draft.respostas[section.id] ?? {}}
                  showRequired={!!touched[section.id]}
                  onChange={(k, v) => updateField(section.id, k, v)}
                />
              ) : (
                <Review draft={draft} blocking={blocking} online={online} goTo={goTo} />
              )}
              <div className="form-foot">
                <button className="btn btn-ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)} aria-label="Seção anterior">
                  <ArrowLeft size={18} /> <span className="btn-label">Seção anterior</span>
                </button>
                <span className="spacer" />
                {idx < REVIEW ? (
                  <button className="btn btn-primary" onClick={() => goTo(idx + 1)} aria-label={idx === REVIEW - 1 ? 'Revisar' : 'Próxima seção'}>
                    <span className="btn-label">{idx === REVIEW - 1 ? 'Revisar' : 'Próxima seção'}</span> <ArrowRight size={18} />
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled={busy || blocking.length > 0} onClick={submit}>
                    {busy ? <LoaderCircle size={18} className="spin" /> : online ? <Check size={18} /> : <CloudOff size={18} />}
                    {busy ? 'Registrando…' : online ? 'Registrar atendimento' : 'Salvar no aparelho'}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </>
  );
}

function SectionForm({ section, applies, answers, showRequired, onChange }: { section: Section; applies: boolean; answers: Record<string, unknown>; showRequired: boolean; onChange: (k: string, v: unknown) => void }) {
  const errors = validateSection(section, answers, showRequired && applies);
  const visible = section.fields.filter((f) => isVisible(f, answers));
  const sensitive = section.fields.filter((f) => f.ui.sensitive).length;
  return (
    <>
      <div className="form-head">
        <span className="form-badge">{section.order}</span>
        <div className="form-title">
          <h2>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        {sensitive > 0 && (
          <span className="sensitive-tag" style={{ padding: '4px 10px 4px 8px', fontSize: 12.5 }} title="Campos sensíveis ficam ocultos na consulta. Ver o conteúdo exige informar o motivo e fica registrado.">
            <Lock size={12} /> {sensitive} {sensitive === 1 ? 'campo sensível' : 'campos sensíveis'}
          </span>
        )}
      </div>
      {!applies && (
        <div className="optional-note">
          <Info size={18} style={{ flex: 'none' }} />
          Esta seção é específica de outra categoria. Preencha só se fizer sentido para este atendimento.
        </div>
      )}
      <div className="form-body">
        <AnimatePresence initial={false}>
          {visible.map((f) => (
            <FieldRenderer key={f.key} sectionId={section.id} field={f} value={answers[f.key]} error={errors[f.key]} onChange={(v) => onChange(f.key, v)} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function Review({
  draft,
  blocking,
  online,
  goTo
}: {
  draft: NonNullable<ReturnType<typeof useApp.getState>['draft']>;
  blocking: Array<{ s: Section; i: number; miss: { label: string }[]; err: number }>;
  online: boolean;
  goTo: (i: number) => void;
}) {
  const r8 = draft.respostas['08-demandas-riscos-rede'] ?? {};
  const r9 = draft.respostas['09-sintese-plano-encaminhamentos'] ?? {};
  const prio = r8.prioridade === 'Urgente' ? 'urgente' : r8.prioridade === 'Regular' ? 'regular' : 'nao_informado';
  const enc = (r9.encaminhamentos as string[]) ?? [];
  return (
    <>
      <div className="form-head">
        <span className="form-badge" style={{ background: 'linear-gradient(160deg, var(--leaf), var(--forest-700))' }}>
          <ListChecks size={20} />
        </span>
        <div>
          <h2>Revisar e registrar</h2>
          <p>{blocking.length === 0 ? 'Tudo certo com os campos obrigatórios. Confira o resumo e registre.' : 'Complete os itens abaixo para registrar. Toque em um item para ir até ele.'}</p>
        </div>
      </div>
      {blocking.length > 0 && (
        <div className="review-list">
          {blocking.map(({ s, i, miss, err }) => (
            <button key={s.id} className="review-item" onClick={() => goTo(i)}>
              <span className="step-num error">{i + 1}</span>
              <span>
                <b>{s.title}</b>
                <br />
                <span className="miss">{miss.length ? `Falta preencher: ${miss.map((m) => m.label).join(', ')}` : `${err} campo com formato inválido`}</span>
              </span>
              <ArrowRight size={18} className="muted" />
            </button>
          ))}
        </div>
      )}
      <div className="review-summary" style={blocking.length ? undefined : { paddingTop: 22 }}>
        <div>
          <small>Prioridade</small>
          <PriorityPill p={prio} />
        </div>
        <div>
          <small>Categorias</small>
          <div className="t-cats">
            {draft.categorias.map((c) => (
              <CatChip key={c} id={c} />
            ))}
          </div>
        </div>
        <div>
          <small>Encaminhamentos</small>
          <b style={{ fontSize: 14 }}>{enc.length ? enc.join(', ') : 'Nenhum ainda'}</b>
        </div>
      </div>
      {!online && (
        <div className="offline-note">
          <CloudOff size={18} style={{ flex: 'none', marginTop: 2 }} />
          <span>Sem internet agora. O atendimento fica guardado neste aparelho e é enviado sozinho quando a conexão voltar.</span>
        </div>
      )}
    </>
  );
}

function Success({ rec }: { rec: Atendimento }) {
  const setOpen = useUi((s) => s.setOpenRecord);
  return (
    <motion.div className="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-labelledby="ok-title">
      <div className="success-stage">
        <Suspense fallback={null}>
          <Tree3D mode="celebrate" label="Uma folha nova chega ao topo da árvore" />
        </Suspense>
      </div>
      <motion.div className="success-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <h2 id="ok-title">{rec.sync === 'synced' ? 'Atendimento registrado' : 'Atendimento salvo no aparelho'}</h2>
        <p>
          {rec.sync === 'synced'
            ? 'A ficha já aparece na consulta, no painel e nos relatórios da equipe.'
            : 'Sem internet agora. A ficha está guardada aqui e será enviada sozinha quando a conexão voltar.'}
        </p>
        <span className="success-code mono">
          {rec.sync === 'synced' ? <Check size={20} color="var(--ok)" /> : <CloudOff size={20} color="var(--warn)" />}
          {rec.id}
        </span>
        <div className="success-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setOpen(rec.id);
              go('consultar');
            }}
          >
            Ver a ficha
          </button>
          <button className="btn btn-ghost" onClick={() => go('novo')}>
            Novo atendimento
          </button>
          <button className="btn btn-quiet" onClick={() => go('painel')}>
            Ir ao painel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

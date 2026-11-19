import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '../data/categories';
import { useApp } from '../data/store';
import type { CategoryId } from '../data/types';
import { CatChip, CategoryIcon, stagger, Tilt } from '../components/ui';
import { fmtTime } from '../lib/format';
import { go } from '../lib/router';

export default function NovoAtendimento() {
  const draft = useApp((s) => s.draft);
  const startDraft = useApp((s) => s.startDraft);
  const setDraftCategories = useApp((s) => s.setDraftCategories);
  const discardDraft = useApp((s) => s.discardDraft);
  const [sel, setSel] = useState<CategoryId[]>(draft?.categorias ?? []);

  const toggle = (id: CategoryId) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const start = () => {
    if (draft) setDraftCategories(sel);
    else startDraft(sel);
    go('ficha');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Selecione as categorias de vulnerabilidade</h1>
          <p>Marque todas que se aplicam. As seções do formulário se ajustam às categorias escolhidas.</p>
        </div>
      </div>

      {draft && (
        <motion.div className="resume-banner" {...stagger(0)}>
          <ClipboardList size={20} />
          <span className="grow">
            Você está alterando as categorias do atendimento iniciado às <b>{fmtTime(draft.startedAt)}</b>. As respostas já preenchidas continuam salvas.
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              discardDraft();
              setSel([]);
            }}
          >
            Descartar e começar outro
          </button>
        </motion.div>
      )}

      <div className="grid cats">
        {CATEGORIES.map((c, i) => {
          const on = sel.includes(c.id);
          return (
            <motion.div key={c.id} {...stagger(i, 0.05)} style={{ display: 'grid' }}>
              <Tilt
                as="button"
                className="cat-card"
                max={c.available ? 7 : 0}
                aria-pressed={on}
                disabled={!c.available}
                onClick={() => c.available && toggle(c.id)}
                style={{ ['--c' as string]: c.color }}
              >
                <motion.span className="cat-icon" style={{ ['--c' as string]: c.color }} animate={on ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : { scale: 1 }} transition={{ duration: 0.45 }}>
                  <CategoryIcon cat={c} />
                </motion.span>
                <span className="cat-text">
                  <span className="cat-title">{c.title}</span>
                  <span className="cat-desc">{c.description}</span>
                </span>
                {!c.available && <span className="soon">Em breve: formulário em validação com a equipe</span>}
                <AnimatePresence>
                  {on && (
                    <motion.span className="check-badge" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                      <Check size={16} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Tilt>
            </motion.div>
          );
        })}
      </div>

      <motion.div className="select-bar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="summary">
          {sel.length === 0 ? (
            <span className="muted">Nenhuma categoria selecionada</span>
          ) : (
            <>
              <b style={{ marginRight: 4 }}>{sel.length === 1 ? '1 categoria:' : `${sel.length} categorias:`}</b>
              <AnimatePresence>
                {sel.map((id) => (
                  <motion.span key={id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                    <CatChip id={id} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
        <button className="btn btn-primary" disabled={sel.length === 0} onClick={start}>
          {draft ? 'Voltar ao formulário' : 'Iniciar atendimento'} <ArrowRight size={18} />
        </button>
      </motion.div>
    </>
  );
}

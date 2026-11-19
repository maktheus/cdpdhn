import { motion } from 'framer-motion';
import { CalendarDays, ChevronRight, CircleCheck, ClipboardList, CloudOff, Plus, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { CATEGORY_BY_ID } from '../data/categories';
import { byCategory, byModalidade, kpis, monthlySeries, priorityBreakdown } from '../data/stats';
import { useApp } from '../data/store';
import { Donut, HBars, MonthlyBars } from '../components/charts';
import { CatChip, CountUp, PriorityPill, stagger, Tilt } from '../components/ui';
import { fmtDate, fmtLong, greeting } from '../lib/format';
import { go } from '../lib/router';
import { useUi } from '../lib/ui';

const PRIORITY_COLORS = { urgente: 'var(--warn)', regular: 'var(--forest-600)', nao_informado: 'var(--neutral-mark)' };
const PRIORITY_NAMES = { urgente: 'Urgente', regular: 'Regular', nao_informado: 'Não informado' };

export default function Dashboard() {
  const records = useApp((s) => s.records);
  const session = useApp((s) => s.session)!;
  const draft = useApp((s) => s.draft);
  const openRecord = useUi((s) => s.setOpenRecord);
  const now = new Date();

  const data = useMemo(() => {
    const ref = new Date();
    return {
      k: kpis(records, ref),
      monthly: monthlySeries(records, ref),
      prio: priorityBreakdown(records),
      cats: byCategory(records),
      mods: byModalidade(records),
      recent: [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
    };
  }, [records]);
  const { k } = data;

  const tiles = [
    { label: 'Fichas registradas', value: k.total, icon: <ClipboardList size={20} />, sub: <>nos últimos 6 meses</> },
    {
      label: 'Criadas neste mês',
      value: k.thisMonth,
      icon: <CalendarDays size={20} />,
      sub: (
        <>
          <b>{data.monthly[5].long}</b>, mês anterior: {k.lastMonth}
        </>
      )
    },
    { label: 'Prioridade urgente', value: k.urgent, icon: <TriangleAlert size={20} />, warn: true, sub: <><b>{k.urgentPct}%</b> das fichas registradas</> },
    { label: 'Prioridade informada', value: k.informedPct, suffix: '%', icon: <CircleCheck size={20} />, sub: <><b>{k.informed}</b> de {k.total} registros</> }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {greeting(now)}, {session.name.split(' ')[0]}
          </h1>
          <p>
            {fmtLong(now).replace(/^./, (c) => c.toUpperCase())}. {k.thisMonth} atendimentos neste mês até agora.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => go(draft ? 'ficha' : 'novo')}>
          <Plus size={19} />
          {draft ? 'Continuar atendimento' : 'Novo atendimento'}
        </button>
      </div>

      {k.pending > 0 && (
        <motion.div className="resume-banner" style={{ background: 'var(--warn-bg)', borderColor: '#F2D9AE', color: 'var(--warn-ink)' }} {...stagger(0)}>
          <CloudOff size={20} />
          <span className="grow">
            <b>{k.pending === 1 ? '1 atendimento aguardando envio.' : `${k.pending} atendimentos aguardando envio.`}</b> Estão salvos neste aparelho e serão enviados quando a internet voltar.
          </span>
        </motion.div>
      )}

      <div className="grid kpis" style={{ perspective: 1200 }}>
        {tiles.map((t, i) => (
          <motion.div key={t.label} {...stagger(i)}>
            <Tilt className="card kpi" max={5}>
              <div className="kpi-top">
                <span className="kpi-label">{t.label}</span>
                <span className={`kpi-icon ${t.warn ? 'warn' : ''}`}>{t.icon}</span>
              </div>
              <div className="kpi-value">
                <CountUp value={t.value} suffix={t.suffix} />
              </div>
              <div className="kpi-sub">{t.sub}</div>
            </Tilt>
          </motion.div>
        ))}
      </div>

      <div className="grid row-2" style={{ marginTop: 18 }}>
        <motion.section className="card card-pad" {...stagger(4)}>
          <div className="card-head">
            <h2>Atendimentos por mês</h2>
            <span className="hint">Últimos 6 meses</span>
          </div>
          <MonthlyBars data={data.monthly} />
          <div className="legend-note">
            <span className="legend-swatch" style={{ background: 'var(--forest-700)' }} /> Mês atual, contado até hoje
          </div>
        </motion.section>

        <motion.section className="card card-pad" {...stagger(5)}>
          <div className="card-head">
            <h2>Prioridade dos casos</h2>
          </div>
          <Donut
            center={<CountUp value={k.total} />}
            centerLabel="fichas"
            slices={data.prio.map((p) => ({ key: p.key, label: PRIORITY_NAMES[p.key], value: p.count, pct: p.pct, color: PRIORITY_COLORS[p.key] }))}
          />
        </motion.section>
      </div>

      <div className="grid row-2-even" style={{ marginTop: 18 }}>
        <motion.section className="card card-pad" {...stagger(6)}>
          <div className="card-head">
            <h2>Modalidades de atendimento</h2>
            <span className="hint">Total acumulado</span>
          </div>
          <HBars rows={data.mods.map((m) => ({ key: m.key, label: <span>{m.key}</span>, value: m.count }))} />
        </motion.section>

        <motion.section className="card card-pad" {...stagger(7)}>
          <div className="card-head">
            <h2>Vulnerabilidades registradas</h2>
            <span className="hint">Uma ficha pode ter mais de uma</span>
          </div>
          <HBars
            rows={data.cats.map((c) => ({
              key: c.key,
              title: CATEGORY_BY_ID[c.key].title,
              label: (
                <>
                  <span className="cat-dot" style={{ background: CATEGORY_BY_ID[c.key].color }} />
                  <span>{CATEGORY_BY_ID[c.key].short}</span>
                </>
              ),
              value: c.count
            }))}
          />
        </motion.section>
      </div>

      <motion.section className="card card-pad" style={{ marginTop: 18 }} {...stagger(8)}>
        <div className="card-head">
          <h2>Atendimentos recentes</h2>
          <button className="btn btn-quiet btn-sm" onClick={() => go('consultar')}>
            Ver todos <ChevronRight size={16} />
          </button>
        </div>
        <div className="recent">
          {data.recent.map((r) => (
            <button
              key={r.id}
              className="recent-row"
              onClick={() => {
                openRecord(r.id);
                go('consultar');
              }}
            >
              <span className="t-cell">
                <span className="mono" style={{ fontWeight: 700 }}>
                  {r.id}
                </span>
                <small className="muted">{fmtDate(r.createdAt)}</small>
              </span>
              <span className="t-cats hide-sm">
                {r.categorias.map((c) => (
                  <CatChip key={c} id={c} />
                ))}
                <span className="muted ellipsis" style={{ fontSize: 13, alignSelf: 'center' }}>
                  {r.unidade}
                </span>
              </span>
              <PriorityPill p={r.prioridade} />
              {r.sync !== 'synced' ? <CloudOff size={17} color="var(--warn)" aria-label="Aguardando envio" /> : <ChevronRight size={17} className="muted" />}
            </button>
          ))}
        </div>
      </motion.section>
    </>
  );
}

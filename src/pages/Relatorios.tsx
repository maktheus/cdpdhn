import { motion } from 'framer-motion';
import { Copy, Download, History, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_BY_ID } from '../data/categories';
import { UNIDADES } from '../data/seed';
import { byEncaminhamento, byIngresso, byUnidade, inLastMonths, monthlySeries, toCsv } from '../data/stats';
import { useApp } from '../data/store';
import type { CategoryId } from '../data/types';
import { HBars, MonthlyBars } from '../components/charts';
import { CountUp, stagger } from '../components/ui';
import { fmtDateTime, inFrame } from '../lib/format';

export default function Relatorios() {
  const records = useApp((s) => s.records);
  const audit = useApp((s) => s.audit);
  const session = useApp((s) => s.session)!;
  const toast = useApp((s) => s.toast);
  const [months, setMonths] = useState(6);
  const [unit, setUnit] = useState('');
  const [cat, setCat] = useState<CategoryId | ''>('');

  const data = useMemo(() => {
    const ref = new Date();
    const scoped = inLastMonths(records, ref, months)
      .filter((r) => !unit || r.unidade === unit)
      .filter((r) => !cat || r.categorias.includes(cat));
    return {
      scoped,
      monthly: monthlySeries(scoped, ref, months),
      enc: byEncaminhamento(scoped),
      ing: byIngresso(scoped),
      units: byUnidade(scoped).map((u) => {
        const rs = scoped.filter((r) => r.unidade === u.key);
        return { ...u, urg: rs.filter((r) => r.prioridade === 'urgente').length, enc: rs.filter((r) => r.status === 'encerrado').length };
      }),
      people: new Set(scoped.map((r) => r.pessoa)).size,
      encTotal: scoped.reduce((s, r) => s + r.encaminhamentos.length, 0),
      closed: scoped.filter((r) => r.status === 'encerrado').length
    };
  }, [records, months, unit, cat]);

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(toCsv(data.scoped));
      toast('ok', `CSV com ${data.scoped.length} fichas copiado. Cole no Excel ou no Google Planilhas.`);
    } catch {
      toast('warn', 'Não foi possível copiar. Use o botão Baixar CSV no aplicativo instalado.');
    }
  };

  const downloadCsv = () => {
    const blob = new Blob(['﻿' + toCsv(data.scoped)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cdpdhn-atendimentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scopeLabel = `${months === 1 ? 'Mês atual' : `Últimos ${months} meses`}${unit ? `, ${unit}` : ''}${cat ? `, ${CATEGORY_BY_ID[cat].title}` : ''}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Relatórios</h1>
          <p>Indicadores para prestação de contas e planejamento. Exportações levam só dados não identificáveis.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={copyCsv}>
            <Copy size={17} /> Copiar CSV
          </button>
          {!inFrame && (
            <>
              <button className="btn btn-ghost" onClick={downloadCsv}>
                <Download size={17} /> Baixar CSV
              </button>
              <button className="btn btn-ghost" onClick={() => window.print()}>
                <Printer size={17} /> Imprimir
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card toolbar">
        <div className="filters">
          <div className="filter-group" role="radiogroup" aria-label="Período">
            <span>Período</span>
            {[1, 3, 6].map((m) => (
              <button key={m} className="seg-opt" role="radio" aria-checked={months === m} onClick={() => setMonths(m)}>
                {m === 1 ? 'Mês atual' : `${m} meses`}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <label htmlFor="r-unit" className="sr-only">
              Unidade
            </label>
            <select id="r-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">Todas as unidades</option>
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <label htmlFor="r-cat" className="sr-only">
              Categoria
            </label>
            <select id="r-cat" className="select" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | '')}>
              <option value="">Todas as categorias</option>
              {CATEGORIES.filter((c) => c.available).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid mini-kpis">
        {[
          ['Atendimentos', data.scoped.length],
          ['Pessoas atendidas', data.people],
          ['Encaminhamentos à rede', data.encTotal],
          ['Casos encerrados', data.closed]
        ].map(([l, v], i) => (
          <motion.div key={l} className="card mini-kpi" {...stagger(i)}>
            <small>{l}</small>
            <b>
              <CountUp value={v as number} duration={0.7} />
            </b>
          </motion.div>
        ))}
      </div>

      <div className="grid row-2" style={{ marginTop: 18 }}>
        <motion.section className="card card-pad" {...stagger(4)}>
          <div className="card-head">
            <h2>Atendimentos por mês</h2>
            <span className="hint">{scopeLabel}</span>
          </div>
          <MonthlyBars key={`${months}-${unit}-${cat}`} data={data.monthly} />
        </motion.section>
        <motion.section className="card card-pad" {...stagger(5)}>
          <div className="card-head">
            <h2>Porta de entrada</h2>
          </div>
          <HBars key={`${months}-${unit}-${cat}`} rows={data.ing.map((x) => ({ key: x.key, label: <span>{x.key}</span>, value: x.count }))} color="var(--bark)" />
        </motion.section>
      </div>

      <div className="grid row-2-even" style={{ marginTop: 18 }}>
        <motion.section className="card card-pad" {...stagger(6)}>
          <div className="card-head">
            <h2>Encaminhamentos à rede de proteção</h2>
          </div>
          <HBars key={`${months}-${unit}-${cat}`} rows={data.enc.map((x) => ({ key: x.key, label: <span>{x.key}</span>, value: x.count }))} />
        </motion.section>
        <motion.section className="card card-pad" {...stagger(7)}>
          <div className="card-head">
            <h2>Por unidade</h2>
          </div>
          <div className="overflow-x">
            <table className="unit-table">
              <thead>
                <tr>
                  <th>Unidade ou projeto</th>
                  <th className="r">Fichas</th>
                  <th className="r">Urgentes</th>
                  <th className="r">Encerradas</th>
                </tr>
              </thead>
              <tbody>
                {data.units.map((u) => (
                  <tr key={u.key}>
                    <td>{u.key}</td>
                    <td className="r">
                      <b>{u.count}</b>
                    </td>
                    <td className="r">{u.urg}</td>
                    <td className="r">{u.enc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>

      <motion.section className="card card-pad" style={{ marginTop: 18 }} {...stagger(8)}>
        <div className="card-head">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={19} /> Trilha de auditoria
          </h2>
          <span className="hint">{session.role === 'coordenacao' ? 'Visível para a coordenação' : 'Seus acessos'}</span>
        </div>
        {audit.length === 0 ? (
          <p className="muted">
            Nenhum acesso a dados sensíveis ainda. Abra uma ficha em Consultar e toque em Ver dados sensíveis para ver o registro aparecer aqui.
          </p>
        ) : (
          <div className="audit">
            {audit.slice(0, 8).map((a, i) => (
              <div key={i} className="audit-row">
                <span className="muted">{fmtDateTime(a.at)}</span>
                <span>
                  <b>{a.user}</b> {a.action.toLowerCase()}
                </span>
                <span className="mono">{a.recordId}</span>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </>
  );
}

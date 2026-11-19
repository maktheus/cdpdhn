import { AnimatePresence, motion } from 'framer-motion';
import { Check, CircleAlert, Lock } from 'lucide-react';
import { applyMask, type Field } from '../data/schema';

interface Props {
  sectionId: string;
  field: Field;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}

export function FieldRenderer({ sectionId, field, value, error, onChange }: Props) {
  const id = `f-${sectionId}-${field.key}`;
  const labelId = `${id}-label`;
  const span2 = field.ui.span === 2 || field.kind === 'textarea' || field.kind === 'checkboxes';
  const describedBy = [error ? `${id}-err` : '', field.ui.help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined;
  const isGroup = field.kind === 'radio' || field.kind === 'boolean' || field.kind === 'checkboxes';

  const label = (
    <span className="field-label" id={labelId}>
      {isGroup ? field.label : <label htmlFor={id}>{field.label}</label>}
      {field.required && (
        <span className="req" aria-label="obrigatório">
          *
        </span>
      )}
      {field.ui.sensitive && (
        <span className="sensitive-tag" title="Dado pessoal sensível (LGPD, art. 5º, II). Fica oculto na consulta e todo acesso é registrado.">
          <Lock size={11} /> sensível
        </span>
      )}
    </span>
  );

  let control: React.ReactNode;
  switch (field.kind) {
    case 'textarea':
      control = (
        <textarea id={id} className={`textarea`} placeholder={field.ui.placeholder ?? 'Digite aqui'} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={!!error} />
      );
      break;
    case 'select':
      control = (
        <select id={id} className="select" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-describedby={describedBy} aria-invalid={!!error}>
          <option value="">Selecione</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case 'radio':
    case 'boolean': {
      const opts: Array<[unknown, string]> = field.kind === 'boolean' ? [[true, 'Sim'], [false, 'Não']] : field.options.map((o) => [o, o]);
      control = (
        <div className="segmented" role="radiogroup" aria-labelledby={labelId} aria-describedby={describedBy}>
          {opts.map(([v, l]) => (
            <button key={l} type="button" role="radio" aria-checked={value === v} className="seg-opt" onClick={() => onChange(value === v ? undefined : v)}>
              {l}
            </button>
          ))}
        </div>
      );
      break;
    }
    case 'checkboxes': {
      const arr = (value as string[]) ?? [];
      control = (
        <div className="segmented" role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
          {field.options.map((o) => {
            const on = arr.includes(o);
            return (
              <button key={o} type="button" role="checkbox" aria-checked={on} className="chip-opt" onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>
                <span className="box">
                  <AnimatePresence>
                    {on && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ display: 'grid' }}>
                        <Check size={13} strokeWidth={3.2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {o}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'number':
      control = (
        <input
          id={id}
          className="input num"
          type="number"
          inputMode="numeric"
          min={field.schema.minimum}
          max={field.schema.maximum}
          placeholder="0"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
      );
      break;
    case 'date':
    case 'time':
      control = <input id={id} className="input num" type={field.kind} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-describedby={describedBy} aria-invalid={!!error} />;
      break;
    default:
      control = (
        <input
          id={id}
          className={`input ${field.ui.mono ? 'mono' : ''}`}
          type="text"
          inputMode={field.ui.mask ? 'numeric' : undefined}
          readOnly={field.schema.readOnly}
          placeholder={field.ui.placeholder ?? 'Digite aqui'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.ui.mask ? applyMask(field.ui.mask, e.target.value) : e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
      );
  }

  return (
    <motion.div
      layout="position"
      className={`field ${span2 ? 'span-2' : ''} ${error ? 'has-error' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
    >
      {label}
      {control}
      {field.ui.help && (
        <span className="field-help" id={`${id}-help`}>
          {field.ui.help}
        </span>
      )}
      <AnimatePresence>
        {error && (
          <motion.span className="field-error" id={`${id}-err`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CircleAlert size={15} /> {error}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

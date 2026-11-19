import { motion } from 'framer-motion';
import { Eye, EyeOff, Info, LoaderCircle, LogIn, ShieldCheck, WifiOff, ClipboardCheck } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useApp } from '../data/store';
import type { Session } from '../data/types';
import { go } from '../lib/router';

const Tree3D = lazy(() => import('../components/Tree3D'));

export default function Login() {
  const login = useApp((s) => s.login);
  const [email, setEmail] = useState('luiza.andrade@demo.cdpdhn.org');
  const [pw, setPw] = useState('demonstracao');
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<Session['role']>('tecnico');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Digite um e-mail válido, como nome@instituicao.org.');
    if (pw.length < 4) return setError('A senha precisa ter pelo menos 4 caracteres.');
    setError('');
    setBusy(true);
    await login(email, role);
    go('painel');
  };

  return (
    <div className="login">
      <motion.div className="login-card" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}>
        <h1>
          Plataforma de Consulta
          <br />e Coleta de Dados
        </h1>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input id="email" className="input" type="email" autoComplete="username" placeholder="Digite seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="senha">
              Senha
            </label>
            <div className="pw-wrap">
              <input id="senha" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label" id="perfil-label">
              Perfil de demonstração
            </span>
            <div className="role-pick" role="radiogroup" aria-labelledby="perfil-label">
              {(
                [
                  ['tecnico', 'Técnica de referência'],
                  ['coordenacao', 'Coordenação']
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={role === v} className="seg-opt" onClick={() => setRole(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" style={{ minHeight: 50 }} disabled={busy}>
            {busy ? <LoaderCircle size={19} className="spin" /> : <LogIn size={19} />}
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <div className="demo-note">
          <Info size={18} style={{ flex: 'none', marginTop: 1 }} />
          <span>Ambiente de demonstração. Todas as pessoas e fichas são fictícias e nada sai deste aparelho.</span>
        </div>
      </motion.div>

      <div className="login-stage">
        <motion.div className="wordmark" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <b>CDPDHN</b>
          <span>Direitos humanos e da natureza</span>
        </motion.div>
        <div className="tree-host">
          <Suspense fallback={null}>
            <Tree3D mode="intro" label="Árvore formada por folhas verdes sobre duas pessoas de braços abertos, símbolo do CDPDHN" />
          </Suspense>
        </div>
        <div className="value-points">
          {[
            { icon: <WifiOff size={18} />, t: 'Registra em campo, mesmo sem internet' },
            { icon: <ShieldCheck size={18} />, t: 'Dados sensíveis ocultos e acesso auditado' },
            { icon: <ClipboardCheck size={18} />, t: 'Formulário que se ajusta a cada vulnerabilidade' }
          ].map((v, i) => (
            <motion.div key={v.t} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.9 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              {v.icon}
              {v.t}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  FileChartColumn,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  TriangleAlert,
  WifiOff
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isOnline, useApp } from '../data/store';
import { go, type Route } from '../lib/router';
import { useUi } from '../lib/ui';

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onOut();
    document.addEventListener('pointerdown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('pointerdown', h);
      document.removeEventListener('keydown', k);
    };
  }, [ref, onOut]);
}

const pop = {
  initial: { opacity: 0, y: -6, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }
} as const;

function Connection() {
  const online = useApp(isOnline);
  const syncing = useApp((s) => s.syncing);
  const pending = useApp((s) => s.records.filter((r) => r.sync !== 'synced').length);
  if (syncing)
    return (
      <span className="conn" role="status">
        <LoaderCircle size={15} className="spin" />
        <span>Enviando {pending}</span>
      </span>
    );
  if (!online)
    return (
      <span className="conn offline" role="status">
        <WifiOff size={15} />
        <span>
          Sem internet<span className="label-long">{pending ? `, ${pending} aguardando envio` : ''}</span>
        </span>
      </span>
    );
  return (
    <span className="conn" role="status">
      <span className="dot" />
      <span>
        Online<span className="label-long">, tudo enviado</span>
      </span>
    </span>
  );
}

function UserMenu() {
  const session = useApp((s) => s.session)!;
  const simulatedOffline = useApp((s) => s.simulatedOffline);
  const setSimulatedOffline = useApp((s) => s.setSimulatedOffline);
  const logout = useApp((s) => s.logout);
  const resetDemo = useApp((s) => s.resetDemo);
  const toast = useApp((s) => s.toast);
  const installPrompt = useUi((s) => s.installPrompt);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const initials = session.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="avatar">{initials}</span>
        <span className="who">
          <b>{session.name}</b>
          <span>{session.roleLabel}</span>
        </span>
        <ChevronDown size={16} style={{ opacity: 0.7 }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="menu" role="menu" {...pop} style={{ transformOrigin: 'top right' }}>
            <div className="menu-head">
              <b>{session.name}</b>
              <br />
              <small>
                {session.roleLabel}, {session.unidade}
              </small>
            </div>
            <button
              className="menu-item"
              role="menuitemcheckbox"
              aria-checked={simulatedOffline}
              onClick={() => {
                setSimulatedOffline(!simulatedOffline);
                toast(simulatedOffline ? 'ok' : 'warn', simulatedOffline ? 'Internet de volta. Enviando o que ficou pendente.' : 'Modo sem internet ativado. Os registros ficam neste aparelho.');
              }}
            >
              <WifiOff size={18} />
              <span className="grow">
                Simular sem internet
                <small>Mostra como a equipe trabalha em campo</small>
              </span>
              <span className={`switch ${simulatedOffline ? 'on' : ''}`} aria-hidden />
            </button>
            {installPrompt && (
              <button
                className="menu-item"
                role="menuitem"
                onClick={async () => {
                  await installPrompt.prompt?.();
                  setOpen(false);
                }}
              >
                <Smartphone size={18} />
                <span className="grow">
                  Instalar o aplicativo
                  <small>Abre direto da tela inicial, sem navegador</small>
                </span>
              </button>
            )}
            <button
              className="menu-item"
              role="menuitem"
              onClick={() => {
                resetDemo();
                setOpen(false);
                toast('info', 'Dados de demonstração restaurados.');
              }}
            >
              <RotateCcw size={18} />
              <span className="grow">
                Restaurar dados de demonstração
                <small>Apaga o que foi criado nesta demonstração</small>
              </span>
            </button>
            <button
              className="menu-item"
              role="menuitem"
              onClick={() => {
                logout();
                go('entrar');
              }}
            >
              <LogOut size={18} />
              <span className="grow">Sair do sistema</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, children, ...rest }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode } & Record<string, unknown>) {
  return (
    <button className="nav-item" aria-current={active ? 'page' : undefined} onClick={onClick} {...rest}>
      {active && <motion.span layoutId="nav-ind" className="nav-indicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      {icon}
      {children}
    </button>
  );
}

function AtendimentosMenu({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const active = route === 'consultar' || route === 'novo' || route === 'ficha';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <NavItem active={active} onClick={() => setOpen((v) => !v)} icon={<ClipboardList size={19} />} aria-haspopup="menu" aria-expanded={open}>
        Atendimentos
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'inline-flex' }}>
          <ChevronDown size={16} />
        </motion.span>
      </NavItem>
      <AnimatePresence>
        {open && (
          <motion.div className="dropdown" role="menu" {...pop} style={{ transformOrigin: 'top left' }}>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                go('consultar');
              }}
            >
              <Search size={18} /> Consultar atendimento
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                go(useApp.getState().draft ? 'ficha' : 'novo');
              }}
            >
              <Plus size={18} /> Novo atendimento
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BottomNav({ route }: { route: Route }) {
  const items: Array<{ r: Route; label: string; icon: ReactNode; match: Route[] }> = [
    { r: 'painel', label: 'Painel', icon: <LayoutGrid size={22} />, match: ['painel'] },
    { r: 'consultar', label: 'Consultar', icon: <Search size={22} />, match: ['consultar'] },
    { r: 'novo', label: 'Novo', icon: <Plus size={22} />, match: ['novo', 'ficha'] },
    { r: 'relatorios', label: 'Relatórios', icon: <FileChartColumn size={22} />, match: ['relatorios'] }
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((it) => {
        const active = it.match.includes(route);
        return (
          <button key={it.r} className="bn-item" aria-current={active ? 'page' : undefined} onClick={() => go(it.r === 'novo' && useApp.getState().draft ? 'ficha' : it.r)}>
            {active && <motion.span layoutId="bn-pip" className="bn-pip" />}
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast ${t.tone === 'warn' ? 'warn' : ''}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            onClick={() => dismiss(t.id)}
          >
            {t.tone === 'ok' ? <CheckCircle2 size={18} /> : t.tone === 'warn' ? <TriangleAlert size={18} /> : <CloudUpload size={18} />}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => go('painel')} aria-label="CDPDHN, ir para o painel">
          <img src="./icons/icon.svg" alt="" />
          CDPDHN
        </button>
        <nav className="nav" aria-label="Navegação principal">
          <NavItem active={route === 'painel'} onClick={() => go('painel')} icon={<LayoutGrid size={19} />}>
            Painel
          </NavItem>
          <AtendimentosMenu route={route} />
          <NavItem active={route === 'relatorios'} onClick={() => go('relatorios')} icon={<FileChartColumn size={19} />}>
            Relatórios
          </NavItem>
        </nav>
        <div className="topbar-right">
          <Connection />
          <UserMenu />
        </div>
      </header>
      <main className="main">{children}</main>
      <BottomNav route={route} />
    </div>
  );
}

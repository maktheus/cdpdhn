import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect } from 'react';
import { AppShell, Toasts } from './components/AppShell';
import { pageMotion } from './components/ui';
import { useApp } from './data/store';
import { go, useRoute } from './lib/router';
import Consultar from './pages/Consultar';
import Dashboard from './pages/Dashboard';
import Ficha from './pages/Ficha';
import Login from './pages/Login';
import NovoAtendimento from './pages/NovoAtendimento';
import Relatorios from './pages/Relatorios';

const TITLES: Record<string, string> = {
  entrar: 'Entrar',
  painel: 'Painel',
  consultar: 'Consultar atendimentos',
  novo: 'Novo atendimento',
  ficha: 'Ficha de atendimento',
  relatorios: 'Relatórios'
};

export default function App() {
  const route = useRoute();
  const session = useApp((s) => s.session);

  useEffect(() => {
    if (!session && route !== 'entrar') go('entrar');
    if (session && route === 'entrar') go('painel');
    document.title = `${TITLES[route]} | CDPDHN`;
  }, [session, route]);

  if (!session || route === 'entrar') {
    return (
      <MotionConfig reducedMotion="user">
        <Login />
        <Toasts />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppShell route={route}>
        <AnimatePresence mode="wait">
          <motion.div key={route} {...pageMotion}>
            {route === 'painel' && <Dashboard />}
            {route === 'consultar' && <Consultar />}
            {route === 'novo' && <NovoAtendimento />}
            {route === 'ficha' && <Ficha />}
            {route === 'relatorios' && <Relatorios />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <Toasts />
    </MotionConfig>
  );
}

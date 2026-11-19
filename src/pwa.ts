/**
 * PWA: service worker (cache offline do app) + eventos de rede + prompt de instalação.
 * Em ambientes que bloqueiam service worker (iframes sandbox), tudo falha em silêncio
 * e o app continua funcionando normalmente.
 */
import { useApp } from './data/store';
import { inFrame } from './lib/format';
import { useUi } from './lib/ui';

export async function setupPwa() {
  window.addEventListener('online', () => useApp.getState().setNetOnline(true));
  window.addEventListener('offline', () => useApp.getState().setNetOnline(false));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useUi.getState().setInstallPrompt(e as never);
  });

  if (inFrame || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch {
    /* sem service worker: segue online-only */
  }
}

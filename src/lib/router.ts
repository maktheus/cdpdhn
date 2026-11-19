/**
 * Roteador por hash simples (#painel, #consultar...).
 * Só nomes planos: funciona em qualquer hospedagem estática, sem configurar o servidor.
 */
import { useSyncExternalStore } from 'react';

export type Route = 'entrar' | 'painel' | 'consultar' | 'novo' | 'ficha' | 'relatorios';
const ROUTES: Route[] = ['entrar', 'painel', 'consultar', 'novo', 'ficha', 'relatorios'];

function read(): Route {
  const h = typeof location === 'undefined' ? '' : location.hash.replace(/^#/, '');
  return (ROUTES as string[]).includes(h) ? (h as Route) : 'painel';
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read, () => 'painel');
}

export function go(r: Route) {
  if (location.hash !== `#${r}`) location.hash = r;
  window.scrollTo({ top: 0 });
}

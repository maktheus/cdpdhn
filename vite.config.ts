import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' → todos os assets com caminho relativo.
// Assim o mesmo build roda em qualquer subcaminho (nginx, GitHub Pages, artifact hospedado).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registramos manualmente em src/pwa.ts (com try/catch para ambientes sandbox)
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'CDPDHN — Plataforma de Consulta e Coleta de Dados',
        short_name: 'CDPDHN',
        description: 'Registro e acompanhamento de atendimentos em direitos humanos, inclusive em campo e sem internet.',
        lang: 'pt-BR',
        start_url: './#painel',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F2F5F0',
        theme_color: '#0D4A33',
        categories: ['productivity', 'government', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Novo atendimento', url: './#novo', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Consultar atendimentos', url: './#consultar', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html'
      }
    })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
} as any);

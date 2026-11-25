/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { about, contactEmail, legalUpdated, privacyPolicy, type LegalSection } from './src/privacy/legal'

// A public, static copy of the privacy notice for links outside the app (Google sign-in branding).
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const sectionsHtml = (sections: LegalSection[]) =>
  sections
    .map(
      (s) =>
        `<h2>${escape(s.heading)}</h2>` +
        s.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('') +
        (s.list ? `<ul>${s.list.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>` : ''),
    )
    .join('\n')
function legalPage(): Plugin {
  return {
    name: 'motion-legal-page',
    apply: 'build',
    generateBundle() {
      const html = `<!doctype html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin"><title>Motion – Datenschutz</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:42rem;margin:0 auto;padding:2rem 1.25rem;background:#0D1114;color:#E8ECEF}h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:2rem}a{color:#7FD1FF}small{color:#9AA5AE}</style>
</head><body>
<h1>Datenschutzhinweis</h1><small>Stand: ${escape(legalUpdated)}</small>
${sectionsHtml(privacyPolicy)}
<h1>Über dieses Projekt</h1>
${sectionsHtml(about)}
<p><a href="./">Zu Motion</a> · <a href="mailto:${contactEmail}">${contactEmail}</a></p>
</body></html>
`
      this.emitFile({ type: 'asset', fileName: 'datenschutz.html', source: html })
    },
  }
}

// Relative base keeps the build portable for Capacitor and any static host.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    react(),
    legalPage(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        id: './',
        name: 'Motion',
        short_name: 'Motion',
        description: 'Strength in motion. Make every rep count.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0D1114',
        theme_color: '#0D1114',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'],
  },
})

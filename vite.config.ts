import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/colorfit-icon-180.png', 'icons/colorfit-icon-32.png'],
      manifest: {
        name: 'ColorFit — 퍼스널컬러 옷장',
        short_name: 'ColorFit',
        description: '12계절 퍼스널컬러 진단과 내 옷장 기반 코디 추천',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f3f1',
        theme_color: '#ffffff',
        icons: [
          { src: '/icons/colorfit-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/colorfit-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/colorfit-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 카탈로그 861장(약 133MB)은 설치 시점 프리캐시에 절대 넣지 않는다 — 앱 셸만 프리캐시.
        globPatterns: ['**/*.{js,css,html}', 'icons/*.png', 'fonts/*.woff2'],
        globIgnores: ['catalog/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // 카탈로그 이미지는 본 것만 캐시에 쌓고 LRU로 정리한다.
            urlPattern: /\/catalog\/.*\.(?:png|jpg|jpeg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'catalog-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
            },
          },
          {
            // MediaPipe wasm·모델 — 첫 진단 이후에는 오프라인에서도 얼굴 분석이 되도록 장기 캐시.
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|storage\.googleapis\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-assets',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
            },
          },
          {
            // 날씨는 신선도 우선, 네트워크 실패 시 최근 응답으로 폴백.
            urlPattern: /^https:\/\/(api\.open-meteo\.com|air-quality-api\.open-meteo\.com|api\.bigdatacloud\.net)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});

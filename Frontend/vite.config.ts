import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            const httpRes = res as import('node:http').ServerResponse
            if (!httpRes.headersSent) {
              httpRes.writeHead(503, { 'Content-Type': 'application/json' })
              httpRes.end(
                JSON.stringify({
                  success: false,
                  message:
                    'تعذر الاتصال بخادم الـ Backend على المنفذ 5000. تأكد من تشغيل الخادم عبر (npm run dev:backend).',
                }),
              )
            }
          })
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

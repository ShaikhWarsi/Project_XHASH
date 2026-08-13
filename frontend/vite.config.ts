import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    conditions: ['module', 'browser', 'import'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('plotly')) return 'plotly'
          if (id.includes('monaco') || id.includes('@monaco-editor')) return 'monaco'
          if (id.includes('@xyflow')) return 'xyflow'
          if (id.includes('lightweight-charts')) return 'charts'
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) return 'vendor'
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ['plotly.js-dist-min'],
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({ open: false })],
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: [
        {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/axios')) {
              return 'vendor-axios'
            }
          },
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split('.').pop() || ''
            if (/png|jpe?g|gif|svg/.test(ext)) {
              return `images/[name]-[hash][extname]`
            }
            if (/woff|woff2|eot|ttf|otf/.test(ext)) {
              return `fonts/[name]-[hash][extname]`
            }
            if (ext === 'css') {
              return `css/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
        },
      ],
    },
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  },
})

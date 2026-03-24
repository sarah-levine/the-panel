import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/sidebar/index.html'),
        content: resolve(__dirname, 'src/content/index.js'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content/index.js'
          if (chunk.name === 'service-worker') return 'background/service-worker.js'
          return 'sidebar/[name]-[hash].js'
        },
        chunkFileNames: 'sidebar/[name]-[hash].js',
        assetFileNames: 'sidebar/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})

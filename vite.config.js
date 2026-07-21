import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node' },
  build: {
    // Phaser is kept in its own vendor chunk; its minified distribution is larger than Vite's generic 500 kB threshold.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom', 'motion/react'], state: ['zustand', 'immer', 'xstate', '@xstate/react'] } },
    },
  },
})

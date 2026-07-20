import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node' },
  build: {
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom', 'motion/react'], state: ['zustand', 'immer', 'xstate', '@xstate/react'] } },
    },
  },
})

import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sanya-exe/',
  build: {
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
    chunkSizeWarningLimit: 1500,
  },
});

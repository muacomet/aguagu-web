import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 배포 시 리포지토리 이름으로 base 변경
  // 예: https://username.github.io/aguagu-web/ → base: '/aguagu-web/'
  base: '/aguagu-web/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});

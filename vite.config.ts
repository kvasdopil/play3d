import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tripo': {
        target: 'https://api.tripo3d.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/tripo/, ''),
      },
    },
  },
});

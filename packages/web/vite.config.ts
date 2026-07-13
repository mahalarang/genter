import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/proxy/xpvid': {
        target: 'https://xpvid.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/xpvid/, ''),
        headers: { Referer: 'https://xpvid.cc/' },
      },
      '/proxy/cdn': {
        target: 'https://meiva.overfetch.video',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cdn/, ''),
        headers: { Referer: 'https://xpvid.cc/' },
      },
    },
  },
});

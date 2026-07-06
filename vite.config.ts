import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'fs';

function swVersionPlugin() {
  return {
    name: 'sw-version',
    writeBundle() {
      const swPath = 'dist/service-worker.js';
      try {
        let content = readFileSync(swPath, 'utf-8');
        const version = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        content = content.replace('__SW_VERSION__', version);
        writeFileSync(swPath, content);
      } catch {}
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), swVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
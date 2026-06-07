import { createRequire } from 'module';

console.log('[Vercel Bootstrap] Iniciando api/server.ts...');

const _require = createRequire(import.meta.url);

console.log('[Vercel Bootstrap] Carregando dist/server.cjs...');
const serverExports = _require('../dist/server.cjs');
console.log('[Vercel Bootstrap] dist/server.cjs carregado. Export keys:', Object.keys(serverExports));

const app = serverExports.default;
console.log('[Vercel Bootstrap] App exportado. app.get:', typeof app?.get, 'app.post:', typeof app?.post);

export default app;

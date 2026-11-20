import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Engine tests only: plain TypeScript, no React Native. Run with `npm test`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});

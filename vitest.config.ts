import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // La couverture porte sur le code métier, pas sur la configuration
      // ni sur les points d'entrée qui ne font que réexporter.
      include: ['src/features/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
      exclude: ['**/index.ts', '**/types/**', '**/*.d.ts', '**/*.test.{ts,tsx}'],
    },
  },
});
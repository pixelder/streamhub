import { defineConfig } from 'vite';

export default defineConfig(
  {
    // Vite's native JSX transform avoids a second compiler or a React runtime.
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    // Vite 8's dependency scanner has a separate Rolldown JSX transform.
    optimizeDeps: {
      entries: ['index.html'],
      rolldownOptions: { transform: { jsx: { runtime: 'automatic', importSource: 'preact' } } },
    },
    appType: 'custom',
    build: {
      outDir: 'dist',
      assetsDir: 'build',
      sourcemap: false,
      target: 'es2022'
    },
  }
);

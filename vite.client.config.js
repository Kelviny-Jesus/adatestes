
    import { defineConfig } from 'vite';
    import { vitePlugin as remix } from '@remix-run/dev';
    import UnoCSS from 'unocss/vite';
    import tsconfigPaths from 'vite-tsconfig-paths';
    
    export default defineConfig({
      build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        assetsInlineLimit: 4096,
        rollupOptions: {
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false
          },
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) return 'vendor';
              return undefined;
            }
          }
        }
      },
      plugins: [
        remix(),
        UnoCSS(),
        tsconfigPaths()
      ],
      optimizeDeps: {
        noDiscovery: true
      }
    });
  
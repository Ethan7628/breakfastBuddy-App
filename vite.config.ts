import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Plugin to inject resource hints for critical request chain optimization
const resourceHintsPlugin = () => {
  return {
    name: 'resource-hints',
    transformIndexHtml(html: string, context: any) {
      if (context.bundle) {
        const chunks = Object.values(context.bundle) as any[];
        const entryChunk = chunks.find((chunk: any) => chunk.isEntry && chunk.fileName);
        const cssChunk = chunks.find((chunk: any) => chunk.fileName?.endsWith('.css'));
        
        let resourceHints = '';
        
        if (entryChunk && entryChunk.fileName) {
          resourceHints += `<link rel="modulepreload" href="/${entryChunk.fileName}" />`;
        }
        
        if (cssChunk && cssChunk.fileName) {
          resourceHints += `<link rel="preload" href="/${cssChunk.fileName}" as="style" />`;
        }
        
        return html.replace('<head>', `<head>${resourceHints}`);
      }
      return html;
    }
  };
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
  },
  plugins: [
    react(),
    resourceHintsPlugin(),
  // mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'BreakFast Buddy',
        short_name: 'B.B',
        description: 'My React PWA with Firebase',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimized build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query']
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'unknown';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/i.test(name)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000
  },
  base: '/', // Ensures proper asset paths in production
}));
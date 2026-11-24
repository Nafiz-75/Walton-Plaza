import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Two builds:
//  npm run build      -> dist/      one self-contained index.html that opens straight from disk (file://)
//  npm run build:web  -> dist-web/  code-split for hosting: each page, GSAP and the catalogue load only when needed
export default defineConfig(({ mode }) => {
  const web = mode === 'web'
  return {
    base: './',
    plugins: [react(), ...(web ? [] : [viteSingleFile({ removeViteModuleLoader: true })])],
    build: web
      ? {
          outDir: 'dist-web', target: 'es2020', reportCompressedSize: true,
          rollupOptions: { output: { manualChunks: id => id.includes('node_modules/gsap') ? 'gsap' : id.includes('node_modules/framer-motion') || id.includes('node_modules/motion') ? 'motion' : id.includes('node_modules/react') ? 'react' : id.includes('products.json') ? 'catalogue' : undefined } },
        }
      : { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100000000, reportCompressedSize: true },
  }
})

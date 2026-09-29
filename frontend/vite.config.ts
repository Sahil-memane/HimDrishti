import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// maplibre-gl loads its map-data worker at runtime from a URL it builds
// itself: new URL('./maplibre-gl-worker.mjs', import.meta.url) — relative
// to wherever ITS OWN bundled code ends up being served from (i.e. the
// hashed main chunk in assets/, once Vite has inlined maplibre-gl into
// it). Vite's static analysis can't see that dynamically-built path, so
// it never copies the real worker file into the build output — it only
// ever exists inside node_modules. The result: the base map (raster
// tiles) renders fine without it, but every GeoJSON-driven overlay
// (routes, vessel/waypoint markers, risk zones, sea-ice, icebergs) is
// silently never drawn, because the worker that parses/tessellates that
// vector data 404s in production (confirmed: this never reproduces in
// `vite dev`, which resolves the import lazily instead of needing a real
// emitted file — only a real deployed build exposes it).
function copyMaplibreWorker(): Plugin {
  return {
    name: 'copy-maplibre-gl-worker',
    apply: 'build',
    closeBundle() {
      const src = resolve(import.meta.dirname, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')
      const destDir = resolve(import.meta.dirname, 'dist/assets')
      const dest = resolve(destDir, 'maplibre-gl-worker.mjs')
      if (!existsSync(src)) {
        this.warn(`maplibre-gl-worker.mjs not found at ${src} — map overlays will silently fail to render.`)
        return
      }
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copyMaplibreWorker()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
  },
})

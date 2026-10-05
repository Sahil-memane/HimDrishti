import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
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
      // The worker is not self-contained: maplibre-gl 6.x splits it into
      // maplibre-gl-worker.mjs + maplibre-gl-shared.mjs (the worker does
      // `import ... from './maplibre-gl-shared.mjs'`). Copying only the
      // worker leaves that import 404ing in production and the overlays
      // still never draw, so copy every non-dev runtime .mjs from dist/.
      const srcDir = resolve(import.meta.dirname, 'node_modules/maplibre-gl/dist')
      const destDir = resolve(import.meta.dirname, 'dist/assets')
      if (!existsSync(resolve(srcDir, 'maplibre-gl-worker.mjs'))) {
        this.warn(`maplibre-gl-worker.mjs not found in ${srcDir} - map overlays will silently fail to render.`)
        return
      }
      mkdirSync(destDir, { recursive: true })
      for (const f of readdirSync(srcDir)) {
        if (/^maplibre-gl-(worker|shared)\.mjs$/.test(f)) copyFileSync(resolve(srcDir, f), resolve(destDir, f))
      }
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

import { build } from 'esbuild'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))
const outfile = path.join(root, 'node_modules/.cache/bosque-map/paint.mjs')

await build({
  absWorkingDir: root,
  entryPoints: ['scripts/map/paint.ts'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['@napi-rs/canvas'],
  logLevel: 'warning',
})

try {
  const { paint } = await import(pathToFileURL(outfile).href)
  const result = await paint({ root, debugFile: args.get('debug'), quality: Number(args.get('quality') ?? 92) })
  console.log(`Mapa gerado em ${(result.ms / 1000).toFixed(1)} s · tiles ${result.tilesKB} KB · atlas ${result.atlas} com ${result.sprites} sprites`)
} finally {
  await rm(outfile, { force: true })
}

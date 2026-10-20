import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { cp, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = process.env.EXPORT_DIR ? path.resolve(process.env.EXPORT_DIR) : path.join(root, 'dist')
const stage = path.join(dist, 'bosque-alto')
const offline = path.join(stage, 'offline')
const assets = path.join(root, 'public/game/assets')

await rm(stage, { recursive: true, force: true })
await mkdir(offline, { recursive: true })

await build({
  absWorkingDir: root,
  entryPoints: ['standalone/main.ts'],
  outfile: path.join(offline, 'game.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
})

execFileSync('pnpm', ['exec', 'tailwindcss', '-i', 'app/globals.css', '-o', path.join(offline, 'game.css'), '--minify'], { cwd: root, stdio: 'inherit' })
const gameCss = path.join(offline, 'game.css')
await writeFile(
  gameCss,
  (await readFile(gameCss, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll('/game/assets/', './assets/'),
)
await cp(assets, path.join(offline, 'assets'), { recursive: true })

let fontCss = ''
for (const staticDir of ['.next/static', '.next/dev/static']) {
  try {
    const media = path.join(root, staticDir, 'media')
    const woff = (await readdir(media)).filter((file) => file.endsWith('.woff2'))
    const chunks = path.join(root, staticDir, 'chunks')
    const styles = (
      await Promise.all((await readdir(chunks)).filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(chunks, file), 'utf8')))
    ).join('\n')
    const copied = new Set()
    for (const face of styles.match(/@font-face\s*\{[^}]+\}/g) ?? []) {
      const family = face.match(/font-family:([^;]+)/)?.[1] ?? ''
      if (!/geist/i.test(family) || /fallback/i.test(family)) continue
      const source = woff.find((name) => face.includes(name))
      if (!source || copied.has(source)) continue
      copied.add(source)
      await mkdir(path.join(offline, 'assets/fonts'), { recursive: true })
      await copyFile(path.join(media, source), path.join(offline, 'assets/fonts', source))
      fontCss += face.replace(/url\([^)]*\)/g, `url("./assets/fonts/${source}")`) + '\n'
    }
    if (fontCss) {
      fontCss += ':root { --font-geist: Geist; }\n'
      break
    }
  } catch {
    fontCss = ''
  }
}
await writeFile(path.join(offline, 'fonts.css'), fontCss)

await writeFile(
  path.join(offline, 'index.html'),
  `<!doctype html>
<html lang="pt-BR" class="dark bg-background">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#151e1b">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="Um meteoro cai sobre a floresta de Bosque Alto e dele saem visitantes que não são deste mundo. Com o seu robô, explore a cidade em pixel art, enfrente robôs e aliens nos ringues da Liga de Robôs e nas fugas das fábricas com o tablet de combate, e gaste os créditos em peças na Oficina do Cristal.">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>The Battles of the Iron Work</title>
  <link rel="icon" href="assets/icon.png">
  <link rel="preload" href="assets/fx/sky.webp" as="image">
  <link rel="stylesheet" href="fonts.css">
  <link rel="stylesheet" href="game.css">
</head>
<body class="font-sans antialiased">
  <main id="root" aria-label="The Battles of the Iron Work"></main>
  <noscript>Ative o JavaScript para jogar. O mapa em alta resolução está em assets/map/tiles.</noscript>
  <script src="game.js" defer></script>
</body>
</html>
`,
)

const bundled = await build({
  stdin: {
    contents: `export * from './lib/world-data'; export * as layout from './lib/city/layout'; export { WALK_SPEED } from './lib/game/player'; export { FRAME, ANCHOR, DIRECTIONS } from './lib/game/sprite'; export { TIMELINE } from './lib/game/cutscene/director'; export { PARTS, BASE_STATS, BODY_NAME } from './lib/game/robot/parts'; export { STARTING_CREDITS } from './lib/game/robot/progress'; export { MAIN_MISSIONS, SIDE_MISSIONS } from './lib/game/missions/data'; export { ENEMIES } from './lib/game/battle/enemies'`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
})
const world = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const { layout } = world
await writeFile(
  path.join(offline, 'world.json'),
  JSON.stringify({
    ...world.WORLD,
    mode: 'playable',
    units: `Coordenadas em unidades do mundo (${world.WORLD.width} x ${world.WORLD.height}); o mapa é gerado por código a partir de lib/city/layout.ts e lib/city/outskirts.ts.`,
    intro: { duration: world.TIMELINE.end, impact: world.TIMELINE.impact, split: world.TIMELINE.split },
    player: {
      spawn: world.HOME_START,
      speed: world.WALK_SPEED,
      sprite: { frame: world.FRAME, anchor: world.ANCHOR, directions: world.DIRECTIONS },
      robot: {
        body: world.BODY_NAME,
        baseStats: world.BASE_STATS,
        startingCredits: world.STARTING_CREDITS,
        parts: world.PARTS.map(({ id, slot, name, price, stats, layer }) => ({ id, slot, name, price, stats, layer })),
      },
    },
    shop: world.SHOP,
    battle: {
      arena: world.ARENA,
      sites: world.SITES.map(({ id, kind, name, district, door, zone, spawn }) => ({ id, kind, name, district, door, zone, spawn })),
      enemies: Object.values(world.ENEMIES).map(({ kind, name, title, health, damage, speed, bounty, behaviour }) => ({ kind, name, title, health, damage, speed, bounty, behaviour })),
      missions: [...world.MAIN_MISSIONS, ...world.SIDE_MISSIONS].map(({ id, kind, order, title, tagline, reward, firstBonus, rounds, tier, site, alienChance }) => ({
        id,
        kind,
        order,
        title,
        tagline,
        reward,
        firstBonus,
        rounds,
        tier,
        site,
        alienChance,
      })),
    },
    meteor: { site: world.METEOR_SITE, size: world.METEOR, crater: world.CRATER, fires: world.CRATER_FIRES, rocks: world.ROCKS },
    regions: world.REGIONS,
    city: {
      buildings: layout.BUILDINGS.map(({ id, style, x, y, w, h, floors }) => ({ id, style, x, y, w, h, floors })),
      landmarks: layout.LANDMARKS.map(({ kind, id, x, y }) => ({ kind, id, x, y })),
      trees: layout.TREES.length,
      lamps: layout.PROPS.filter((prop) => prop.kind === 'lamp').length,
    },
    terrainCodes: world.TERRAIN,
    blockedTerrain: [world.TERRAIN.forest, world.TERRAIN.water, world.TERRAIN.solid],
    polygons: {
      town: layout.TOWN,
      camp: layout.CAMP,
      campTrail: layout.CAMP_TRAIL,
      water: layout.WATER,
      bridges: layout.BRIDGES.map((bridge) => bridge.rect),
    },
    collisionMap: world.createCollisionMap(),
  }),
)

const projectFolders = ['app', 'components', 'lib', 'standalone', 'scripts', 'public/game']
const projectFiles = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'next.config.mjs',
  'tsconfig.json',
  'postcss.config.mjs',
  'components.json',
  'vercel.json',
  '.gitignore',
]
for (const folder of projectFolders) {
  await cp(path.join(root, folder), path.join(stage, folder), { recursive: true })
}
for (const file of projectFiles) {
  await copyFile(path.join(root, file), path.join(stage, file))
}

const archive = path.join(dist, 'bosque-alto.zip')
await rm(archive, { force: true })
const entries = [...new Set(projectFolders.map((folder) => folder.split('/')[0])), ...projectFiles, 'offline']
execFileSync('zip', ['-q', '-r', archive, ...entries], { cwd: stage, stdio: 'inherit' })
console.log(`Projeto Next.js pronto para a Vercel e jogo offline (pasta offline/) exportados: ${archive}`)

import { partById } from '../robot/parts'
import type { Core } from '../robot/progress'
import { FRAME } from '../sprite'
import { attackNames, weaponFor } from './arsenal'
import { CLASSES } from './classes'
import { CARDS } from './deck'
import { EFFECT_FACTOR, ELEMENTS, effectiveness, weaknessesOf, type Effectiveness, type Element } from './elements'
import { rankName, specDef, specLook, type EnemySpec } from './lineup'
import type { EnemyArt } from './sprites'

export type DossierContext = { assetBase: string; art: EnemyArt; core: Core }

const MAX = { health: 320, damage: 46, speed: 520, shot: 32 }
const BOSS_MAX = { health: 1600, damage: 90, speed: 520, shot: 60 }

const EFFECT_TEXT: Record<Effectiveness, string> = { super: 'Super eficaz', normal: 'Normal', weak: 'Pouco eficaz', resist: 'Resiste' }

export function emblem(context: { assetBase: string }, element: Element, className = 'emblem') {
  const def = ELEMENTS[element]
  return `<img class="${className}" src="${context.assetBase}${def.icon}" alt="${def.name}" width="64" height="64" decoding="async">`
}

export function classEmblem(context: { assetBase: string }, cls: EnemySpec['cls'], className = 'emblem') {
  const def = CLASSES[cls]
  return `<img class="${className}" src="${context.assetBase}${def.icon}" alt="${def.name}" width="64" height="64" decoding="async">`
}

const rgb = ([r, g, b]: readonly number[]) => `${r} ${g} ${b}`

function factorText(result: Effectiveness, elementBonus = 1) {
  const factor = result === 'super' ? 1 + (EFFECT_FACTOR.super - 1) * elementBonus : EFFECT_FACTOR[result]
  return `×${factor.toFixed(2).replace(/0$/, '').replace('.', ',')}`
}

export function dossierPage(spec: EnemySpec, context: DossierContext): HTMLElement {
  const def = specDef(spec)
  const power = spec.power ?? spec.tier
  const element = ELEMENTS[spec.element]
  const cls = CLASSES[spec.cls]
  const mine = ELEMENTS[context.core.element]
  const myClass = CLASSES[context.core.cls]
  const health = Math.round(def.health * spec.tier)
  const damage = Math.round(def.damage * power * cls.mods.melee)
  const speed = Math.round(def.speed * cls.mods.speed)
  const shot = def.shot ? Math.round(def.shot.damage * power * cls.mods.shot) : 0
  const weapon = weaponFor(def.loadout?.weapon)
  const names = attackNames(weapon, spec.element)
  const attack = effectiveness(context.core.element, spec.element)
  const defend = effectiveness(spec.element, context.core.element)
  const parts = def.loadout
    ? Object.values(def.loadout)
        .map((id) => partById(id)?.name)
        .filter((name): name is string => !!name)
    : []
  const bar = (label: string, value: number, max: number, text = `${value}`) => `
    <div class="dossier-stat">
      <dt>${label}</dt>
      <dd><span class="dossier-stat-track"><i style="--amount:${Math.min(1, value / max).toFixed(3)}"></i></span><b>${text}</b></dd>
    </div>`

  const limits = spec.boss ? BOSS_MAX : MAX
  const page = document.createElement('div')
  page.className = 'dossier-page'
  page.dataset.boss = String(Boolean(spec.boss))
  page.style.setProperty('--el', rgb(element.color))
  page.style.setProperty('--el-glow', rgb(element.glow))
  page.innerHTML = `
    <section class="dossier-scan" aria-label="Retrato do adversário">
      <div class="dossier-scan-frame">
        <span class="dossier-scan-line" aria-hidden="true"></span>
        <span class="dossier-level"><b>Nv. ${spec.level}</b><small>${spec.boss ? 'Campeão' : rankName(spec.level)}</small></span>
      </div>
      <div class="dossier-core">
        <div class="dossier-chip">${emblem(context, spec.element)}<span><small>Elemento</small><b>${element.name}</b></span></div>
        <div class="dossier-chip">${classEmblem(context, spec.cls)}<span><small>Classe</small><b>${cls.name}</b></span></div>
      </div>
    </section>
    <section class="dossier-info">
      <header class="dossier-title">
        <h3>${def.name}</h3>
        <span>${def.title}</span>
      </header>
      <p class="dossier-lore">${element.description} <em>${cls.name}, ${cls.title}:</em> ${cls.perk} ${cls.flaw}</p>
      <dl class="dossier-stats">
        ${bar('Vida', health, limits.health)}
        ${bar('Golpe', damage, limits.damage)}
        ${bar('Tiro', shot, limits.shot, shot ? `${shot}` : '—')}
        ${bar('Velocidade', speed, limits.speed)}
      </dl>
      <div class="dossier-block">
        <h4>Ataques</h4>
        <ul class="dossier-moves">
          <li><b>${names.melee.name}</b><span>${names.melee.flavor}</span></li>
          ${def.shot ? `<li><b>${names.shot.name}</b><span>${names.shot.flavor}</span></li>` : ''}
        </ul>
      </div>
      <div class="dossier-block">
        <h4>Cartas no firmware</h4>
        ${
          spec.cards.length
            ? `<ul class="dossier-cards">${spec.cards
                .map((id) => {
                  const card = CARDS[id]
                  return `<li style="--card-art:url('${context.assetBase}${card.art}')"><span class="dossier-card-art" aria-hidden="true"></span><span><b>${card.name}</b><small>${card.kind === 'special' ? 'especial' : `transformação · abaixo de metade da vida`}</small></span></li>`
                })
                .join('')}</ul>`
            : '<p class="dossier-empty">Nenhuma carta neste nível. A partir do Nv. 2 carrega um especial; do Nv. 4, uma transformação.</p>'
        }
      </div>
      <div class="dossier-block">
        <h4>Peças</h4>
        <p class="dossier-parts">${parts.length ? parts.join(' · ') : 'Nenhuma: um organismo que veio dentro do meteoro.'}</p>
      </div>
      <div class="dossier-matchup">
        <div class="dossier-vs" data-effect="${attack}">
          ${emblem(context, context.core.element, 'emblem emblem-sm')}<span class="dossier-arrow" aria-hidden="true">›</span>${emblem(context, spec.element, 'emblem emblem-sm')}
          <span><small>Seus golpes (${mine.name}) nele</small><b>${EFFECT_TEXT[attack]} ${factorText(attack, myClass.mods.element)}</b></span>
        </div>
        <div class="dossier-vs" data-effect="${defend}" data-incoming="true">
          ${emblem(context, spec.element, 'emblem emblem-sm')}<span class="dossier-arrow" aria-hidden="true">›</span>${emblem(context, context.core.element, 'emblem emblem-sm')}
          <span><small>Golpes dele em você</small><b>${EFFECT_TEXT[defend]} ${factorText(defend, cls.mods.element)}</b></span>
        </div>
        <div class="dossier-weak">
          <small>Fraco contra</small>
          <span>${weaknessesOf(spec.element)
            .map((id) => emblem(context, id, 'emblem emblem-xs'))
            .join('')}</span>
        </div>
      </div>
      <p class="card-hint">Dica: ${def.hint}</p>
    </section>
  `
  const portrait = document.createElement('canvas')
  portrait.className = 'dossier-portrait'
  const scale = 6
  portrait.width = FRAME.width * scale
  portrait.height = FRAME.height * scale
  const paint = portrait.getContext('2d')
  if (paint) {
    paint.imageSmoothingEnabled = false
    const cell = context.art.portrait(specLook(spec))
    paint.drawImage(cell.image, cell.sx, cell.sy, cell.width, cell.height, 0, 0, portrait.width, portrait.height)
  }
  portrait.style.setProperty('--portrait-scale', String(Math.min(1.15, def.scale)))
  page.querySelector('.dossier-scan-frame')?.prepend(portrait)
  return page
}

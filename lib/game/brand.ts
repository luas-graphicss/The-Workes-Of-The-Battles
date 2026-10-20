export const GAME_TITLE = 'The Battles of the Iron Work'
export const GAME_TITLE_LEAD = 'The Battles of'
export const GAME_TITLE_MAIN = 'the Iron Work'

export function titleMarkup(block: string) {
  return `<span class="${block}-lead">${GAME_TITLE_LEAD}</span> <span class="${block}-main">${GAME_TITLE_MAIN}</span>`
}

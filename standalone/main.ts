import { createGame } from '../lib/game/engine'

const root = document.getElementById('root')
if (!root) throw new Error('O contêiner do jogo não foi encontrado.')

createGame(root, { assetBase: '' })

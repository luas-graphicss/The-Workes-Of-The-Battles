'use client'

import { useEffect, useRef } from 'react'
import { createGame } from '@/lib/game/engine'

export function Game() {
  const surface = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = surface.current
    if (!element) return
    const game = createGame(element, { assetBase: '/game/' })
    return () => game.destroy()
  }, [])

  return <main ref={surface} aria-label="The Battles of the Iron Work" />
}

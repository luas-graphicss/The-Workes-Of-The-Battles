export type BondLevel = { index: number; at: number; name: string; charge: number; line: string }

export const BOND_LEVELS: readonly BondLevel[] = [
  { index: 0, at: 0, name: 'Conhecidos', charge: 0, line: 'O B-01 ainda estuda cada gesto seu.' },
  { index: 1, at: 3, name: 'Sintonia', charge: 5, line: 'O núcleo acende um pouco mais quando você chega perto.' },
  { index: 2, at: 8, name: 'Parceiros', charge: 10, line: 'Vocês já se entendem sem palavras. A luta começa com mais carga.' },
  { index: 3, at: 15, name: 'Inseparáveis', charge: 15, line: 'Onde um vai, o outro vai junto. A carga inicial é a maior possível.' },
]

export const BOND_MAX = 99

export const GREET_COOLDOWN = 45

export function bondLevel(bond: number): BondLevel {
  let current = BOND_LEVELS[0]
  for (const level of BOND_LEVELS) if (bond >= level.at) current = level
  return current
}

export function nextBondLevel(bond: number): BondLevel | null {
  return BOND_LEVELS.find((level) => level.at > bond) ?? null
}

export function bondCharge(bond: number): number {
  return bondLevel(bond).charge
}

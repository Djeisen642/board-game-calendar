import { describe, it, expect } from 'vitest'
import { collectionGenres, filterAndSortCollection } from '~/helpers/collection'
import type { Game } from '~/helpers/types'

function game(overrides: Partial<Game> & { id: string; name: string }): Game {
  return { thumbnail: '', ...overrides }
}

// Push IDs sort lexicographically by creation time. g1 oldest, g3 newest.
const collection: Record<string, Game> = {
  '-g1': game({ id: '1', name: 'Azul', categories: ['Abstract', 'Strategy'] }),
  '-g2': game({ id: '2', name: 'Brass', categories: ['Economic'] }),
  '-g3': game({ id: '3', name: 'Catan', categories: ['Economic', 'Strategy'] }),
  '-g4': game({ id: '4', name: 'Dune' }), // no categories
}

const ratings: Record<string, number> = { '1': 5, '2': 3, '3': 4 }
const ratingFor = (id: string) => ratings[id] ?? 0

describe('collectionGenres', () => {
  it('returns distinct genres alphabetized', () => {
    expect(collectionGenres(collection)).toEqual([
      'Abstract',
      'Economic',
      'Strategy',
    ])
  })

  it('handles a null collection', () => {
    expect(collectionGenres(null)).toEqual([])
  })
})

describe('filterAndSortCollection', () => {
  const base = {
    text: '',
    genres: new Set<string>(),
    sortBy: 'name' as const,
    ratingFor,
  }

  it('sorts by name', () => {
    const names = filterAndSortCollection(collection, base).map(
      (e) => e.game.name
    )
    expect(names).toEqual(['Azul', 'Brass', 'Catan', 'Dune'])
  })

  it('sorts by rating descending, name as tiebreak, unrated last', () => {
    const names = filterAndSortCollection(collection, {
      ...base,
      sortBy: 'rating',
    }).map((e) => e.game.name)
    expect(names).toEqual(['Azul', 'Catan', 'Brass', 'Dune'])
  })

  it('sorts by recency (newest push id first)', () => {
    const ids = filterAndSortCollection(collection, {
      ...base,
      sortBy: 'recent',
    }).map((e) => e.id)
    expect(ids).toEqual(['-g4', '-g3', '-g2', '-g1'])
  })

  it('filters by case-insensitive name substring', () => {
    const names = filterAndSortCollection(collection, {
      ...base,
      text: 'a',
    }).map((e) => e.game.name)
    expect(names).toEqual(['Azul', 'Brass', 'Catan'])
  })

  it('filters by genre (union across selected genres)', () => {
    const names = filterAndSortCollection(collection, {
      ...base,
      genres: new Set(['Economic']),
    }).map((e) => e.game.name)
    expect(names).toEqual(['Brass', 'Catan'])
  })

  it('combines text and genre filters', () => {
    const names = filterAndSortCollection(collection, {
      ...base,
      text: 'c',
      genres: new Set(['Strategy']),
    }).map((e) => e.game.name)
    expect(names).toEqual(['Catan'])
  })

  it('excludes uncategorized games when a genre is selected', () => {
    const names = filterAndSortCollection(collection, {
      ...base,
      genres: new Set(['Strategy']),
    }).map((e) => e.game.name)
    expect(names).not.toContain('Dune')
  })

  it('returns an empty array for a null collection', () => {
    expect(filterAndSortCollection(null, base)).toEqual([])
  })
})

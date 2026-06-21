import type { Game } from '~/helpers/types'

export type CollectionSort = 'name' | 'rating' | 'recent'

// A collection entry paired with its Firebase push-ID key. The list renders
// these directly — an honest ordered array, not an order smuggled through an
// object's key iteration.
export interface CollectionEntry {
  id: string
  game: Game
}

export interface FilterSortOptions {
  text: string
  genres: Set<string>
  sortBy: CollectionSort
  // Resolves a game's rating (0 when unrated). Ratings live in gameOpinions,
  // keyed by BGG game id, so the caller injects the lookup.
  ratingFor: (gameId: string) => number
}

// Distinct genres present across the collection, alphabetized.
export function collectionGenres(
  collection: Record<string, Game> | null
): string[] {
  if (!collection) return []
  const set = new Set<string>()
  for (const game of Object.values(collection))
    game.categories?.forEach((c) => set.add(c))
  return [...set].sort((a, b) => a.localeCompare(b))
}

// Filter by name substring + selected genres, then sort. Returns a new array;
// does not mutate the input.
export function filterAndSortCollection(
  collection: Record<string, Game> | null,
  { text, genres, sortBy, ratingFor }: FilterSortOptions
): CollectionEntry[] {
  if (!collection) return []
  const needle = text.toLowerCase()

  const entries: CollectionEntry[] = Object.entries(collection)
    .filter(([, game]) => {
      if (!game.name.toLowerCase().includes(needle)) return false
      if (genres.size === 0) return true
      return game.categories?.some((c) => genres.has(c)) ?? false
    })
    .map(([id, game]) => ({ id, game }))

  entries.sort((a, b) => {
    if (sortBy === 'name') return a.game.name.localeCompare(b.game.name)
    if (sortBy === 'rating') {
      const diff = ratingFor(b.game.id) - ratingFor(a.game.id)
      return diff !== 0 ? diff : a.game.name.localeCompare(b.game.name)
    }
    // 'recent': Firebase push IDs sort lexicographically by creation time;
    // newest first.
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  })

  return entries
}

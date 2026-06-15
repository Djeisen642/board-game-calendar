import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { useNuxtApp } from 'nuxt/app'
import helpers from '~/helpers/helpers'
import type { BoardGameSearchResult, DisplayableItemType } from '~/helpers/types'
import constants from '~/helpers/constants'

interface BggSearchResult {
  id: string
  type: string
  name: string
  yearpublished: string | null
}

interface BggThingResult {
  id: string
  name: string
  description: string
  image: string
  yearpublished: string | null
  minplayers: string | null
  maxplayers: string | null
  minplaytime: string | null
  maxplaytime: string | null
  minage: string | null
}

export function useBoardGameSearch(
  idsInCollection: Ref<string[]>,
  onError: (error: Error) => void
) {
  const { $functions } = useNuxtApp()
  const searchResults = ref<BoardGameSearchResult[]>([])
  const selectedItem = ref<BoardGameSearchResult | null>(null)
  const searchInput = ref('')
  const isLoading = ref(false)
  const queriedEntries = ref<DisplayableItemType[]>([])
  let searchTimerId: number | undefined

  const entriesToShow = computed(() =>
    queriedEntries.value.map((entry) => ({
      ...entry,
      incollection: idsInCollection.value.includes(entry.id),
    }))
  )

  function resetData() {
    selectedItem.value = null
    searchResults.value = []
    searchInput.value = ''
    queriedEntries.value = []
  }

  function _getEntriesToShow(): BoardGameSearchResult[] {
    const lower = searchInput.value.toLowerCase()
    return selectedItem.value
      ? [selectedItem.value]
      : searchResults.value
          .slice(0)
          .sort((a, b) => {
            if (a.name.toLowerCase().startsWith(lower)) {
              if (b.name.toLowerCase().startsWith(lower)) {
                const lenDiff = a.name.length - b.name.length
                if (lenDiff !== 0) return lenDiff
              } else {
                return -1
              }
            } else if (b.name.toLowerCase().startsWith(lower)) {
              return 1
            }
            return +b.yearpublished - +a.yearpublished
          })
          .slice(0, constants.NumberToShow)
  }

  async function displayEntries() {
    try {
      const entries = _getEntriesToShow()
      const bggThingFn = httpsCallable<{ id: string }, BggThingResult>(
        $functions,
        'bggThing'
      )
      const results = await Promise.all(
        entries.map((entry) => bggThingFn({ id: entry.id }))
      )
      queriedEntries.value = results
        .map((r) => r.data)
        .filter((item): item is BggThingResult => !!item)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: helpers.decodeHtml(item.description),
          image: item.image,
          url: `https://boardgamegeek.com/boardgame/${item.id}`,
          maxplayers: item.maxplayers ?? '',
          maxplaytime: item.maxplaytime ?? '',
          minage: item.minage ?? '',
          minplayers: item.minplayers ?? '',
          minplaytime: item.minplaytime ?? '',
          yearpublished: item.yearpublished ?? '',
          incollection: false,
        }))
    } catch (err) {
      onError(helpers.handleError(err))
    }
  }

  async function fetchResults(input: string) {
    if (isLoading.value || !input || input.length < constants.MinSearchLength) return
    isLoading.value = true
    try {
      const bggSearchFn = httpsCallable<
        { query: string; type: string },
        { items: BggSearchResult[] }
      >($functions, 'bggSearch')

      const result = await bggSearchFn({
        query: input,
        type: constants.BggBoardGameType,
      })

      searchResults.value = (result.data.items ?? []).map((item) => ({
        id: item.id,
        displayname:
          item.name + (item.yearpublished ? ` (${item.yearpublished})` : ''),
        name: item.name,
        yearpublished: item.yearpublished ?? '0',
      }))
    } catch (err) {
      onError(helpers.handleError(err))
    } finally {
      isLoading.value = false
    }
  }

  watch(searchInput, (input) => {
    if (selectedItem.value) return
    clearTimeout(searchTimerId)
    searchTimerId = window.setTimeout(() => {
      fetchResults(input)
    }, constants.DebounceThrottleInMs)
  })

  return {
    searchResults,
    selectedItem,
    searchInput,
    isLoading,
    entriesToShow,
    resetData,
    displayEntries,
  }
}

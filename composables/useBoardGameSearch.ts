import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { Parser } from 'xml2js'
import helpers from '~/helpers/helpers'
import type {
  BoardGameSearchResult,
  DisplayableItemType,
  BoardGameGeekThingItemType,
  BoardGameGeekItemsType,
} from '~/helpers/types'
import constants from '~/helpers/constants'

export function useBoardGameSearch(
  idsInCollection: Ref<string[]>,
  onError: (error: Error) => void
) {
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

  function _getDisplayItemFromSearchResult(
    entry: BoardGameGeekThingItemType
  ): DisplayableItemType | null {
    const item = entry.items.item
    if (!item) return null
    const primaryName = Array.isArray(item.name)
      ? item.name.find((n) => n.$.type === constants.PrimaryNameType)
      : item.name
    if (!primaryName) return null
    return {
      id: item.$.id,
      name: primaryName.$.value,
      description: helpers.decodeHtml(item.description),
      image: item.image,
      url: `https://boardgamegeek.com/boardgame/${item.$.id}`,
      maxplayers: item.maxplayers.$.value,
      maxplaytime: item.maxplaytime.$.value,
      minage: item.minage.$.value,
      minplayers: item.minplayers.$.value,
      minplaytime: item.minplaytime.$.value,
      yearpublished: item.yearpublished.$.value,
      incollection: false,
    }
  }

  async function displayEntries() {
    try {
      const entries = _getEntriesToShow()
      const resultingEntries: BoardGameGeekThingItemType[] = await Promise.all(
        entries.map(async (entry) => {
          const params = new URLSearchParams({ id: entry.id }).toString()
          const url = `${constants.BoardGameGeekBaseUrl}thing?${params}`
          const response = await fetch(url.toString())
          const string = await response.text()
          const parser = new Parser({ explicitArray: false })
          return parser.parseStringPromise(string)
        })
      )
      queriedEntries.value = []
      for (const entry of resultingEntries) {
        const displayable = _getDisplayItemFromSearchResult(entry)
        if (displayable) queriedEntries.value.push(displayable)
      }
    } catch (err) {
      onError(helpers.handleError(err))
    }
  }

  async function fetchResults(input: string) {
    if (isLoading.value || !input || input.length < constants.MinSearchLength) return
    isLoading.value = true
    try {
      const params = new URLSearchParams({
        query: input,
        type: constants.BggBoardGameType,
      }).toString()
      const url = `${constants.BoardGameGeekBaseUrl}search?${params}`
      const response = await fetch(url.toString())
      const string = await response.text()
      const parser = new Parser({ explicitArray: false })
      const json = (await parser.parseStringPromise(string)) as BoardGameGeekItemsType
      if (!json.items.item) {
        searchResults.value = []
        return
      }
      searchResults.value = json.items.item.map((item) => ({
        id: item.$.id,
        displayname:
          item.name.$.value +
          (item.yearpublished ? ` (${item.yearpublished.$.value})` : ''),
        name: item.name.$.value,
        yearpublished: item.yearpublished?.$.value ?? '0',
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

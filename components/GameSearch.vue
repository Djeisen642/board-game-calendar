<template>
  <v-card-text>
    <v-autocomplete
      ref="boardGameSearch"
      v-model="selectedItem"
      :items="searchResults"
      :loading="isLoading"
      :search-input.sync="searchInput"
      item-text="displayname"
      item-value="id"
      label="Board Game Search"
      placeholder="Start typing to search"
      prepend-icon="mdi-database-search"
      return-object
      @blur="displayEntries"
      @keyup.enter="searchEnterPressed"
      @click="resetData"
    />
    <v-list>
      <v-list-item v-for="(item, i) in entriesToShow" :key="i">
        <v-list-item-avatar>
          <v-img :src="item.image" />
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title
            >{{ item.name }} ({{ item.yearpublished }})</v-list-item-title
          >
          <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-row>
            <v-btn
              :disabled="item.incollection"
              @click.stop="addToCollection(item)"
            >
              <v-icon class="mr-3"> mdi-plus-circle </v-icon>Add
            </v-btn>
            <v-btn :href="item.url" target="_blank" class="ml-2">
              <v-icon class="mr-3"> mdi-link </v-icon>Link
            </v-btn>
          </v-row>
        </v-list-item-action>
      </v-list-item>
    </v-list>
    <div v-if="!selectedItem && entriesToShow.length !== searchResults.length">
      To return better search results, please write better searches...
    </div>
  </v-card-text>
</template>
<script lang="ts">
import { Component, Prop, Vue, Watch } from 'nuxt-property-decorator'
import { Parser } from 'xml2js'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import {
  BoardGameSearchResult,
  DisplayableItemType,
  BoardGameGeekThingItemType,
  BoardGameGeekItemsType,
} from '~/helpers/types'
import constants from '~/helpers/constants'

@Component({
  components: { Snackbar },
})
export default class GameSearch extends Vue {
  @Prop({ required: true }) readonly idsInCollection!: string[]
  @Prop({ required: true }) readonly addToCollection!: (
    item: DisplayableItemType
  ) => void

  searchResults: BoardGameSearchResult[] = []

  selectedItem: BoardGameSearchResult | null = null

  searchInput = ''

  isLoading = false

  queriedEntries: DisplayableItemType[] = []

  private _searchTimerId: number | undefined

  $refs!: {
    boardGameSearch: HTMLFormElement
  }

  resetData(): void {
    this.selectedItem = null
    this.searchResults = []
    this.searchInput = ''
    this.queriedEntries = []
  }

  @Watch('selectedItem')
  searchEnterPressed(): void {
    if (!this.searchResults.length) {
      return
    }

    this.$refs.boardGameSearch.blur()
    this.displayEntries()
  }

  get entriesToShow(): DisplayableItemType[] {
    return this.queriedEntries.map((entry) =>
      Object.assign({}, entry, {
        incollection: this.idsInCollection.includes(entry.id),
      })
    )
  }

  async displayEntries(): Promise<void> {
    try {
      const entriesToShow = this._getEntriesToShow()

      const url = new URL('thing', constants.BoardGameGeekBaseUrl)
      const resultingEntries: BoardGameGeekThingItemType[] = await Promise.all(
        entriesToShow.map(async (entry) => {
          url.search = new URLSearchParams({
            id: entry.id,
          }).toString()
          const response = await fetch(url.toString())
          const string = await response.text()
          const parser = new Parser({ explicitArray: false })
          return parser.parseStringPromise(string)
        })
      )
      this.queriedEntries = []
      for (const entry of resultingEntries) {
        const displayableItem = this._getDisplayItemFromSearchResult(entry)
        if (!displayableItem) {
          continue
        }
        this.queriedEntries.push(displayableItem)
      }
    } catch (err) {
      const handledError = helpers.handleError(err)
      this.$emit('error', handledError)
    }
  }

  private _getDisplayItemFromSearchResult(
    entry: BoardGameGeekThingItemType
  ): DisplayableItemType | null {
    const item = entry.items.item
    if (!item) {
      return null
    }
    const primaryName = Array.isArray(item.name)
      ? item.name.find(
          (nameObject) => nameObject.$.type === constants.PrimaryNameType
        )
      : item.name
    if (!primaryName) {
      return null
    }
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

  private _getEntriesToShow(): BoardGameSearchResult[] {
    const searchInputLower = this.searchInput.toLowerCase()
    return this.selectedItem
      ? [this.selectedItem]
      : this.searchResults
          .slice(0)
          .sort((a, b) => {
            if (a.name.toLowerCase().startsWith(searchInputLower)) {
              if (b.name.toLowerCase().startsWith(searchInputLower)) {
                const nameLengthComparison = a.name.length - b.name.length
                if (nameLengthComparison !== 0) {
                  return nameLengthComparison
                }
              } else {
                return -1
              }
            } else if (b.name.toLowerCase().startsWith(searchInputLower)) {
              return 1
            }
            return +b.yearpublished - +a.yearpublished
          })
          .slice(0, constants.NumberToShow)
  }

  @Watch('searchInput')
  onSearchInput(input: string): void {
    if (this.selectedItem) {
      return
    }
    clearTimeout(this._searchTimerId)
    this._searchTimerId = window.setTimeout(() => {
      this.fetchResults(input)
    }, constants.DebounceThrottleInMs)
  }

  async fetchResults(input: string): Promise<void> {
    if (this.isLoading) {
      return
    }
    if (!input) {
      return
    }
    if (input.length <= 3) {
      return
    }
    this.isLoading = true
    try {
      const url = new URL('search', constants.BoardGameGeekBaseUrl)
      url.search = new URLSearchParams({
        query: input,
        type: constants.BggBoardGameType,
      }).toString()
      const response = await fetch(url.toString())
      const string = await response.text()
      const parser = new Parser({ explicitArray: false })
      const json = (await parser.parseStringPromise(
        string
      )) as BoardGameGeekItemsType
      if (!json.items.item) {
        this.searchResults = []
        return
      }
      this.searchResults = json.items.item.map((item) => {
        return {
          id: item.$.id,
          displayname:
            item.name.$.value +
            (item.yearpublished ? ` (${item.yearpublished.$.value})` : ''),
          name: item.name.$.value,
          yearpublished: item.yearpublished?.$.value || '0',
        }
      })
    } catch (err) {
      const handledError = helpers.handleError(err)
      this.$emit('error', handledError)
    } finally {
      this.isLoading = false
    }
  }
}
</script>

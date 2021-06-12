<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <v-row
            class="pa-3"
          >
            <h3>Game Collection</h3>
            <v-spacer />
            <v-btn
              @click.stop="toggleAddArea"
            >
              <v-icon class="mr-3">
                {{ collectionAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle' }}
              </v-icon>{{ collectionAreaOpen ? 'Add' : 'Back' }}
            </v-btn>
          </v-row>
        </v-card-title>
        <v-card-text
          v-if="collectionAreaOpen"
        >
          <v-list>
            <v-list-item
              v-for="(item, id) in collection"
              :key="id"
            >
              <v-list-item-content>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-rating
                  v-model="item.rating"
                  half-increments
                  hover
                  large
                  @input="changeRating(id, item)"
                />
                <v-btn
                  @click.stop="removeGameFromCollection(id)"
                >
                  <v-icon class="mr-3">
                    mdi-minus-circle
                  </v-icon>Remove
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
          <h4
            v-if="!collection"
          >
            No Games in Collection. Please add games!
          </h4>
        </v-card-text>
        <v-card-text
          v-else
        >
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
            <v-list-item
              v-for="(item, i) in entriesToShow"
              :key="i"
            >
              <v-list-item-avatar>
                <v-img :src="item.image" />
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title>{{ item.name }} ({{ item.yearpublished }})</v-list-item-title>
                <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <v-row>
                  <v-btn
                    :disabled="item.incollection"
                    @click.stop="addToCollection(item)"
                  >
                    <v-icon class="mr-3">
                      mdi-plus-circle
                    </v-icon>Add
                  </v-btn>
                  <v-btn
                    :href="item.url"
                    target="_blank"
                    class="ml-2"
                  >
                    <v-icon class="mr-3">
                      mdi-link
                    </v-icon>Link
                  </v-btn>
                </v-row>
              </v-list-item-action>
            </v-list-item>
          </v-list>
          <div
            v-if="!selectedItem && entriesToShow.length !== searchResults.length"
          >
            To return better search results, please write better searches...
          </div>
        </v-card-text>
      </v-card>
    </v-col>
    <Snackbar
      ref="snackbar"
    />
  </v-row>
</template>
<script lang="ts">
// TODO this file is atrocious!!!
import queryString from 'querystring'
import { Component, State, Vue, Watch } from 'nuxt-property-decorator'
import firebase from 'firebase/app'
import { Parser } from 'xml2js'
import { db, log, LogLevel } from '~/plugins/firebase'
import Snackbar from '~/components/Snackbar.vue'
import { NuxtHeadType } from '~/constants/types'

export type Game = {
  id:string
  name:string
  rating?:number
  privateNote?:string
  publicNote?:string
}

export type DisplayableItemType = {
  id:string
  name:string
  description:string
  image:string
  url:string
  maxplayers:string
  maxplaytime:string
  minage:string
  minplayers:string
  minplaytime:string
  yearpublished:string
  incollection:boolean
}

export type BoardGameGeekThingItemType = {
  items: {
    item?: {
      $: {
        type:string
        id:string
      }
      description:string
      image:string
      maxplayers: {
        $: {
          value:string
        }
      }
      maxplaytime: {
        $: {
          value:string
        }
      }
      minage: {
        $: {
          value:string
        }
      }
      minplayers: {
        $: {
          value:string
        }
      }
      minplaytime: {
        $: {
          value:string
        }
      }
      yearpublished: {
        $: {
          value: string
        }
      }
      name: {
        $: {
          type:string
          value:string
        }
      }[]|{
        $: {
          type:string
          value:string
        }
      }
    }
  }
}

export type BoardGameGeekSearchItemType = {
  $: {
    id: string
    type: string
  }
  name: {
    $: {
      type: string
      value: string
    }
  }
  yearpublished?: {
    $: {
      value: string
    }
  }
}

export type BoardGameGeekItemsType = {
  items: {
    item?:BoardGameGeekSearchItemType[]
  }
}
export type BoardGameSearchResult = {
  id:string
  name:string
  displayname:string
  yearpublished:string
}

export const settings = {
  BoardGameGeekBaseUrl: 'https://www.boardgamegeek.com/xmlapi2/',
  BggBoardGameType: 'boardgame',
  DebounceThrottleInMs: 500,
  NumberToShow: 10,
  PrimaryNameType: 'primary'
}

@Component({
  components: { Snackbar }
})
export default class GameCollection extends Vue {
  @State('user')
  user!:firebase.User

  collection:Record<string, Game>|null = null;

  collectionAreaOpen = true

  searchResults:BoardGameSearchResult[] = [];

  selectedItem:BoardGameSearchResult|null = null

  searchInput = ''

  isLoading = false

  private _searchTimerId:number|undefined;

  queriedEntries:DisplayableItemType[] = []

  $refs!: {
    boardGameSearch: HTMLFormElement
    snackbar: Snackbar
  }

  static route = '/gamecollection'

  static title = 'Game Collection'

  created ():void {
    const collectionRef = db.ref(`users/${this.user.uid}/collection`)
    collectionRef.on('value', (snapshot) => {
      this.collection = snapshot.val()
    })
  }

  head ():NuxtHeadType {
    return {
      title: GameCollection.title
    }
  }

  async addToCollection (item:DisplayableItemType):Promise<void> {
    const collectionRef = db.ref(`users/${this.user.uid}/collection`)
    await collectionRef.push().set({
      id: item.id,
      name: item.name
    })
  }

  async changeRating (id:string, item:Game):Promise<void> {
    const gameRef = db.ref(`users/${this.user.uid}/collection/${id}`)
    await gameRef.update(item)
  }

  async removeGameFromCollection (id:string):Promise<void> {
    const gameRef = db.ref(`users/${this.user.uid}/collection/${id}`)
    await gameRef.remove()
  }

  toggleAddArea ():void {
    this.collectionAreaOpen = !this.collectionAreaOpen
    this.resetData()
  }

  resetData (): void {
    this.selectedItem = null
    this.searchResults = []
    this.searchInput = ''
    this.queriedEntries = []
  }

  @Watch('selectedItem')
  searchEnterPressed ():void {
    if (!this.searchResults.length) { return }

    this.$refs.boardGameSearch.blur()
    this.displayEntries()
  }

  get entriesToShow ():DisplayableItemType[] {
    const idsInCollection:string[] = []
    if (this.collection) {
      for (const [, entry] of Object.entries(this.collection)) {
        idsInCollection.push(entry.id)
      }
    }
    return this.queriedEntries.map(entry => Object.assign({}, entry, {
      incollection: idsInCollection.includes(entry.id)
    }))
  }

  async displayEntries ():Promise<void> {
    try {
      const searchInputLower = this.searchInput.toLowerCase()
      const entriesToShow = this.selectedItem
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
            return (+b.yearpublished) - (+a.yearpublished)
          })
          .slice(0, settings.NumberToShow)

      const url = new URL('thing', settings.BoardGameGeekBaseUrl)
      const resultingEntries:BoardGameGeekThingItemType[] = await Promise.all(entriesToShow.map(async (entry) => {
        url.search = queryString.stringify({
          id: entry.id
        })
        const response = await fetch(url.toString())
        const string = await response.text()
        const parser = new Parser({ explicitArray: false })
        return parser.parseStringPromise(string)
      }))
      this.queriedEntries = []
      for (const entry of resultingEntries) {
        const item = entry.items.item
        if (!item) { continue }
        const primaryName = Array.isArray(item.name)
          ? item.name.find(nameObject => nameObject.$.type === settings.PrimaryNameType)
          : item.name
        if (!primaryName) { continue }
        this.queriedEntries.push({
          id: item.$.id,
          name: primaryName.$.value,
          description: GameCollection._decodeHtml(item.description),
          image: item.image,
          url: `https://boardgamegeek.com/boardgame/${item.$.id}`,
          maxplayers: item.maxplayers.$.value,
          maxplaytime: item.maxplaytime.$.value,
          minage: item.minage.$.value,
          minplayers: item.minplayers.$.value,
          minplaytime: item.minplaytime.$.value,
          yearpublished: item.yearpublished.$.value,
          incollection: false
        })
      }
    } catch (err) {
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    }
  }

  private static _decodeHtml (string:string) {
    const txt = document.createElement('textarea')
    txt.innerHTML = string
    return txt.value
  }

  @Watch('searchInput')
  onSearchInput (input:string):void {
    if (this.selectedItem) { return }
    clearTimeout(this._searchTimerId)
    this._searchTimerId = window.setTimeout(() => {
      this.fetchResults(input)
    }, settings.DebounceThrottleInMs)
  }

  async fetchResults (input:string):Promise<void> {
    if (this.isLoading) { return }
    if (!input) { return }
    if (input.length <= 3) { return }
    this.isLoading = true
    try {
      const url = new URL('search', settings.BoardGameGeekBaseUrl)
      url.search = queryString.stringify({
        query: input,
        type: settings.BggBoardGameType
      })
      const response = await fetch(url.toString())
      const string = await response.text()
      const parser = new Parser({ explicitArray: false })
      const json = await parser.parseStringPromise(string) as BoardGameGeekItemsType
      if (!json.items.item) {
        this.searchResults = []
        return
      }
      this.searchResults = json.items.item.map((item) => {
        return {
          id: item.$.id,
          displayname: item.name.$.value + (item.yearpublished ? ` (${item.yearpublished.$.value})` : ''),
          name: item.name.$.value,
          yearpublished: item.yearpublished?.$.value || '0'
        }
      })
    } catch (err) {
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    } finally {
      this.isLoading = false
    }
  }
}
</script>

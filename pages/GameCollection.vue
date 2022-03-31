<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <v-row
            class="pa-3"
          >
            <h3>{{ collectionAreaOpen ? 'Game Collection' : 'Game Search' }}</h3>
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
        <v-card-text>
          <div
            v-if="collectionAreaOpen"
          >
            <v-text-field v-model="filterGames" label="Filter Games" />
            <v-list>
              <v-list-item
                v-for="(item, id) in gamesMatchingFilter"
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
                    dense
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
          </div>
          <GameSearch v-else :ids-in-collection="idsInCollection" :add-to-collection="addToCollection" @error="onGameSearchError" />
        </v-card-text>
      </v-card>
    </v-col>
    <Snackbar
      ref="snackbar"
    />
  </v-row>
</template>
<script lang="ts">
import firebase from 'firebase/app'
import { Component, State, Vue } from 'nuxt-property-decorator'
import GameSearch from '~/components/GameSearch.vue'
import Snackbar from '~/components/Snackbar.vue'
import { DisplayableItemType, Game, NuxtHeadType } from '~/helpers/types'
import { db } from '~/plugins/firebase'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

export const settings = {
  BoardGameGeekBaseUrl: 'https://www.boardgamegeek.com/xmlapi2/',
  BggBoardGameType: 'boardgame',
  DebounceThrottleInMs: 500,
  NumberToShow: 10,
  PrimaryNameType: 'primary'
}

@Component({
  components: { Snackbar, GameSearch }
})
export default class GameCollection extends Vue {
  static route = routes.gameCollection
  static routeName = names.gameCollection
  static title = 'Game Collection'

  @State('user')
  user!:firebase.User

  collection:Record<string, Game>|null = null;

  collectionAreaOpen = true

  filterGames = ''

  $refs!: {
    boardGameSearch: HTMLFormElement
    snackbar: Snackbar
  }

  get gamesMatchingFilter ():Record<string, Game> {
    if (!this.collection) {
      return {}
    }
    const filteredCollection:Record<string, Game> = {}
    for (const [key, game] of Object.entries(this.collection)) {
      if (game.name.toLowerCase().includes(this.filterGames.toLowerCase())) {
        filteredCollection[key] = game
      }
    }
    return filteredCollection
  }

  get idsInCollection ():string[] {
    if (!this.collection) {
      return []
    }
    return Object.entries(this.collection).map(([, game]) => {
      return game.id
    })
  }

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
  }

  onGameSearchError (error:Error):void {
    this.$refs.snackbar.showSnackbarWithMessage(error.message, true)
  }
}
</script>

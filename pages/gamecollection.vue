<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <v-row class="pa-3">
            <h3>
              {{ collectionAreaOpen ? 'Game Collection' : 'Game Search' }}
            </h3>
            <v-spacer />
            <v-btn @click.stop="toggleAddArea">
              <v-icon start>
                {{
                  collectionAreaOpen
                    ? 'mdi-plus-circle'
                    : 'mdi-arrow-left-circle'
                }}
              </v-icon>
              {{ collectionAreaOpen ? 'Add' : 'Back' }}
            </v-btn>
          </v-row>
        </v-card-title>
        <v-card-text>
          <div v-if="loading">
            <v-progress-linear indeterminate color="primary" />
          </div>
          <div v-else-if="collectionAreaOpen">
            <h4 v-if="!collection">
              No Games in Collection. Please add games!
            </h4>
            <div v-else>
              <v-text-field v-model="filterGames" label="Filter Games" />
              <v-list>
                <v-list-item
                  v-for="(item, id) in gamesMatchingFilter"
                  :key="id"
                  :title="item.name"
                >
                  <template #append>
                    <div class="d-flex flex-column align-end gap-2">
                      <v-rating
                        v-model="item.rating"
                        half-increments
                        hover
                        size="small"
                        @update:model-value="changeRating(id, item)"
                      />
                      <v-btn
                        density="compact"
                        size="small"
                        @click.stop="removeGameFromCollection(id)"
                      >
                        <v-icon start>mdi-minus-circle</v-icon>Remove
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>
          <GameSearch
            v-else
            :ids-in-collection="idsInCollection"
            :add-to-collection="addToCollection"
            @error="onGameSearchError"
          />
        </v-card-text>
      </v-card>
    </v-col>
    <Snackbar ref="snackbar" />
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ref as dbRef,
  onValue,
  push,
  set,
  update,
  remove,
} from 'firebase/database'
import { useNuxtApp } from '#app'
import Snackbar from '~/components/Snackbar.vue'
import GameSearch from '~/components/GameSearch.vue'
import type { DisplayableItemType, Game } from '~/helpers/types'
import constants from '~/helpers/constants'

useHead({ title: 'Game Collection' })

const userStore = useUserStore()
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const collection = ref<Record<string, Game> | null>(null)
const collectionAreaOpen = ref(true)
const filterGames = ref('')
const loading = ref(true)
let unsubscribe: (() => void) | null = null

const nuxtApp = useNuxtApp()
const db = (nuxtApp as any).$db

const gamesMatchingFilter = computed<Record<string, Game>>(() => {
  if (!collection.value) return {}
  const result: Record<string, Game> = {}
  for (const [key, game] of Object.entries(collection.value)) {
    if (game.name.toLowerCase().includes(filterGames.value.toLowerCase())) {
      result[key] = game
    }
  }
  return result
})

const idsInCollection = computed(() =>
  collection.value ? Object.values(collection.value).map((game) => game.id) : []
)

onMounted(() => {
  const collectionRef = dbRef(db, `users/${userStore.user!.uid}/collection`)
  unsubscribe = onValue(collectionRef, (snapshot) => {
    collection.value = snapshot.val()
    loading.value = false
  })
  setTimeout(() => {
    loading.value = false
  }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => {
  unsubscribe?.()
})

function toggleAddArea() {
  collectionAreaOpen.value = !collectionAreaOpen.value
}

async function addToCollection(item: DisplayableItemType) {
  const collectionRef = dbRef(db, `users/${userStore.user!.uid}/collection`)
  await set(push(collectionRef), { id: item.id, name: item.name })
}

async function changeRating(id: string, item: Game) {
  await update(dbRef(db, `users/${userStore.user!.uid}/collection/${id}`), item)
}

async function removeGameFromCollection(id: string) {
  await remove(dbRef(db, `users/${userStore.user!.uid}/collection/${id}`))
}

function onGameSearchError(error: Error) {
  snackbar.value?.showSnackbarWithMessage(error.message, true)
}
</script>

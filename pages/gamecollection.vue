<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="7">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-rhombus-split</v-icon>
          <span class="page-title">{{ collectionAreaOpen ? 'Game Collection' : 'Game Search' }}</span>
          <v-spacer />
          <v-btn variant="elevated" color="primary" size="small" @click.stop="toggleAddArea">
            <v-icon start>{{ collectionAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle' }}</v-icon>
            {{ collectionAreaOpen ? 'Add' : 'Back' }}
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <div v-if="loading">
            <v-progress-linear indeterminate color="primary" />
          </div>
          <div v-else-if="collectionAreaOpen">
            <div v-if="!collection" class="empty-state">
              <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-cards-outline</v-icon>
              <div class="empty-title">No games yet</div>
              <div class="empty-desc">Add games from BoardGameGeek to build your collection.</div>
              <v-btn variant="elevated" color="primary" class="mt-4" @click.stop="toggleAddArea">
                <v-icon start>mdi-plus-circle</v-icon>Add Games
              </v-btn>
            </div>
            <div v-else>
              <v-text-field v-model="filterGames" label="Filter Games" prepend-inner-icon="mdi-magnify" clearable class="mb-4" />
              <v-list>
                <v-list-item v-for="(item, id) in gamesMatchingFilter" :key="id" :title="item.name" class="game-item mb-2">
                  <template #append>
                    <div class="d-flex flex-column align-end gap-2">
                      <v-rating v-model="item.rating" half-increments hover size="small" color="secondary" active-color="secondary" @update:model-value="changeRating(id, item)" />
                      <v-btn density="compact" size="small" variant="text" color="error" @click.stop="removeGameFromCollection(id)">
                        <v-icon start>mdi-minus-circle</v-icon>Remove
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>
          <GameSearch v-else :ids-in-collection="idsInCollection" :add-to-collection="addToCollection" @error="onGameSearchError" />
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, push, set, update, remove } from 'firebase/database'
import Snackbar from '~/components/Snackbar.vue'
import GameSearch from '~/components/GameSearch.vue'
import helpers from '~/helpers/helpers'
import type { DisplayableItemType, Game } from '~/helpers/types'
import constants from '~/helpers/constants'

useHead({ title: 'Game Collection' })

const userStore = useUserStore()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const collection = ref<Record<string, Game> | null>(null)
const collectionAreaOpen = ref(true)
// clearable text fields set the model to null
const filterGames = ref<string | null>('')
const loading = ref(true)
let unsubscribe: (() => void) | null = null



const gamesMatchingFilter = computed<Record<string, Game>>(() => {
  if (!collection.value) return {}
  const filter = (filterGames.value ?? '').toLowerCase()
  const result: Record<string, Game> = {}
  for (const [key, game] of Object.entries(collection.value)) {
    if (game.name.toLowerCase().includes(filter)) result[key] = game
  }
  return result
})

const idsInCollection = computed(() => collection.value ? Object.values(collection.value).map((game) => game.id) : [])

onMounted(() => {
  const collectionRef = dbRef(db, `users/${userStore.user!.uid}/collection`)
  unsubscribe = onValue(collectionRef, (snapshot) => { collection.value = snapshot.val(); loading.value = false }, (err) => {
    loading.value = false
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.() })

function toggleAddArea() { collectionAreaOpen.value = !collectionAreaOpen.value }

async function addToCollection(item: DisplayableItemType) {
  try {
    const collectionRef = dbRef(db, `users/${userStore.user!.uid}/collection`)
    await set(push(collectionRef), { id: item.id, name: item.name })
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function changeRating(id: string, item: Game) {
  try { await update(dbRef(db, `users/${userStore.user!.uid}/collection/${id}`), item) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function removeGameFromCollection(id: string) {
  try { await remove(dbRef(db, `users/${userStore.user!.uid}/collection/${id}`)) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

function onGameSearchError(error: Error) { snackbar.value?.showSnackbarWithMessage(error.message, true) }
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.35rem; font-weight: 600; color: rgba(205,214,244,0.95); }
.empty-desc { font-size: 1rem; color: rgba(205,214,244,0.75); margin-top: 8px; }
.game-item { border-radius: 12px; transition: background 0.2s ease; }
.game-item:hover { background: rgba(108,92,231,0.06); }
</style>

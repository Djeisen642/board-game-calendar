<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="7">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-rhombus-split</v-icon>
          <span class="page-title">{{ pageTitle }}</span>
          <v-spacer />
          <template v-if="isFriendView">
            <v-btn :to="routes.friends" variant="elevated" color="primary" size="small">
              <v-icon start>mdi-arrow-left-circle</v-icon>Back
            </v-btn>
          </template>
          <template v-else-if="activeArea === 'collection'">
            <v-btn variant="elevated" color="primary" size="small" class="mr-2" @click.stop="activeArea = 'addGame'">
              <v-icon start>mdi-plus-circle</v-icon>Add Game
            </v-btn>
            <v-btn variant="elevated" color="secondary" size="small" @click.stop="openRateArea">
              <v-icon start>mdi-star-outline</v-icon>Rate
            </v-btn>
          </template>
          <v-btn v-else variant="elevated" color="primary" size="small" @click.stop="activeArea = 'collection'">
            <v-icon start>mdi-arrow-left-circle</v-icon>Back
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <div v-if="loading">
            <v-progress-linear indeterminate color="primary" />
          </div>

          <!-- Collection list (owner or friend) -->
          <div v-else-if="activeArea === 'collection'">
            <div v-if="!collection" class="empty-state">
              <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-cards-outline</v-icon>
              <div class="empty-title">No games yet</div>
              <div v-if="!isFriendView" class="empty-desc">Add games from BoardGameGeek to build your collection.</div>
              <div v-else class="empty-desc">This friend hasn't added any games yet.</div>
              <v-btn v-if="!isFriendView" variant="elevated" color="primary" class="mt-4" @click.stop="activeArea = 'addGame'">
                <v-icon start>mdi-plus-circle</v-icon>Add Games
              </v-btn>
            </div>
            <div v-else>
              <v-text-field v-model="filterGames" label="Filter Games" prepend-inner-icon="mdi-magnify" clearable class="mb-4" />
              <v-list>
                <template v-for="(item, id) in gamesMatchingFilter" :key="id">
                  <v-list-item :title="item.name" class="game-item mb-2">
                    <template #append>
                      <div class="d-flex flex-column align-end gap-1">
                        <v-rating
                          v-if="!isFriendView"
                          :model-value="opinions[item.id]?.rating ?? 0"
                          half-increments
                          hover
                          size="small"
                          color="secondary"
                          active-color="secondary"
                          @update:model-value="(val) => updateGameRating(item, val)"
                        />
                        <div class="d-flex gap-1">
                          <v-btn
                            v-if="!isFriendView"
                            density="compact"
                            size="small"
                            variant="text"
                            :color="expandedItems.has(String(id)) ? 'primary' : 'default'"
                            @click.stop="toggleExpanded(String(id))"
                          >
                            <v-icon>mdi-note-text-outline</v-icon>
                          </v-btn>
                          <v-btn
                            v-if="!isFriendView"
                            density="compact"
                            size="small"
                            variant="text"
                            color="error"
                            @click.stop="removeGameFromCollection(String(id))"
                          >
                            <v-icon start>mdi-minus-circle</v-icon>Remove
                          </v-btn>
                        </div>
                      </div>
                    </template>
                  </v-list-item>
                  <v-list-item v-if="!isFriendView && expandedItems.has(String(id))" class="px-4 pb-2">
                    <v-textarea
                      :model-value="opinions[item.id]?.privateNote ?? ''"
                      label="Private Note"
                      variant="outlined"
                      density="compact"
                      rows="2"
                      hide-details
                      @blur="(e: FocusEvent) => updateGameNote(item, (e.target as HTMLTextAreaElement).value)"
                    />
                  </v-list-item>
                </template>
              </v-list>
            </div>

            <!-- Also Rated: games with opinions but not in collection (owner only) -->
            <template v-if="!isFriendView && alsoRatedGames.length">
              <v-divider class="my-4" />
              <div class="section-label mb-3">Also Rated</div>
              <v-list>
                <template v-for="entry in alsoRatedGames" :key="entry.gameId">
                  <v-list-item :title="entry.name" class="game-item mb-2">
                    <template #append>
                      <div class="d-flex flex-column align-end gap-1">
                        <v-rating
                          :model-value="entry.rating ?? 0"
                          half-increments
                          hover
                          size="small"
                          color="secondary"
                          active-color="secondary"
                          @update:model-value="(val) => updateOpinionRating(entry.gameId, entry.name, val)"
                        />
                        <div class="d-flex gap-1">
                          <v-btn
                            density="compact"
                            size="small"
                            variant="text"
                            :color="expandedItems.has(entry.gameId) ? 'primary' : 'default'"
                            @click.stop="toggleExpanded(entry.gameId)"
                          >
                            <v-icon>mdi-note-text-outline</v-icon>
                          </v-btn>
                          <v-btn density="compact" size="small" variant="text" color="success" @click.stop="addOpinionGameToCollection(entry)">
                            <v-icon start>mdi-plus-circle</v-icon>Add
                          </v-btn>
                          <v-btn density="compact" size="small" variant="text" color="error" @click.stop="deleteOpinion(entry.gameId)">
                            <v-icon>mdi-delete-outline</v-icon>
                          </v-btn>
                        </div>
                      </div>
                    </template>
                  </v-list-item>
                  <v-list-item v-if="expandedItems.has(entry.gameId)" class="px-4 pb-2">
                    <v-textarea
                      :model-value="entry.privateNote ?? ''"
                      label="Private Note"
                      variant="outlined"
                      density="compact"
                      rows="2"
                      hide-details
                      @blur="(e: FocusEvent) => updateOpinionNote(entry.gameId, entry.name, (e.target as HTMLTextAreaElement).value)"
                    />
                  </v-list-item>
                </template>
              </v-list>
            </template>
          </div>

          <!-- Add to collection search (owner only) -->
          <GameSearch
            v-else-if="activeArea === 'addGame'"
            :ids-in-collection="idsInCollection"
            :add-to-collection="addToCollection"
            @error="onGameSearchError"
          />

          <!-- Rate a game search (owner only) -->
          <div v-else-if="activeArea === 'addOpinion'">
            <v-autocomplete
              v-model="opinionSelectedItem"
              v-model:search="opinionSearchInput"
              :items="opinionSearchItems"
              :loading="opinionSearchLoading"
              item-title="displayname"
              item-value="id"
              label="Board Game Search"
              placeholder="Start typing to search"
              :hint="`Type at least ${constants.MinSearchLength} characters`"
              prepend-icon="mdi-database-search"
              return-object
              class="mb-4"
              @click="opinionSelectedItem = null"
            />
            <v-card v-if="opinionSelectedItem" variant="outlined" class="pa-4">
              <div class="d-flex align-center mb-3">
                <span class="font-weight-medium">{{ opinionSelectedItem.name }}</span>
                <v-spacer />
                <v-btn size="small" icon variant="text" @click.stop="opinionSelectedItem = null">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
              <v-rating
                v-model="pendingRating"
                half-increments
                hover
                size="small"
                color="secondary"
                active-color="secondary"
                class="mb-3"
              />
              <v-textarea
                v-model="pendingNote"
                label="Private Note"
                variant="outlined"
                density="compact"
                rows="3"
                hide-details
                class="mb-3"
              />
              <div class="d-flex gap-2">
                <v-btn color="primary" size="small" @click.stop="saveOpinionEntry">Save</v-btn>
                <v-btn variant="text" size="small" @click.stop="opinionSelectedItem = null">Cancel</v-btn>
                <v-spacer />
                <v-btn
                  v-if="opinionSelectedItem && !idsInCollection.includes(opinionSelectedItem.id)"
                  color="success"
                  size="small"
                  @click.stop="addSelectedOpinionGameToCollection"
                >
                  <v-icon start>mdi-plus-circle</v-icon>Add to Collection
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, push, set, remove, get } from 'firebase/database'
import { Parser } from 'xml2js'
import Snackbar from '~/components/Snackbar.vue'
import GameSearch from '~/components/GameSearch.vue'
import helpers from '~/helpers/helpers'
import routes from '~/helpers/routes'
import type { DisplayableItemType, Game, GameOpinion, BoardGameSearchResult, BoardGameGeekItemsType } from '~/helpers/types'
import constants from '~/helpers/constants'

useHead({ title: 'Game Collection' })

type ActiveArea = 'collection' | 'addGame' | 'addOpinion'

const route = useRoute()
const userStore = useUserStore()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)

const ownUid = userStore.user!.uid
const viewingUid = computed(() => (route.query.uid as string | undefined) ?? ownUid)
const isFriendView = computed(() => viewingUid.value !== ownUid)

const friendName = ref('')
const collection = ref<Record<string, Game> | null>(null)
const opinions = ref<Record<string, GameOpinion>>({})
const loading = ref(true)
const filterGames = ref<string | null>('')
const activeArea = ref<ActiveArea>('collection')
const expandedItems = ref(new Set<string>())

let unsubCollection: (() => void) | null = null
let unsubOpinions: (() => void) | null = null

const pageTitle = computed(() => {
  if (isFriendView.value) return friendName.value ? `${friendName.value}'s Collection` : 'Collection'
  if (activeArea.value === 'addGame') return 'Add Game'
  if (activeArea.value === 'addOpinion') return 'Rate a Game'
  return 'Game Collection'
})

const gamesMatchingFilter = computed<Record<string, Game>>(() => {
  if (!collection.value) return {}
  const filter = (filterGames.value ?? '').toLowerCase()
  const result: Record<string, Game> = {}
  for (const [key, game] of Object.entries(collection.value)) {
    if (game.name.toLowerCase().includes(filter)) result[key] = game
  }
  return result
})

const idsInCollection = computed(() =>
  collection.value ? Object.values(collection.value).map((g) => g.id) : []
)

const alsoRatedGames = computed(() => {
  const inCollection = new Set(idsInCollection.value)
  return Object.entries(opinions.value)
    .filter(([gameId]) => !inCollection.has(gameId))
    .map(([gameId, op]) => ({ gameId, ...op }))
})

// --- Opinion search state ---
const opinionSearchItems = ref<BoardGameSearchResult[]>([])
const opinionSearchLoading = ref(false)
const opinionSelectedItem = ref<BoardGameSearchResult | null>(null)
const opinionSearchInput = ref('')
const pendingRating = ref(0)
const pendingNote = ref('')
let opinionSearchTimer: number | undefined

watch(opinionSearchInput, (input) => {
  if (opinionSelectedItem.value) return
  clearTimeout(opinionSearchTimer)
  opinionSearchTimer = window.setTimeout(() => fetchOpinionSearch(input), constants.DebounceThrottleInMs)
})

watch(opinionSelectedItem, (item) => {
  if (!item) return
  const existing = opinions.value[item.id]
  pendingRating.value = existing?.rating ?? 0
  pendingNote.value = existing?.privateNote ?? ''
})

async function fetchOpinionSearch(input: string) {
  if (!input || input.length < constants.MinSearchLength) { opinionSearchItems.value = []; return }
  opinionSearchLoading.value = true
  try {
    const params = new URLSearchParams({ query: input, type: constants.BggBoardGameType })
    const response = await fetch(`${constants.BoardGameGeekBaseUrl}search?${params}`)
    const text = await response.text()
    const parser = new Parser({ explicitArray: false })
    const json = (await parser.parseStringPromise(text)) as BoardGameGeekItemsType
    opinionSearchItems.value = json.items.item
      ? json.items.item.map((item) => ({
          id: item.$.id,
          name: item.name.$.value,
          displayname: item.name.$.value + (item.yearpublished ? ` (${item.yearpublished.$.value})` : ''),
          yearpublished: item.yearpublished?.$.value ?? '0',
        }))
      : []
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  } finally {
    opinionSearchLoading.value = false
  }
}

onMounted(async () => {
  if (isFriendView.value) {
    try {
      const snap = await get(dbRef(db, `profiles/${viewingUid.value}/name`))
      friendName.value = snap.val() ?? 'Friend'
    } catch {
      friendName.value = 'Friend'
    }
  }

  const collRef = dbRef(db, `users/${viewingUid.value}/collection`)
  unsubCollection = onValue(
    collRef,
    (snapshot) => { collection.value = snapshot.val(); loading.value = false },
    (err) => { loading.value = false; snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
  )

  if (!isFriendView.value) {
    const opRef = dbRef(db, `users/${ownUid}/gameOpinions`)
    unsubOpinions = onValue(opRef, (snapshot) => { opinions.value = snapshot.val() ?? {} })
  }

  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubCollection?.(); unsubOpinions?.() })

function toggleExpanded(id: string) {
  const next = new Set(expandedItems.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedItems.value = next
}

function openRateArea() {
  opinionSelectedItem.value = null
  opinionSearchInput.value = ''
  opinionSearchItems.value = []
  pendingRating.value = 0
  pendingNote.value = ''
  activeArea.value = 'addOpinion'
}

async function addToCollection(item: DisplayableItemType) {
  try {
    const collRef = dbRef(db, `users/${ownUid}/collection`)
    await set(push(collRef), { id: item.id, name: item.name })
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function removeGameFromCollection(id: string) {
  try { await remove(dbRef(db, `users/${ownUid}/collection/${id}`)) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function persistOpinion(gameId: string, name: string, rating: number, privateNote: string) {
  const hasRating = rating > 0
  const hasNote = privateNote.trim() !== ''
  if (!hasRating && !hasNote) {
    if (opinions.value[gameId]) await remove(dbRef(db, `users/${ownUid}/gameOpinions/${gameId}`))
    return
  }
  const payload: Record<string, unknown> = { name }
  if (hasRating) payload.rating = rating
  if (hasNote) payload.privateNote = privateNote.trim()
  await set(dbRef(db, `users/${ownUid}/gameOpinions/${gameId}`), payload)
}

async function updateGameRating(game: Game, rating: number) {
  try {
    const existing = opinions.value[game.id]
    await persistOpinion(game.id, game.name, rating, existing?.privateNote ?? '')
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function updateGameNote(game: Game, note: string) {
  try {
    const existing = opinions.value[game.id]
    await persistOpinion(game.id, game.name, existing?.rating ?? 0, note)
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function updateOpinionRating(gameId: string, name: string, rating: number) {
  try {
    const existing = opinions.value[gameId]
    await persistOpinion(gameId, name, rating, existing?.privateNote ?? '')
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function updateOpinionNote(gameId: string, name: string, note: string) {
  try {
    const existing = opinions.value[gameId]
    await persistOpinion(gameId, name, existing?.rating ?? 0, note)
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function deleteOpinion(gameId: string) {
  try { await remove(dbRef(db, `users/${ownUid}/gameOpinions/${gameId}`)) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function addOpinionGameToCollection(entry: { gameId: string; name: string }) {
  try {
    const collRef = dbRef(db, `users/${ownUid}/collection`)
    await set(push(collRef), { id: entry.gameId, name: entry.name })
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function saveOpinionEntry() {
  if (!opinionSelectedItem.value) return
  try {
    await persistOpinion(opinionSelectedItem.value.id, opinionSelectedItem.value.name, pendingRating.value, pendingNote.value)
    opinionSelectedItem.value = null
    activeArea.value = 'collection'
    snackbar.value?.showSnackbarWithMessage('Opinion saved', false)
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function addSelectedOpinionGameToCollection() {
  if (!opinionSelectedItem.value) return
  try {
    const collRef = dbRef(db, `users/${ownUid}/collection`)
    await set(push(collRef), { id: opinionSelectedItem.value.id, name: opinionSelectedItem.value.name })
    opinionSelectedItem.value = null
    activeArea.value = 'collection'
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

function onGameSearchError(error: Error) { snackbar.value?.showSnackbarWithMessage(error.message, true) }
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.35rem; font-weight: 600; color: rgba(205,214,244,0.95); }
.empty-desc { font-size: 1rem; color: rgba(205,214,244,0.75); margin-top: 8px; }
.section-label { font-size: 0.875rem; color: rgba(205,214,244,0.7); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
.game-item { border-radius: 12px; transition: background 0.2s ease; }
.game-item:hover { background: rgba(108,92,231,0.06); }
</style>

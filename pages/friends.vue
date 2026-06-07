<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="6">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-account-group</v-icon>
          <span class="page-title">Friends</span>
          <v-spacer />
          <v-btn variant="elevated" color="primary" size="small" @click.stop="toggleAddArea">
            <v-icon start>{{ friendsAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle' }}</v-icon>
            {{ friendsAreaOpen ? 'Add' : 'Back' }}
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="loading" class="pa-8">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="friendsAreaOpen" class="pa-6">
          <div v-if="!friends.length" class="empty-state">
            <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-account-multiple-plus-outline</v-icon>
            <div class="empty-title">No friends yet</div>
            <div class="empty-desc">Search for other players and add them to your list.</div>
            <v-btn variant="elevated" color="primary" class="mt-4" @click.stop="toggleAddArea">
              <v-icon start>mdi-plus-circle</v-icon>Find Friends
            </v-btn>
          </div>
          <v-list v-else>
            <v-list-item v-for="(friend, id) in friends" :key="id" :title="friend.name" class="friend-item mb-1">
              <template #prepend>
                <v-avatar color="primary" size="36" class="mr-3">
                  <span class="avatar-initial">{{ friend.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                </v-avatar>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <v-text-field v-model="searchInput" label="Search for friends" placeholder="Search by name or email" prepend-inner-icon="mdi-magnify" clearable class="mb-4" />
          <v-list>
            <v-list-item v-for="(person, id) in searchResults" :key="id" :title="person.name" :subtitle="person.email" class="friend-item mb-1">
              <template #prepend>
                <v-avatar color="surface-variant" size="36" class="mr-3">
                  <span class="avatar-initial">{{ person.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                </v-avatar>
              </template>
              <template #append>
                <v-btn :disabled="person.isFriend" size="small" variant="elevated" color="accent" @click.stop="addToFriends(id)">
                  <v-icon start>mdi-plus-circle</v-icon>Add
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-if="searchInput.length && Object.keys(searchResults).length <= 0" class="empty-desc text-center mt-4">
            No person found with a similar name
          </div>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, get, update, query, orderByChild, startAt, endAt, limitToFirst } from 'firebase/database'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import constants from '~/helpers/constants'
import type { Friend, Person } from '~/helpers/types'

useHead({ title: 'Friends' })

const userStore = useUserStore()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const friendsAreaOpen = ref(true)
const friends = ref<Friend[]>([])
const searchInput = ref('')
const loading = ref(true)
const searchResults = ref<Record<string, Person>>({})
let searchTimerId: number | undefined
let unsubscribe: (() => void) | null = null



onMounted(() => {
  const friendsRef = dbRef(db, `users/${userStore.user!.uid}/friends`)
  unsubscribe = onValue(friendsRef, async (snapshot) => {
    const ids = snapshot.val(); loading.value = false
    if (!ids) { friends.value = []; return }
    const userPromises = Object.keys(ids).map((userId) => get(dbRef(db, `users/${userId}`)).then((snap) => ({ userId, ...snap.val() })))
    friends.value = await Promise.all(userPromises)
  })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.() })
function toggleAddArea() { friendsAreaOpen.value = !friendsAreaOpen.value }

watch(searchInput, (input) => {
  if (input.length <= 3) return
  clearTimeout(searchTimerId)
  searchTimerId = window.setTimeout(() => { fetchResults(input) }, constants.DebounceThrottleInMs)
})

async function addToFriends(id: string) {
  try { await update(dbRef(db, `users/${userStore.user!.uid}/friends`), { [id]: true }) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function fetchResults(input: string) {
  try {
    const lowerInput = input.toLowerCase()
    const q = query(dbRef(db, 'users'), orderByChild('queryableName'), startAt(lowerInput), endAt(lowerInput + ''), limitToFirst(10))
    const snapshot = await get(q); const val = snapshot.val()
    if (!val) { searchResults.value = {}; return }
    const ownUid = userStore.user!.uid
    const { [ownUid]: _own, ...others } = val
    const filtered: Record<string, Person> = others
    for (const friend of friends.value) { const match = filtered[friend.userId]; if (match) match.isFriend = true }
    searchResults.value = filtered
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}
</script>

<style scoped>
.page-title { font-size: 1.25rem; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.1rem; font-weight: 600; color: rgba(205,214,244,0.7); }
.empty-desc { font-size: 0.85rem; color: rgba(205,214,244,0.4); margin-top: 4px; }
.friend-item { border-radius: 12px; transition: background 0.2s ease; }
.friend-item:hover { background: rgba(108,92,231,0.06); }
.avatar-initial { font-weight: 600; font-size: 0.85rem; color: rgba(205,214,244,0.9); }
</style>

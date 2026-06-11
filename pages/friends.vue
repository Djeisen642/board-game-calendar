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
          <template v-if="incomingRequests.length">
            <div class="section-label mb-2">Friend Requests</div>
            <v-list class="mb-4">
              <v-list-item v-for="request in incomingRequests" :key="request.userId" :title="request.name" :subtitle="request.email" class="friend-item mb-1">
                <template #prepend>
                  <v-avatar color="accent" size="36" class="mr-3">
                    <span class="avatar-initial">{{ request.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  </v-avatar>
                </template>
                <template #append>
                  <v-btn density="compact" size="small" variant="elevated" color="success" class="mr-2" @click.stop="acceptRequest(request.userId)">
                    <v-icon start>mdi-check-circle</v-icon>Accept
                  </v-btn>
                  <v-btn density="compact" size="small" variant="text" color="error" @click.stop="declineRequest(request.userId)">
                    <v-icon start>mdi-close-circle</v-icon>Decline
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-divider class="mb-4" />
          </template>
          <div v-if="!friends.length && !incomingRequests.length" class="empty-state">
            <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-account-multiple-plus-outline</v-icon>
            <div class="empty-title">No friends yet</div>
            <div class="empty-desc">Search for other players and add them to your list.</div>
            <v-btn variant="elevated" color="primary" class="mt-4" @click.stop="toggleAddArea">
              <v-icon start>mdi-plus-circle</v-icon>Find Friends
            </v-btn>
          </div>
          <template v-else-if="friends.length">
            <div v-if="incomingRequests.length" class="section-label mb-2">Friends</div>
            <v-list>
              <v-list-item v-for="(friend, id) in friends" :key="id" :title="friend.name" class="friend-item mb-1">
                <template #prepend>
                  <v-avatar color="primary" size="36" class="mr-3">
                    <span class="avatar-initial">{{ friend.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  </v-avatar>
                </template>
                <template #append>
                  <v-btn density="compact" size="small" variant="text" color="error" @click.stop="removeFromFriends(friend.userId)">
                    <v-icon start>mdi-minus-circle</v-icon>Remove
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </template>
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <v-text-field v-model="searchInput" label="Search for friends" placeholder="Search by name, email, or phone number" :hint="`Search by name, email, or phone number (min ${constants.MinSearchLength} chars)`" persistent-hint prepend-inner-icon="mdi-magnify" clearable class="mb-4" />
          <v-list>
            <v-list-item v-for="(person, id) in searchResults" :key="id" :title="person.name" :subtitle="person.email" class="friend-item mb-1">
              <template #prepend>
                <v-avatar color="surface-variant" size="36" class="mr-3">
                  <span class="avatar-initial">{{ person.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                </v-avatar>
              </template>
              <template #append>
                <v-chip v-if="person.isFriend" size="small" color="success" variant="tonal">
                  <v-icon start>mdi-check-circle</v-icon>Friends
                </v-chip>
                <v-chip v-else-if="person.requestSent" size="small" color="primary" variant="tonal">
                  <v-icon start>mdi-clock-outline</v-icon>Request Sent
                </v-chip>
                <v-btn v-else size="small" variant="elevated" color="accent" @click.stop="sendFriendRequest(id, person)">
                  <v-icon start>mdi-plus-circle</v-icon>Add
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-if="searchInput?.length >= constants.MinSearchLength && Object.keys(searchResults).length <= 0" class="empty-desc text-center mt-4">
            No matching person found
          </div>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, get, set, update, query, orderByChild, startAt, endAt, limitToFirst } from 'firebase/database'
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
const incomingRequests = ref<Friend[]>([])
// clearable text fields set the model to null
const searchInput = ref<string | null>('')
const loading = ref(true)
const searchResults = ref<Record<string, Person>>({})
let searchTimerId: number | undefined
let unsubscribe: (() => void) | null = null
let unsubscribeRequests: (() => void) | null = null

function fetchProfiles(ids: Record<string, unknown>): Promise<Friend[]> {
  const userPromises = Object.keys(ids).map((userId) => get(dbRef(db, `users/${userId}`)).then((snap) => ({ userId, ...snap.val() })))
  return Promise.all(userPromises)
}

function showError(err: unknown) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }

onMounted(() => {
  const ownUid = userStore.user!.uid
  const friendsRef = dbRef(db, `users/${ownUid}/friends`)
  unsubscribe = onValue(friendsRef, async (snapshot) => {
    const ids = snapshot.val(); loading.value = false
    friends.value = ids ? await fetchProfiles(ids) : []
  }, (err) => {
    loading.value = false
    showError(err)
  })
  const requestsRef = dbRef(db, `users/${ownUid}/friendRequests`)
  unsubscribeRequests = onValue(requestsRef, async (snapshot) => {
    const ids = snapshot.val()
    incomingRequests.value = ids ? await fetchProfiles(ids) : []
  }, showError)
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.(); unsubscribeRequests?.() })
function toggleAddArea() { friendsAreaOpen.value = !friendsAreaOpen.value }

watch(searchInput, (input) => {
  clearTimeout(searchTimerId)
  if (!input || input.length < constants.MinSearchLength) { searchResults.value = {}; return }
  searchTimerId = window.setTimeout(() => { fetchResults(input) }, constants.DebounceThrottleInMs)
})

async function sendFriendRequest(id: string, person: Person) {
  try {
    const ownUid = userStore.user!.uid
    // rules also enforce this server-side; checking first gives a clear message
    const blockedSnap = await get(dbRef(db, `users/${id}/blocked/${ownUid}`))
    if (blockedSnap.exists()) {
      snackbar.value?.showSnackbarWithMessage('This user has declined your request', true)
      return
    }
    await set(dbRef(db, `users/${id}/friendRequests/${ownUid}`), 'pending')
    person.requestSent = true
    snackbar.value?.showSnackbarWithMessage('Friend request sent', false)
  } catch (err) { showError(err) }
}

async function acceptRequest(fromUid: string) {
  try {
    const ownUid = userStore.user!.uid
    await update(dbRef(db), {
      [`users/${ownUid}/friends/${fromUid}`]: true,
      [`users/${fromUid}/friends/${ownUid}`]: true,
      [`users/${ownUid}/friendRequests/${fromUid}`]: null,
    })
  } catch (err) { showError(err) }
}

async function declineRequest(fromUid: string) {
  try {
    const ownUid = userStore.user!.uid
    await update(dbRef(db), {
      [`users/${ownUid}/blocked/${fromUid}`]: true,
      [`users/${ownUid}/friendRequests/${fromUid}`]: null,
    })
  } catch (err) { showError(err) }
}

async function removeFromFriends(friendId: string) {
  try {
    const ownUid = userStore.user!.uid
    await update(dbRef(db), {
      [`users/${ownUid}/friends/${friendId}`]: null,
      [`users/${friendId}/friends/${ownUid}`]: null,
    })
  } catch (err) { showError(err) }
}

function searchFieldFor(input: string): { field: string; term: string } {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return { field: 'queryableEmail', term: trimmed.toLowerCase() }
  const digits = trimmed.replace(/[\s\-().+]/g, '')
  if (digits.length >= constants.MinPhoneSearchDigits && /^\d+$/.test(digits)) return { field: 'queryablePhone', term: digits }
  return { field: 'queryableName', term: trimmed.toLowerCase() }
}

async function fetchResults(input: string) {
  try {
    const { field, term } = searchFieldFor(input)
    const q = query(dbRef(db, 'users'), orderByChild(field), startAt(term), endAt(term + '\uf8ff'), limitToFirst(10))
    const snapshot = await get(q); const val = snapshot.val()
    if (!val) { searchResults.value = {}; return }
    const ownUid = userStore.user!.uid
    const { [ownUid]: _own, ...others } = val
    const filtered: Record<string, Person> = others
    for (const [id, person] of Object.entries(filtered)) {
      person.isFriend = friends.value.some((friend) => friend.userId === id)
      person.requestSent = !!person.friendRequests?.[ownUid]
    }
    searchResults.value = filtered
  } catch (err) { showError(err) }
}
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.35rem; font-weight: 600; color: rgba(205,214,244,0.95); }
.empty-desc { font-size: 1rem; color: rgba(205,214,244,0.75); margin-top: 8px; }
.section-label { font-size: 0.875rem; color: rgba(205,214,244,0.7); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
.friend-item { border-radius: 12px; transition: background 0.2s ease; }
.friend-item:hover { background: rgba(108,92,231,0.06); }
.avatar-initial { font-weight: 600; font-size: 1rem; color: rgba(205,214,244,0.95); }
</style>

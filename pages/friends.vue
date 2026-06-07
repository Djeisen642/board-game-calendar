<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Friends</h3>
          <v-spacer />
          <v-btn @click.stop="toggleAddArea">
            <v-icon start>
              {{
                friendsAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle'
              }}
            </v-icon>
            {{ friendsAreaOpen ? 'Add' : 'Back' }}
          </v-btn>
        </v-card-title>
        <v-card-text v-if="loading">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="friendsAreaOpen">
          <v-list>
            <v-list-item
              v-for="(friend, id) in friends"
              :key="id"
              :title="friend.name"
            />
          </v-list>
          <h4 v-if="!friends.length">No Friends! Add friends!</h4>
        </v-card-text>
        <v-card-text v-else>
          <v-text-field
            v-model="searchInput"
            label="Search for friends"
            placeholder="Search by name or email"
          />
          <v-list>
            <v-list-item
              v-for="(person, id) in searchResults"
              :key="id"
              :title="person.name"
              :subtitle="person.email"
            >
              <template #append>
                <v-btn
                  :disabled="person.isFriend"
                  size="small"
                  @click.stop="addToFriends(id)"
                >
                  <v-icon start>mdi-plus-circle</v-icon>Add
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div
            v-if="searchInput.length && Object.keys(searchResults).length <= 0"
          >
            No person found with a similar name
          </div>
        </v-card-text>
      </v-card>
    </v-col>
    <Snackbar ref="snackbar" />
  </v-row>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import {
  ref as dbRef,
  onValue,
  get,
  update,
  query,
  orderByChild,
  startAt,
  endAt,
  limitToFirst,
} from 'firebase/database'
import { useNuxtApp } from '#app'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import constants from '~/helpers/constants'
import type { Friend, Person } from '~/helpers/types'

useHead({ title: 'Friends' })

const userStore = useUserStore()
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const friendsAreaOpen = ref(true)
const friends = ref<Friend[]>([])
const searchInput = ref('')
const loading = ref(true)
const searchResults = ref<Record<string, Person>>({})
let searchTimerId: ReturnType<typeof setTimeout> | undefined
let unsubscribe: (() => void) | null = null

const nuxtApp = useNuxtApp()
const db = (nuxtApp as any).$db

onMounted(() => {
  const friendsRef = dbRef(db, `users/${userStore.user!.uid}/friends`)
  unsubscribe = onValue(friendsRef, async (snapshot) => {
    const ids = snapshot.val()
    loading.value = false
    if (!ids) {
      friends.value = []
      return
    }
    const userPromises = Object.keys(ids).map((userId) =>
      get(dbRef(db, `users/${userId}`)).then((snap) => ({
        userId,
        ...snap.val(),
      }))
    )
    friends.value = await Promise.all(userPromises)
  })
  setTimeout(() => {
    loading.value = false
  }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => {
  unsubscribe?.()
})

function toggleAddArea() {
  friendsAreaOpen.value = !friendsAreaOpen.value
}

watch(searchInput, (input) => {
  if (input.length <= 3) return
  clearTimeout(searchTimerId)
  searchTimerId = window.setTimeout(() => {
    fetchResults(input)
  }, constants.DebounceThrottleInMs)
})

async function addToFriends(id: string) {
  try {
    await update(dbRef(db, `users/${userStore.user!.uid}/friends`), {
      [id]: true,
    })
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  }
}

async function fetchResults(input: string) {
  try {
    const lowerInput = input.toLowerCase()
    const q = query(
      dbRef(db, 'users'),
      orderByChild('queryableName'),
      startAt(lowerInput),
      endAt(lowerInput + ''),
      limitToFirst(10)
    )
    const snapshot = await get(q)
    const val = snapshot.val()

    if (!val) {
      searchResults.value = {}
      return
    }
    const ownUid = userStore.user!.uid
    const { [ownUid]: _own, ...others } = val
    const filtered: Record<string, Person> = others
    for (const friend of friends.value) {
      const match = filtered[friend.userId]
      if (match) match.isFriend = true
    }
    searchResults.value = filtered
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  }
}
</script>

<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="6">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-calendar-plus</v-icon>
          <span class="page-title">New Gathering</span>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="loading" class="pa-8">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <v-form ref="gatheringForm" @submit.prevent="createGathering">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field v-model="date" type="date" label="Date" :rules="[validation.isRequired]" prepend-inner-icon="mdi-calendar" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="time" type="time" label="Start time" :rules="[validation.isRequired]" prepend-inner-icon="mdi-clock-outline" />
              </v-col>
            </v-row>
            <v-text-field v-model="maxGuests" type="number" label="Max guests" :rules="[validation.isMaxGuests]" prepend-inner-icon="mdi-account-multiple-outline" class="mb-1" />
            <v-switch v-model="open" color="primary" label="Open gathering" hint="Open gatherings can be seen by all signed-in users, not just invited guests" persistent-hint class="mb-3" />
            <v-select v-model="selectedGuests" :items="friendItems" multiple chips closable-chips label="Invite friends" prepend-inner-icon="mdi-account-group" :hint="friendItems.length ? '' : 'Add friends on the Friends page to invite them'" persistent-hint class="mb-1" />
            <v-select v-model="selectedGameIds" :items="gameItems" multiple chips closable-chips label="Games to play" prepend-inner-icon="mdi-rhombus-split" :hint="gameItems.length ? '' : 'Add games on the Game Collection page to pick them'" persistent-hint class="mb-4" />
            <v-btn type="submit" block color="primary" size="large" :loading="saving">
              <v-icon start>mdi-calendar-check</v-icon>Create Gathering
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ref as dbRef, get, push, set } from 'firebase/database'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import routes from '~/helpers/routes'
import type { FormInstance, Game, Gathering, GuestResponse } from '~/helpers/types'

useHead({ title: 'New Gathering' })

const userStore = useUserStore()
const router = useRouter()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const logEvent = nuxtApp.$logEvent

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const gatheringForm = ref<FormInstance | null>(null)
const loading = ref(true)
const saving = ref(false)

const date = ref('')
const time = ref('')
const maxGuests = ref<number | string>(0)
const open = ref(false)
const selectedGuests = ref<string[]>([])
const selectedGameIds = ref<string[]>([])
const friendItems = ref<{ title: string; value: string }[]>([])
const gameItems = ref<{ title: string; value: string }[]>([])
let gamesById: Record<string, Game> = {}

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isMaxGuests: (v: number | string) => v == null || v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 1000) || 'Must be a whole number between 0 and 1000',
}

onMounted(async () => {
  const uid = userStore.user!.uid
  try {
    const [profileSnap, friendsSnap, collectionSnap] = await Promise.all([
      get(dbRef(db, `users/${uid}/maxPeople`)),
      get(dbRef(db, `users/${uid}/friends`)),
      get(dbRef(db, `users/${uid}/collection`)),
    ])

    // Hosts usually count themselves in maxPeople, hence the -1 default
    const maxPeople = profileSnap.val()
    if (typeof maxPeople === 'number' && maxPeople > 0) maxGuests.value = maxPeople - 1

    const friendIds: Record<string, true> | null = friendsSnap.val()
    if (friendIds) {
      const friendEntries = await Promise.all(
        Object.keys(friendIds).map(async (friendId) => {
          const nameSnap = await get(dbRef(db, `users/${friendId}/name`))
          return { title: nameSnap.val() ?? 'Unknown player', value: friendId }
        })
      )
      friendItems.value = friendEntries.sort((a, b) => a.title.localeCompare(b.title))
    }

    const collection: Record<string, Game> | null = collectionSnap.val()
    if (collection) {
      gamesById = Object.fromEntries(Object.values(collection).map((game) => [game.id, game]))
      gameItems.value = Object.values(collection)
        .map((game) => ({ title: game.name, value: game.id }))
        .sort((a, b) => a.title.localeCompare(b.title))
    }
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  } finally {
    loading.value = false
  }
})

async function createGathering() {
  const result = await gatheringForm.value?.validate()
  if (!result?.valid) return
  const datetime = new Date(`${date.value}T${time.value}`)
  if (Number.isNaN(datetime.getTime())) {
    snackbar.value?.showSnackbarWithMessage('Please enter a valid date and time.', true)
    return
  }
  if (datetime.getTime() < Date.now()) {
    snackbar.value?.showSnackbarWithMessage('The gathering must be in the future.', true)
    return
  }
  saving.value = true
  try {
    const uid = userStore.user!.uid
    const gathering: Gathering = {
      state: 'pending',
      datetime: datetime.toISOString(),
      initiator: uid,
      host: uid,
      open: open.value,
      maxGuests: Number(maxGuests.value || 0),
      guests: Object.fromEntries(selectedGuests.value.map((guestId) => [guestId, 'invited' as GuestResponse])),
      games: selectedGameIds.value.map((id) => ({ id, name: gamesById[id]?.name ?? 'Unknown game' })),
    }
    await set(push(dbRef(db, 'gatherings')), gathering)
    logEvent('create_gathering', { guests: selectedGuests.value.length, games: selectedGameIds.value.length })
    await router.push(routes.calendar)
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-title { font-size: 1.25rem; font-weight: 600; }
</style>

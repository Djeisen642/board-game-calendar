<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="6">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-calendar</v-icon>
          <span class="page-title">Calendar</span>
          <v-spacer />
          <v-btn variant="elevated" color="primary" size="small" :to="routes.newGathering">
            <v-icon start>mdi-calendar-plus</v-icon>New
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="loading" class="pa-8">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="!hosting.length && !invited.length" class="pa-6">
          <div class="empty-state">
            <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-calendar-blank-outline</v-icon>
            <div class="empty-title">No gatherings yet</div>
            <div class="empty-desc">Host a game night or get invited to one, and it will show up here.</div>
            <v-btn variant="elevated" color="primary" class="mt-4" :to="routes.newGathering">
              <v-icon start>mdi-calendar-plus</v-icon>New Gathering
            </v-btn>
          </div>
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <template v-if="hosting.length">
            <div class="section-label mb-3">Hosting</div>
            <div v-for="gathering in hosting" :key="gathering.id" class="event-item pa-4 mb-3">
              <div class="d-flex align-center flex-wrap mb-2">
                <v-chip :color="stateColor(gathering.state)" size="small" variant="tonal" class="mr-2 text-capitalize">{{ gathering.state }}</v-chip>
                <span class="event-line"><v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>{{ formatDatetime(gathering.datetime) }}</span>
                <v-spacer />
                <v-btn v-if="gathering.state === 'pending'" density="compact" size="small" variant="text" color="success" @click.stop="setState(gathering, 'confirmed')">
                  <v-icon start>mdi-check-circle</v-icon>Confirm
                </v-btn>
                <v-btn v-if="gathering.state !== 'canceled'" density="compact" size="small" variant="text" color="accent" @click.stop="editGathering(gathering)">
                  <v-icon start>mdi-pencil</v-icon>Edit
                </v-btn>
                <v-btn v-if="gathering.state !== 'canceled'" density="compact" size="small" variant="text" color="error" @click.stop="setState(gathering, 'canceled')">
                  <v-icon start>mdi-cancel</v-icon>Cancel
                </v-btn>
                <v-btn v-else density="compact" size="small" variant="text" color="error" @click.stop="deleteGathering(gathering)">
                  <v-icon start>mdi-delete</v-icon>Delete
                </v-btn>
              </div>
              <div v-if="gathering.games?.length" class="event-line mb-2">
                <v-icon size="16" class="mr-1">mdi-rhombus-split</v-icon>
                <v-chip v-for="game in gathering.games" :key="game.id" size="x-small" variant="outlined" class="mr-1">{{ game.name }}</v-chip>
              </div>
              <div v-if="guestEntries(gathering).length" class="event-line">
                <v-icon size="16" class="mr-1">mdi-account-group</v-icon>
                <v-chip v-for="guest in guestEntries(gathering)" :key="guest.uid" size="x-small" :color="responseColor(guest.response)" variant="tonal" class="mr-1">
                  <v-icon start size="12">{{ responseIcon(guest.response) }}</v-icon>{{ names[guest.uid] ?? '…' }}
                </v-chip>
              </div>
              <div v-else class="event-line">
                <v-icon size="16" class="mr-1">mdi-account-group</v-icon>No guests invited yet
              </div>
            </div>
          </template>

          <template v-if="invited.length">
            <div class="section-label mb-3" :class="{ 'mt-4': hosting.length }">Invited</div>
            <div v-for="gathering in invited" :key="gathering.id" class="event-item pa-4 mb-3">
              <div class="d-flex align-center flex-wrap mb-2">
                <v-chip :color="stateColor(gathering.state)" size="small" variant="tonal" class="mr-2 text-capitalize">{{ gathering.state }}</v-chip>
                <span class="event-line"><v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>{{ formatDatetime(gathering.datetime) }}</span>
              </div>
              <div class="event-line mb-2">
                <v-icon size="16" class="mr-1">mdi-account</v-icon>Hosted by {{ names[gathering.host] ?? '…' }}
              </div>
              <div v-if="gathering.games?.length" class="event-line mb-2">
                <v-icon size="16" class="mr-1">mdi-rhombus-split</v-icon>
                <v-chip v-for="game in gathering.games" :key="game.id" size="x-small" variant="outlined" class="mr-1">{{ game.name }}</v-chip>
              </div>
              <div v-if="gathering.state !== 'canceled'" class="d-flex align-center mt-1">
                <v-btn density="compact" size="small" :variant="myResponse(gathering) === 'accepted' ? 'tonal' : 'text'" color="success" class="mr-2" @click.stop="respond(gathering, 'accepted')">
                  <v-icon start>mdi-check-circle</v-icon>Accept
                </v-btn>
                <v-btn density="compact" size="small" :variant="myResponse(gathering) === 'declined' ? 'tonal' : 'text'" color="error" @click.stop="respond(gathering, 'declined')">
                  <v-icon start>mdi-close-circle</v-icon>Decline
                </v-btn>
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, update, set, remove } from 'firebase/database'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import routes from '~/helpers/routes'
import constants from '~/helpers/constants'
import {
  splitGatherings,
  stateColor,
  responseColor,
  responseIcon,
  formatDatetime,
  type GatheringWithId,
} from '~/helpers/gatherings'
import type { Gathering, GatheringState, GuestResponse } from '~/helpers/types'

useHead({ title: 'Calendar' })

const userStore = useUserStore()
const router = useRouter()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const logEvent = nuxtApp.$logEvent

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
// gatherings are readable only by their participants, so the calendar follows
// the user's own userGatherings/{uid} index and listens to each entry
const gatheringsById = ref<Record<string, Gathering>>({})
const loading = ref(true)
let unsubscribeIndex: (() => void) | null = null
const gatheringListeners = new Map<string, () => void>()

const uid = userStore.user!.uid
const { names, resolveNames, guestEntries } = useGatheringDisplay()

function dropGathering(id: string) {
  const { [id]: _gone, ...rest } = gatheringsById.value
  gatheringsById.value = rest
}

function watchGathering(id: string) {
  const unsubscribe = onValue(dbRef(db, `gatherings/${id}`), (snapshot) => {
    const val = snapshot.val() as Gathering | null
    if (val) gatheringsById.value = { ...gatheringsById.value, [id]: val }
    else dropGathering(id)
  }, () => {
    // unreadable: deleted or uninvited with the pointer left behind —
    // drop it and clean up our own dangling index entry
    dropGathering(id)
    gatheringListeners.get(id)?.()
    gatheringListeners.delete(id)
    void remove(dbRef(db, `userGatherings/${uid}/${id}`)).catch(() => {})
  })
  gatheringListeners.set(id, unsubscribe)
}

onMounted(() => {
  unsubscribeIndex = onValue(dbRef(db, `userGatherings/${uid}`), (snapshot) => {
    loading.value = false
    const ids = new Set(Object.keys(snapshot.val() ?? {}))
    for (const id of ids) if (!gatheringListeners.has(id)) watchGathering(id)
    for (const [id, unsubscribe] of gatheringListeners) {
      if (!ids.has(id)) {
        unsubscribe()
        gatheringListeners.delete(id)
        dropGathering(id)
      }
    }
  }, (err) => {
    loading.value = false
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => {
  unsubscribeIndex?.()
  for (const unsubscribe of gatheringListeners.values()) unsubscribe()
  gatheringListeners.clear()
})

const gatherings = computed<GatheringWithId[]>(() =>
  Object.entries(gatheringsById.value).map(([id, gathering]) => ({ id, ...gathering }))
)
const sections = computed(() => splitGatherings(gatherings.value, uid))
const hosting = computed(() => sections.value.hosting)
const invited = computed(() => sections.value.invited)

watch(sections, (value) => { void resolveNames(value) })

function myResponse(gathering: Gathering): GuestResponse | undefined {
  return gathering.guests?.[uid]
}

async function setState(gathering: GatheringWithId, state: GatheringState) {
  try {
    await update(dbRef(db, `gatherings/${gathering.id}`), { state })
    logEvent('gathering_state_changed', { state })
  }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function respond(gathering: GatheringWithId, response: GuestResponse) {
  try {
    await set(dbRef(db, `gatherings/${gathering.id}/guests/${uid}`), response)
    logEvent('gathering_rsvp', { response })
  }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function deleteGathering(gathering: GatheringWithId) {
  try {
    // one atomic update: the rules check the pre-delete gathering, so the
    // index entries can be removed alongside it
    const updates: Record<string, null> = {
      [`gatherings/${gathering.id}`]: null,
      [`userGatherings/${uid}/${gathering.id}`]: null,
    }
    for (const guestUid of Object.keys(gathering.guests ?? {})) {
      updates[`userGatherings/${guestUid}/${gathering.id}`] = null
    }
    await update(dbRef(db), updates)
    logEvent('gathering_deleted')
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

function editGathering(gathering: GatheringWithId) {
  router.push({ path: routes.newGathering, query: { id: gathering.id } })
}
</script>

<style scoped>
.event-item { border-radius: 12px; background: rgba(108,92,231,0.04); border: 1px solid rgba(108,92,231,0.08); transition: all 0.2s ease; }
.event-item:hover { background: rgba(108,92,231,0.08); border-color: rgba(108,92,231,0.15); }
.event-line { font-size: 1rem; color: rgba(205,214,244,0.9); display: inline-flex; align-items: center; flex-wrap: wrap; }
</style>

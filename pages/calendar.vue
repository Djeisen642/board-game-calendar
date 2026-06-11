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
        <v-card-text v-else-if="!hosting.length && !invited.length && !openGatherings.length" class="pa-6">
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
            <div class="section-title mb-3">Hosting</div>
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

          <template v-if="openGatherings.length">
            <div class="section-title mb-3" :class="{ 'mt-4': hosting.length }">Open gatherings</div>
            <div v-for="gathering in openGatherings" :key="gathering.id" class="event-item pa-4 mb-3">
              <div class="d-flex align-center flex-wrap mb-2">
                <v-chip :color="stateColor(gathering.state)" size="small" variant="tonal" class="mr-2 text-capitalize">{{ gathering.state }}</v-chip>
                <span class="event-line"><v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>{{ formatDatetime(gathering.datetime) }}</span>
                <v-spacer />
                <v-btn density="compact" size="small" variant="tonal" color="success" :disabled="isFull(gathering)" @click.stop="respond(gathering, 'accepted')">
                  <v-icon start>mdi-account-plus</v-icon>{{ isFull(gathering) ? 'Full' : 'Join' }}
                </v-btn>
              </div>
              <div class="event-line mb-2">
                <v-icon size="16" class="mr-1">mdi-account</v-icon>Hosted by {{ names[gathering.host] ?? '…' }}
                <template v-if="gathering.maxGuests > 0">
                  <span class="mx-2">·</span>{{ acceptedCount(gathering) }}/{{ gathering.maxGuests }} guests
                </template>
              </div>
              <div v-if="gathering.games?.length" class="event-line">
                <v-icon size="16" class="mr-1">mdi-rhombus-split</v-icon>
                <v-chip v-for="game in gathering.games" :key="game.id" size="x-small" variant="outlined" class="mr-1">{{ game.name }}</v-chip>
              </div>
            </div>
          </template>

          <template v-if="invited.length">
            <div class="section-title mb-3" :class="{ 'mt-4': hosting.length || openGatherings.length }">Invited</div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, get, update, set, remove } from 'firebase/database'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import routes from '~/helpers/routes'
import constants from '~/helpers/constants'
import {
  splitGatherings,
  acceptedCount,
  isFull,
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

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const gatherings = ref<GatheringWithId[]>([])
const names = ref<Record<string, string>>({})
const loading = ref(true)
let unsubscribe: (() => void) | null = null

const uid = userStore.user!.uid

onMounted(() => {
  // Rules are not filters: any signed-in user may read gatherings, so load
  // them all and split into hosting/invited client-side (MVP approach)
  unsubscribe = onValue(dbRef(db, 'gatherings'), (snapshot) => {
    const val = snapshot.val() as Record<string, Gathering> | null
    loading.value = false
    gatherings.value = val ? Object.entries(val).map(([id, gathering]) => ({ id, ...gathering })) : []
    void resolveNames()
  }, (err) => {
    loading.value = false
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.() })

const sections = computed(() => splitGatherings(gatherings.value, uid))
const hosting = computed(() => sections.value.hosting)
const invited = computed(() => sections.value.invited)
const openGatherings = computed(() => sections.value.open)

async function resolveNames() {
  const wanted = new Set<string>()
  for (const gathering of sections.value.hosting) Object.keys(gathering.guests ?? {}).forEach((guestUid) => wanted.add(guestUid))
  for (const gathering of [...sections.value.invited, ...sections.value.open]) wanted.add(gathering.host)
  const missing = [...wanted].filter((personUid) => !(personUid in names.value))
  await Promise.all(missing.map(async (personUid) => {
    try {
      const snap = await get(dbRef(db, `users/${personUid}/name`))
      names.value[personUid] = snap.val() ?? 'Unknown player'
    } catch {
      names.value[personUid] = 'Unknown player'
    }
  }))
}

function guestEntries(gathering: Gathering): { uid: string; response: GuestResponse }[] {
  return Object.entries(gathering.guests ?? {}).map(([guestUid, response]) => ({ uid: guestUid, response }))
}

function myResponse(gathering: Gathering): GuestResponse | undefined {
  return gathering.guests?.[uid]
}

async function setState(gathering: GatheringWithId, state: GatheringState) {
  try { await update(dbRef(db, `gatherings/${gathering.id}`), { state }) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function respond(gathering: GatheringWithId, response: GuestResponse) {
  try { await set(dbRef(db, `gatherings/${gathering.id}/guests/${uid}`), response) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

async function deleteGathering(gathering: GatheringWithId) {
  try { await remove(dbRef(db, `gatherings/${gathering.id}`)) }
  catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}

function editGathering(gathering: GatheringWithId) {
  router.push({ path: routes.newGathering, query: { id: gathering.id } })
}
</script>

<style scoped>
.page-title { font-size: 1.25rem; font-weight: 600; }
.section-title { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(205,214,244,0.5); }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.1rem; font-weight: 600; color: rgba(205,214,244,0.7); }
.empty-desc { font-size: 0.85rem; color: rgba(205,214,244,0.4); margin-top: 4px; }
.event-item { border-radius: 12px; background: rgba(108,92,231,0.04); border: 1px solid rgba(108,92,231,0.08); transition: all 0.2s ease; }
.event-item:hover { background: rgba(108,92,231,0.08); border-color: rgba(108,92,231,0.15); }
.event-line { font-size: 0.9rem; color: rgba(205,214,244,0.8); display: inline-flex; align-items: center; flex-wrap: wrap; }
</style>

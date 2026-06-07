<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="6">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-calendar</v-icon>
          <span class="page-title">Calendar Events</span>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="loading" class="pa-8">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="!events.length" class="pa-6">
          <div class="empty-state">
            <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-calendar-blank-outline</v-icon>
            <div class="empty-title">No events yet</div>
            <div class="empty-desc">Your upcoming game nights will appear here.</div>
          </div>
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <div v-for="(event, i) in events" :key="i" class="event-item pa-4 mb-3">
            <div class="event-host mb-1"><v-icon size="16" class="mr-2">mdi-account</v-icon>Host: {{ event.host }}</div>
            <div class="event-date mb-1"><v-icon size="16" class="mr-2">mdi-calendar</v-icon>Date: {{ event.date }}</div>
            <div class="event-guests"><v-icon size="16" class="mr-2">mdi-account-group</v-icon>Guests: {{ event.guests && event.guests.map((guest) => guest.name) }}</div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
  onValue,
} from 'firebase/database'
import type { Person } from '~/helpers/types'
import constants from '~/helpers/constants'

useHead({ title: 'Calendar' })

type EventType = { host: string; date: Date; guests: Person[] }

const userStore = useUserStore()
const events = ref<EventType[]>([])
const loading = ref(true)
let unsubscribe: (() => void) | null = null

const nuxtApp = useNuxtApp()
const db = nuxtApp.$db

onMounted(() => {
  const q = query(dbRef(db, 'events'), orderByChild('host'), equalTo(userStore.user!.uid))
  unsubscribe = onValue(q, (snapshot) => { const val = snapshot.val(); loading.value = false; events.value = val ? Object.values(val) : [] })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.() })
</script>

<style scoped>
.page-title { font-size: 1.25rem; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-title { font-size: 1.1rem; font-weight: 600; color: rgba(205,214,244,0.7); }
.empty-desc { font-size: 0.85rem; color: rgba(205,214,244,0.4); margin-top: 4px; }
.event-item { border-radius: 12px; background: rgba(108,92,231,0.04); border: 1px solid rgba(108,92,231,0.08); transition: all 0.2s ease; }
.event-item:hover { background: rgba(108,92,231,0.08); border-color: rgba(108,92,231,0.15); }
.event-host, .event-date, .event-guests { font-size: 0.9rem; color: rgba(205,214,244,0.8); display: flex; align-items: center; }
</style>

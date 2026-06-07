<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Calendar Events</h3>
        </v-card-title>
        <v-card-text v-if="loading">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="!events.length">
          <h4>No events found!</h4>
        </v-card-text>
        <v-card-text v-else>
          <div v-for="(event, i) in events" :key="i">
            <div>Host: {{ event.host }}</div>
            <div>Date: {{ event.date }}</div>
            <div>
              Guests:
              {{ event.guests && event.guests.map((guest) => guest.name) }}
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, query, orderByChild, equalTo, onValue } from 'firebase/database'
import { db } from '~/plugins/firebase'
import type { Person } from '~/helpers/types'
import constants from '~/helpers/constants'

useHead({ title: 'Calendar' })

type EventType = {
  host: string
  date: Date
  guests: Person[]
}

const userStore = useUserStore()
const events = ref<EventType[]>([])
const loading = ref(true)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const q = query(
    dbRef(db, 'events'),
    orderByChild('host'),
    equalTo(userStore.user!.uid)
  )
  unsubscribe = onValue(q, (snapshot) => {
    const val = snapshot.val()
    loading.value = false
    events.value = val ? Object.values(val) : []
  })
  setTimeout(() => {
    loading.value = false
  }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

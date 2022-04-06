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
        <v-card-text v-if="!events.length">
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
            {{ event.date }}
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import Vue from 'vue'
import { State, Component } from 'nuxt-property-decorator'
import firebase from 'firebase/compat'
import { NuxtHeadType, Person } from '~/helpers/types'
import { db } from '~/plugins/firebase'
import names from '~/helpers/names'
import routes from '~/helpers/routes'
import constants from '~/helpers/constants'

export type EventType = {
  host: string
  date: Date
  guests: Person[]
}

@Component
export default class Calendar extends Vue {
  static route = routes.calendar
  static routeName = names.calendar
  static title = 'Calendar'

  @State('user')
  user!: firebase.User

  events: EventType[] = []

  loading = true

  head(): NuxtHeadType {
    return {
      title: Calendar.title,
    }
  }

  mounted(): void {
    db.ref('events')
      .orderByChild('host')
      .equalTo(this.user.uid)
      .on('value', (snapshot) => {
        const events = snapshot.val()
        this.loading = false
        if (!events) {
          this.events = []
          return
        }
        this.events = events
      })
    setTimeout(() => {
      this.loading = false
    }, constants.LoadingTimeoutInMs)
  }
}
</script>

<style scoped lang="scss"></style>

<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Calendar Events</h3>
        </v-card-title>
        <v-card-text>
          <div
            v-for="(event, i) in events"
            :key="i"
          >
            <div>Host: {{ event.host }}</div>
            <div>Date: {{ event.date }}</div>
            <div>Guests: {{ event.guests && event.guests.map(guest => guest.name) }}</div>
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
import firebase from 'firebase'
import { NuxtHeadType, Person } from '~/helpers/types'
import { db } from '~/plugins/firebase'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

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
  user!:firebase.User

  events:EventType[] = []

  head ():NuxtHeadType {
    return {
      title: Calendar.title
    }
  }

  created ():void {
    db.ref('events')
      .orderByChild('host')
      .equalTo(this.user.uid)
      .on('value', (snapshot) => {
        this.events = snapshot.val()
      })
  }
}
</script>

<style scoped lang="scss">

</style>

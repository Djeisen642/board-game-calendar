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
import Component from 'vue-class-component'
import { State } from 'nuxt-property-decorator'
import firebase from 'firebase'
import { NuxtHeadType } from '~/constants/types'
import { Person } from '~/pages/Friends.vue'
import { db } from '~/plugins/firebase'

export type EventType = {
  host: string
  date: Date
  guests: Person[]
}

@Component
export default class Calendar extends Vue {
  static route = '/calendar'
  static routeName = 'Calendar'
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

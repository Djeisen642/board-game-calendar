<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Friends</h3>
          <v-spacer />
          <v-btn @click.stop="toggleAddArea">
            <v-icon class="mr-3">
              {{
                friendsAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle'
              }} </v-icon
            >{{ friendsAreaOpen ? 'Add' : 'Back' }}
          </v-btn>
        </v-card-title>
        <v-card-text v-if="loading">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="friendsAreaOpen">
          <v-list>
            <v-list-item v-for="(friend, id) in friends" :key="id">
              <v-list-item-content>
                <v-list-item-title>{{ friend.name }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
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
            <v-list-item v-for="(person, id) in searchResults" :key="id">
              <v-list-item-content>
                <v-list-item-title>{{ person.name }}</v-list-item-title>
                <v-list-item-title>{{ person.email }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  :disabled="person.isFriend"
                  @click.stop="addToFriends(id)"
                >
                  <v-icon class="mr-3"> mdi-plus-circle </v-icon>Add
                </v-btn>
              </v-list-item-action>
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

<script lang="ts">
import Vue from 'vue'
import { State, Watch, Component } from 'nuxt-property-decorator'
import firebase from 'firebase/compat'
import Snackbar from '~/components/Snackbar.vue'
import { db } from '~/plugins/firebase'
import constants from '~/helpers/constants'
import helpers from '~/helpers/helpers'
import names from '~/helpers/names'
import routes from '~/helpers/routes'
import { Friend, Person } from '~/helpers/types'

@Component({
  components: { Snackbar },
})
export default class Friends extends Vue {
  static title = 'Friends'
  static routeName = names.friends
  static route = routes.friends

  @State('user')
  user!: firebase.User

  friendsAreaOpen = true

  friends: Friend[] = []

  searchInput = ''

  loading = true

  searchResults: Record<string, Person> = {}

  private _searchTimerId: number | undefined

  $refs!: {
    snackbar: Snackbar
  }

  mounted(): void {
    const friendsRef = db.ref(`users/${this.user.uid}/friends`)
    friendsRef.on('value', async (snapshot) => {
      const ids = snapshot.val()
      this.loading = false
      if (!ids) {
        this.friends = []
        return
      }
      const userPromises = Object.keys(ids).map((userId) =>
        db
          .ref(`users/${userId}`)
          .once('value')
          .then((user) => Object.assign({ userId }, user.val()))
      )
      this.friends = await Promise.all(userPromises)
    })
    setTimeout(() => {
      this.loading = false
    }, constants.LoadingTimeoutInMs)
  }

  toggleAddArea(): void {
    this.friendsAreaOpen = !this.friendsAreaOpen
  }

  @Watch('searchInput')
  onSearchInput(input: string): void {
    if (input.length <= 3) {
      return
    }
    clearTimeout(this._searchTimerId)
    this._searchTimerId = window.setTimeout(() => {
      this.fetchResults(input)
    }, constants.DebounceThrottleInMs)
  }

  async addToFriends(id: string): Promise<void> {
    try {
      const friendsRef = (
        await db.ref(`users/${this.user.uid}/friends`).once('value')
      ).val()
      friendsRef[id] = true
      await friendsRef.update({ [id]: true })
    } catch (err) {
      const handledError = helpers.handleError(err)
      this.$refs.snackbar.showSnackbarWithMessage(handledError.message, true)
    }
  }

  async fetchResults(input: string): Promise<void> {
    try {
      const lowerInput = input.toLowerCase()
      const snapshot = (
        await db
          .ref('users')
          .orderByChild('queryableName')
          .startAt(lowerInput)
          .endAt(lowerInput + '\uF8FF')
          .limitToFirst(10)
          .once('value')
      ).val()

      if (!snapshot) {
        this.searchResults = {}
        return
      }
      delete snapshot[this.user.uid]
      for (const friend of this.friends) {
        const aFriendObject = snapshot[friend.userId]
        if (aFriendObject) {
          aFriendObject.isFriend = true
        }
      }
      this.searchResults = snapshot
    } catch (err) {
      const handledError = helpers.handleError(err)
      this.$refs.snackbar.showSnackbarWithMessage(handledError.message, true)
    }
  }
}
</script>

<style scoped lang="scss"></style>

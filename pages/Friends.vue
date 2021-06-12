<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Friends</h3>
          <v-spacer />
          <v-btn
            @click.stop="toggleAddArea"
          >
            <v-icon class="mr-3">
              {{ friendsAreaOpen ? 'mdi-plus-circle' : 'mdi-arrow-left-circle' }}
            </v-icon>{{ friendsAreaOpen ? 'Add' : 'Back' }}
          </v-btn>
        </v-card-title>
        <v-card-text
          v-if="friendsAreaOpen"
        >
          <v-list>
            <v-list-item
              v-for="(friend, id) in friends"
              :key="id"
            >
              <v-list-item-content>
                <v-list-item-title>{{ friend.name }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <h4
            v-if="!friends"
          >
            No Friends! Add friends!
          </h4>
        </v-card-text>
        <v-card-text
          v-else
        >
          <v-text-field
            v-model="searchInput"
            label="Search for friends"
            placeholder="Search by name or email"
          />
          <v-list>
            <v-list-item
              v-for="(person, id) in searchResults"
              :key="id"
            >
              <v-list-item-content>
                <v-list-item-title>{{ person.name }}</v-list-item-title>
                <v-list-item-title>{{ person.email }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  :disabled="person.isFriend"
                  @click.stop="addToFriends(id)"
                >
                  <v-icon class="mr-3">
                    mdi-plus-circle
                  </v-icon>Add
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
    <Snackbar
      ref="snackbar"
    />
  </v-row>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { State, Watch } from 'nuxt-property-decorator'
import firebase from 'firebase'
import Snackbar from '~/components/Snackbar.vue'
import { db, log, LogLevel } from '~/plugins/firebase'
import { settings } from '~/pages/GameCollection.vue'

type Person = {
  name:string
  email:string
  isFriend?:boolean
}

type Friend = Person & {
  userId:string
}

@Component({
  components: { Snackbar }
})
export default class Friends extends Vue {
  @State('user')
  user!:firebase.User

  static title = 'Friends'

  static route = '/friends'

  friendsAreaOpen = true

  friends:Friend[] = []

  searchInput = ''

  searchResults:Record<string, Person> = {}

  private _searchTimerId:number|undefined;

  $refs !: {
    snackbar: Snackbar
  }

  mounted ():void {
    const friendsRef = db.ref(`users/${this.user.uid}/friends`)
    friendsRef.on('value', async (snapshot) => {
      const ids = snapshot.val()
      if (!ids) {
        this.friends = []
        return
      }
      const userPromises = Object.keys(ids)
        .map(userId =>
          db.ref(`users/${userId}`)
            .once('value')
            .then(user =>
              Object.assign({ userId }, user.val())
            )
        )
      this.friends = await Promise.all(userPromises)
    })
  }

  toggleAddArea ():void {
    this.friendsAreaOpen = !this.friendsAreaOpen
  }

  @Watch('searchInput')
  onSearchInput (input:string):void {
    if (input.length <= 3) { return }
    clearTimeout(this._searchTimerId)
    this._searchTimerId = window.setTimeout(() => {
      this.fetchResults(input)
    }, settings.DebounceThrottleInMs)
  }

  async addToFriends (id:string):Promise<void> {
    try {
      const friendsRef = (await db.ref(`users/${this.user.uid}/friends`).once('value')).val()
      friendsRef[id] = true
      await friendsRef.update({ [id]: true })
    } catch (err) {
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    }
  }

  async fetchResults (input:string):Promise<void> {
    try {
      const lowerInput = input.toLowerCase()
      const snapshot = (await db.ref('users')
        .orderByChild('queryableName')
        .startAt(lowerInput)
        .endAt(lowerInput + '\uF8FF')
        .limitToFirst(10)
        .once('value'))
        .val()

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
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    }
  }
}
</script>

<style scoped lang="scss">

</style>

<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Profile</h3>
        </v-card-title>
        <v-card-text
          v-if="editable"
        >
          <v-form
            ref="profileForm"
          >
            <v-text-field
              v-model="profile.name"
              label="Name"
              :rules="[validation.isRequired]"
            />
            <v-text-field
              v-model="profile.phoneNumber"
              label="Phone Number"
              :rules="[validation.isPhone]"
            />
            <v-text-field
              v-model="profile.email"
              label="Email"
              :rules="[validation.isRequired, validation.isEmail]"
            />
            <v-textarea
              v-model="profile.address"
              label="Address"
            />
          </v-form>
        </v-card-text>
        <v-card-text
          v-else
        >
          <p>
            <v-icon class="mx-1">
              mdi-account
            </v-icon>Name: {{ profile.name || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-1">
              mdi-phone
            </v-icon>Phone Number: {{ profile.phoneNumber || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-1">
              mdi-email
            </v-icon>Email: {{ profile.email || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-1">
              mdi-google-maps
            </v-icon>Address:
          </p>
          <div
            class="ml-4"
          >
            <a
              v-if="profile.address"
              style="white-space: pre-wrap"
              target="_blank"
              :href="`https://www.google.com/maps/search/?api=1&query=${profile.address}`"
            >{{ profile.address }}</a>
            <div v-else>
              Empty
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="!editable"
            @click.stop="editable = true"
          >
            <v-icon class="mr-3">
              mdi-account-edit
            </v-icon>Edit
          </v-btn>
          <v-btn
            v-if="editable"
            @click.stop="update"
          >
            <v-icon class="mr-3">
              mdi-content-save
            </v-icon>Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <Snackbar
      ref="snackbar"
    />
  </v-row>
</template>

<script lang="ts">
import { Component, State, Vue } from 'nuxt-property-decorator'
import firebase from 'firebase/app'
import isEmail from 'validator/lib/isEmail'
import PhoneNumber from 'awesome-phonenumber'
import { db, log, LogLevel } from '~/plugins/firebase'
import { NuxtHeadType, VForm } from '~/constants/types'
import Snackbar from '~/components/Snackbar.vue'

export type UserProfile = {
  name:string
  email:string
  phoneNumber:string
  address:string
}

@Component({
  components: { Snackbar }
})
export default class Profile extends Vue {
  static route = '/profile'
  static title = 'Profile'

  @State('user')
  user!:firebase.User

  $refs!: {
    profileForm: VForm
    snackbar: Snackbar
  }

  editable=false

  profile:UserProfile = {
    name: 'empty',
    email: 'empty',
    phoneNumber: 'empty',
    address: 'empty'
  }

  validation = {
    isRequired: (v:string):boolean|string => !!v || 'Required',
    isEmail: (v:string):boolean|string => isEmail(v) || 'Invalid email',
    isPhone: (v:string):boolean|string => new PhoneNumber(v || '', 'US').isValid() || 'Invalid phone'
  }

  mounted ():void {
    const userRef = db.ref(`users/${this.user.uid}`)
    userRef.on('value', (snapshot) => {
      this.profile = snapshot.val()
    })
  }

  head ():NuxtHeadType {
    return {
      title: Profile.title
    }
  }

  async update ():Promise<void> {
    try {
      if (!this.$refs.profileForm.validate()) {
        return
      }

      const userRef = db.ref(`users/${this.user.uid}`)
      await userRef.update({
        name: this.profile.name,
        queryableName: this.profile.name.toLowerCase(),
        phoneNumber: new PhoneNumber(this.profile.phoneNumber, 'US').getNumber('national'),
        address: this.profile.address,
        email: this.profile.email
      })
      this.editable = false
    } catch (err) {
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    }
  }
}
</script>

<style scoped lang="scss">

</style>

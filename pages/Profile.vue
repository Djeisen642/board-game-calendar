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
              :label="label.name"
              :rules="[validation.isRequired]"
            />
            <v-text-field
              v-model="profile.phoneNumber"
              :label="label.phoneNumber"
              :rules="[validation.isPhone]"
            />
            <v-text-field
              v-model="profile.email"
              :label="label.email"
              :rules="[validation.isRequired, validation.isEmail]"
            />
            <v-textarea
              v-model="profile.address"
              :label="label.address"
            />
            <v-text-field
              v-model="profile.maxPeople"
              type="number"
              :label="label.maxPeople"
            />
          </v-form>
        </v-card-text>
        <v-card-text
          v-else
        >
          <p>
            <v-icon class="mx-2">
              mdi-account
            </v-icon>{{ label.name }}: {{ profile.name || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">
              mdi-phone
            </v-icon>{{ label.phoneNumber }}: {{ profile.phoneNumber || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">
              mdi-email
            </v-icon>{{ label.email }}: {{ profile.email || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">
              mdi-google-maps
            </v-icon>{{ label.address }}:
          </p>
          <div
            class="ml-4"
          >
            <a
              v-if="profile.address"
              style="white-space: pre-wrap"
              target="_blank"
              :href="`https://www.google.com/maps/search/?api=1&query=${removeNewLines(profile.address)}`"
            >{{ profile.address }}</a>
            <div v-else>
              Empty
            </div>
          </div>
          <p>
            <v-icon class="mx-2">
              mdi-account-multiple-check
            </v-icon>{{ label.maxPeople }}: {{ profile.maxPeople || 'Empty' }}
          </p>
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
import { db } from '~/plugins/firebase'
import { NuxtHeadType, VForm } from '~/helpers/types'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

export type UserProfile = {
  name:string
  email:string
  phoneNumber:string
  address:string,
  maxPeople:number
}

export const label = {
  name: 'Name',
  phoneNumber: 'Phone Number',
  email: 'Email',
  address: 'Address',
  maxPeople: 'Max people at residence'
}

@Component({
  components: { Snackbar }
})
export default class Profile extends Vue {
  static route = routes.profile
  static routeName = names.profile
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
    address: 'empty',
    maxPeople: 0
  }

  validation = {
    isRequired: (v:string):boolean|string => !!v || 'Required',
    isEmail: (v:string):boolean|string => !v || isEmail(v) || 'Invalid email',
    isPhone: (v:string):boolean|string => !v || new PhoneNumber(v || '', 'US').isValid() || 'Invalid phone'
  }

  get label ():typeof label {
    return label
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

  removeNewLines (str:string):string {
    return str.replace(/\n/g, ' ')
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
        phoneNumber: this.profile.phoneNumber ? new PhoneNumber(this.profile.phoneNumber, 'US').getNumber('national') : null,
        address: this.profile.address,
        email: this.profile.email,
        maxPeople: this.profile.maxPeople ?? null
      })
      this.editable = false
    } catch (err) {
      const handledError = helpers.handleError(err)
      this.$refs.snackbar.showSnackbarWithMessage(handledError.message, true)
    }
  }
}
</script>

<style scoped lang="scss">

</style>

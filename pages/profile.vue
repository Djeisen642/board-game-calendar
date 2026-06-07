<template>
  <v-row>
    <v-col>
      <v-card>
        <v-card-title>
          <h3>Profile</h3>
        </v-card-title>
        <v-card-text v-if="loading">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="editable">
          <v-form ref="profileForm">
            <v-text-field
              v-model="profile.name"
              :label="labels.name"
              :rules="[validation.isRequired]"
            />
            <v-text-field
              v-model="profile.phoneNumber"
              :label="labels.phoneNumber"
              :rules="[validation.isPhone]"
            />
            <v-text-field
              v-model="profile.email"
              :label="labels.email"
              :rules="[validation.isRequired, validation.isEmail]"
            />
            <v-textarea v-model="profile.address" :label="labels.address" />
            <v-text-field
              v-model="profile.maxPeople"
              type="number"
              :label="labels.maxPeople"
            />
          </v-form>
        </v-card-text>
        <v-card-text v-else>
          <p>
            <v-icon class="mx-2">mdi-account</v-icon>{{ labels.name }}:
            {{ profile.name || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">mdi-phone</v-icon>{{ labels.phoneNumber }}:
            {{ profile.phoneNumber || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">mdi-email</v-icon>{{ labels.email }}:
            {{ profile.email || 'Empty' }}
          </p>
          <p>
            <v-icon class="mx-2">mdi-google-maps</v-icon>{{ labels.address }}:
          </p>
          <div class="ml-4">
            <a
              v-if="profile.address"
              style="white-space: pre-wrap"
              target="_blank"
              :href="`https://www.google.com/maps/search/?api=1&query=${removeNewLines(profile.address)}`"
              >{{ profile.address }}</a
            >
            <div v-else>Empty</div>
          </div>
          <p>
            <v-icon class="mx-2">mdi-account-multiple-check</v-icon>
            {{ labels.maxPeople }}:
            {{ profile.maxPeople != null ? profile.maxPeople : 'Empty' }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="!editable" @click.stop="editable = true">
            <v-icon start>mdi-account-edit</v-icon>Edit
          </v-btn>
          <v-btn v-if="editable" @click.stop="updateProfile">
            <v-icon start>mdi-content-save</v-icon>Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <Snackbar ref="snackbar" />
  </v-row>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import isEmail from 'validator/lib/isEmail'
import { useNuxtApp } from '#app'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import constants from '~/helpers/constants'
import type { FormInstance } from '~/helpers/types'

useHead({ title: 'Profile' })

type UserProfile = {
  name: string
  email: string
  phoneNumber: string
  address: string
  maxPeople: number
}

const labels = {
  name: 'Name',
  phoneNumber: 'Phone Number',
  email: 'Email',
  address: 'Address',
  maxPeople: 'Max people at residence',
}

const userStore = useUserStore()
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const profileForm = ref<FormInstance | null>(null)
const editable = ref(false)
const loading = ref(true)
const profile = reactive<UserProfile>({
  name: '',
  email: '',
  phoneNumber: '',
  address: '',
  maxPeople: 0,
})

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isEmail: (v: string) => !v || isEmail(v) || 'Invalid email',
  isPhone: (v: string) =>
    !v ||
    parsePhoneNumber(v, { regionCode: 'US' }).valid ||
    'Invalid phone number',
}

let unsubscribe: (() => void) | null = null

const nuxtApp = useNuxtApp()
const db = (nuxtApp as any).$db

onMounted(() => {
  const userRef = dbRef(db, `users/${userStore.user!.uid}`)
  unsubscribe = onValue(userRef, (snapshot) => {
    const val = snapshot.val()
    if (val) Object.assign(profile, val)
    loading.value = false
  })
  setTimeout(() => {
    loading.value = false
  }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => {
  unsubscribe?.()
})

function removeNewLines(str: string): string {
  return str.replace(/\n/g, ' ')
}

async function updateProfile() {
  try {
    const result = await profileForm.value?.validate()
    if (!result?.valid) return

    await update(dbRef(db, `users/${userStore.user!.uid}`), {
      name: profile.name,
      queryableName: profile.name.toLowerCase(),
      phoneNumber: profile.phoneNumber
        ? (parsePhoneNumber(profile.phoneNumber, { regionCode: 'US' }).number
            ?.national ?? null)
        : null,
      address: profile.address,
      email: profile.email,
      maxPeople: profile.maxPeople ?? null,
    })
    editable.value = false
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  }
}
</script>

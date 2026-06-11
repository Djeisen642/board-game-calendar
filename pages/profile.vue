<template>
  <v-row justify="center">
    <v-col cols="12" sm="11" md="9" lg="6">
      <v-card>
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" class="mr-3">mdi-account-circle</v-icon>
          <span class="page-title">Profile</span>
          <v-spacer />
          <v-btn v-if="!editable && !loading" variant="elevated" color="primary" size="small" @click.stop="editable = true">
            <v-icon start>mdi-pencil</v-icon>Edit
          </v-btn>
          <v-btn v-if="editable" variant="elevated" color="success" size="small" @click.stop="updateProfile">
            <v-icon start>mdi-content-save</v-icon>Save
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="loading" class="pa-8">
          <v-progress-linear indeterminate color="primary" />
        </v-card-text>
        <v-card-text v-else-if="editable" class="pa-6">
          <v-form ref="profileForm">
            <v-text-field v-model="profile.name" :label="labels.name" :rules="[validation.isRequired]" prepend-inner-icon="mdi-account-outline" class="mb-1" />
            <v-text-field v-model="profile.phoneNumber" :label="labels.phoneNumber" :rules="[validation.isPhone]" prepend-inner-icon="mdi-phone-outline" class="mb-1" />
            <v-text-field v-model="profile.email" :label="labels.email" :rules="[validation.isRequired, validation.isEmail]" prepend-inner-icon="mdi-email-outline" class="mb-1" />
            <v-textarea v-model="profile.address" :label="labels.address" prepend-inner-icon="mdi-map-marker-outline" rows="3" />
            <v-text-field v-model="profile.maxPeople" type="number" :label="labels.maxPeople" :rules="[validation.isMaxPeople]" prepend-inner-icon="mdi-account-multiple-outline" />
          </v-form>
        </v-card-text>
        <v-card-text v-else class="pa-6">
          <div class="profile-fields">
            <div v-for="field in profileFields" :key="field.icon" class="profile-field">
              <v-icon size="20" color="primary" class="profile-field-icon">{{ field.icon }}</v-icon>
              <div>
                <div class="profile-field-label">{{ field.label }}</div>
                <div class="profile-field-value">
                  <template v-if="field.isAddress && profile.address">
                    <a style="white-space: pre-wrap" target="_blank" rel="noopener noreferrer" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(removeNewLines(profile.address))}`" class="address-link">{{ profile.address }}</a>
                  </template>
                  <template v-else>{{ field.value || 'Not set' }}</template>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import isEmail from 'validator/lib/isEmail'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import constants from '~/helpers/constants'
import type { FormInstance } from '~/helpers/types'

useHead({ title: 'Profile' })

type UserProfile = { name: string; email: string; phoneNumber: string; address: string; maxPeople: number }

const labels = { name: 'Name', phoneNumber: 'Phone Number', email: 'Email', address: 'Address', maxPeople: 'Max people at residence' }

const userStore = useUserStore()
const nuxtApp = useNuxtApp()
const db = nuxtApp.$db
const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const profileForm = ref<FormInstance | null>(null)
const editable = ref(false)
const loading = ref(true)
const profile = reactive<UserProfile>({ name: '', email: '', phoneNumber: '', address: '', maxPeople: 0 })

const profileFields = computed(() => [
  { icon: 'mdi-account', label: labels.name, value: profile.name },
  { icon: 'mdi-phone', label: labels.phoneNumber, value: profile.phoneNumber },
  { icon: 'mdi-email', label: labels.email, value: profile.email },
  { icon: 'mdi-map-marker', label: labels.address, value: profile.address, isAddress: true },
  { icon: 'mdi-account-multiple-check', label: labels.maxPeople, value: profile.maxPeople != null ? String(profile.maxPeople) : '' },
])

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isEmail: (v: string) => !v || isEmail(v) || 'Invalid email',
  isPhone: (v: string) => !v || parsePhoneNumber(v, { regionCode: 'US' }).valid || 'Invalid phone number',
  isMaxPeople: (v: number | string) => v == null || v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 1000) || 'Must be a whole number between 0 and 1000',
}

let unsubscribe: (() => void) | null = null



onMounted(() => {
  const userRef = dbRef(db, `users/${userStore.user!.uid}`)
  unsubscribe = onValue(userRef, (snapshot) => { const val = snapshot.val(); if (val) Object.assign(profile, val); loading.value = false }, (err) => {
    loading.value = false
    snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true)
  })
  setTimeout(() => { loading.value = false }, constants.LoadingTimeoutInMs)
})

onUnmounted(() => { unsubscribe?.() })

function removeNewLines(str: string): string { return str.replace(/\n/g, ' ') }

async function updateProfile() {
  try {
    const result = await profileForm.value?.validate()
    if (!result?.valid) return
    await update(dbRef(db, `users/${userStore.user!.uid}`), {
      name: profile.name, queryableName: profile.name.toLowerCase(),
      phoneNumber: profile.phoneNumber ? (parsePhoneNumber(profile.phoneNumber, { regionCode: 'US' }).number?.national ?? null) : null,
      address: profile.address, email: profile.email,
      // v-text-field type="number" still models a string; rules require a number
      maxPeople: profile.maxPeople != null && `${profile.maxPeople}` !== '' ? Number(profile.maxPeople) : null,
    })
    editable.value = false
  } catch (err) { snackbar.value?.showSnackbarWithMessage(helpers.handleError(err).message, true) }
}
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 600; }
.profile-fields { display: flex; flex-direction: column; gap: 20px; }
.profile-field { display: flex; align-items: flex-start; gap: 14px; }
.profile-field-icon { margin-top: 2px; opacity: 0.9; }
.profile-field-label { font-size: 0.875rem; color: rgba(205,214,244,0.7); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; margin-bottom: 2px; }
.profile-field-value { font-size: 1rem; color: rgba(205,214,244,0.95); }
.address-link { color: #00cec9; text-decoration: none; transition: color 0.2s ease; }
.address-link:hover { color: #55efc4; }
</style>

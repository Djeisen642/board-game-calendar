<template>
  <v-row justify="center" align="center">
    <v-col cols="12" sm="8" md="6">
      <v-card>
        <v-card-title class="text-h5">Sign In</v-card-title>
        <v-card-text>
          <v-btn
            block
            class="mb-3"
            :loading="loading"
            @click="signInWithGoogle"
          >
            <v-icon start>mdi-google</v-icon>
            Continue with Google
          </v-btn>
          <v-btn
            block
            class="mb-3"
            :loading="loading"
            @click="signInWithFacebook"
          >
            <v-icon start>mdi-facebook</v-icon>
            Continue with Facebook
          </v-btn>

          <v-divider class="my-4" />

          <v-form ref="emailForm" @submit.prevent="handleEmailSignIn">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              autocomplete="email"
              :rules="[validation.isRequired, validation.isEmail]"
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              autocomplete="current-password"
              :rules="[validation.isRequired]"
            />
            <v-btn
              type="submit"
              block
              color="primary"
              :loading="loading"
              class="mb-2"
            >
              Sign In with Email
            </v-btn>
            <v-btn
              block
              variant="text"
              :disabled="loading"
              @click="handleEmailSignUp"
            >
              Create Account
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
      <Snackbar ref="snackbar" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { ref as dbRef, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import isEmail from 'validator/lib/isEmail'
import { useNuxtApp } from '#app'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import routes from '~/helpers/routes'
import type { FormInstance } from '~/helpers/types'

useHead({ title: 'Sign In' })

const userStore = useUserStore()
const router = useRouter()

const nuxtApp = useNuxtApp()
const auth = (nuxtApp as any).$auth
const db = (nuxtApp as any).$db
const logEvent = (nuxtApp as any).$logEvent

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const emailForm = ref<FormInstance | null>(null)
const loading = ref(false)
const email = ref('')
const password = ref('')

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isEmail: (v: string) => !v || isEmail(v) || 'Invalid email',
}

onMounted(() => {
  if (userStore.user) {
    router.push(routes.gameCollection)
  }
})

async function handleOAuthSignIn(
  provider: GoogleAuthProvider | FacebookAuthProvider
) {
  loading.value = true
  try {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    userStore.setUser(user)
    logEvent('login', { method: provider.providerId })
    await update(dbRef(db, `users/${user.uid}`), {
      name: user.displayName,
      queryableName: user.displayName?.toLowerCase() ?? null,
      email: user.email,
      phoneNumber: user.phoneNumber
        ? (parsePhoneNumber(user.phoneNumber, { regionCode: 'US' }).number
            ?.national ?? user.phoneNumber)
        : null,
    })
    router.push(routes.gameCollection)
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  } finally {
    loading.value = false
  }
}

const signInWithGoogle = () => handleOAuthSignIn(new GoogleAuthProvider())
const signInWithFacebook = () => handleOAuthSignIn(new FacebookAuthProvider())

async function handleEmailSignIn() {
  const result = await emailForm.value?.validate()
  if (!result?.valid) return
  loading.value = true
  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    userStore.setUser(user)
    logEvent('login', { method: 'email' })
    router.push(routes.gameCollection)
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  } finally {
    loading.value = false
  }
}

async function handleEmailSignUp() {
  const result = await emailForm.value?.validate()
  if (!result?.valid) return
  loading.value = true
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    userStore.setUser(user)
    logEvent('sign_up', { method: 'email' })
    await update(dbRef(db, `users/${user.uid}`), {
      name: user.email,
      queryableName: user.email?.toLowerCase() ?? null,
      email: user.email,
    })
    router.push(routes.gameCollection)
  } catch (err) {
    snackbar.value?.showSnackbarWithMessage(
      helpers.handleError(err).message,
      true
    )
  } finally {
    loading.value = false
  }
}
</script>

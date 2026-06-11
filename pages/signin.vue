<template>
  <v-row justify="center" align="center">
    <v-col cols="12" sm="8" md="5">
      <div class="text-center mb-6">
        <v-icon size="48" color="primary" class="mb-2">mdi-chess-bishop</v-icon>
        <h1 class="signin-title">Welcome back</h1>
        <p class="signin-subtitle">Sign in to manage your game nights</p>
      </div>
      <v-card class="pa-2">
        <v-card-text>
          <v-btn
            block
            size="large"
            class="mb-3 social-btn google-btn"
            :loading="loading"
            @click="signInWithGoogle"
          >
            <v-icon start>mdi-google</v-icon>
            Continue with Google
          </v-btn>
          <v-btn
            block
            size="large"
            class="mb-3 social-btn facebook-btn"
            :loading="loading"
            @click="signInWithFacebook"
          >
            <v-icon start>mdi-facebook</v-icon>
            Continue with Facebook
          </v-btn>

          <div class="divider-row my-5">
            <v-divider />
            <span class="divider-text">or</span>
            <v-divider />
          </div>

          <v-form ref="emailForm" @submit.prevent="handleEmailSignIn">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              autocomplete="email"
              prepend-inner-icon="mdi-email-outline"
              :rules="[validation.isRequired, validation.isEmail]"
              class="mb-1"
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock-outline"
              :rules="[validation.isRequired, validation.isPassword]"
              class="mb-2"
            />
            <div class="d-flex justify-end mb-2">
              <v-btn
                variant="text"
                size="small"
                color="accent"
                :disabled="loading"
                @click="handleForgotPassword"
              >
                Forgot password?
              </v-btn>
            </div>
            <!-- Honeypot: hidden from real users, bots fill this in -->
            <input
              v-model="honeypot"
              type="text"
              name="username"
              autocomplete="username"
              tabindex="-1"
              aria-hidden="true"
              class="bot-trap"
            />
            <NuxtTurnstile v-if="turnstileEnabled" v-model="turnstileToken" class="mb-3" />
            <v-btn
              type="submit"
              block
              color="primary"
              size="large"
              :loading="loading"
              class="mb-3"
            >
              Sign In
            </v-btn>
            <v-btn
              block
              variant="text"
              color="accent"
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
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { ref as dbRef, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import isEmail from 'validator/lib/isEmail'
import Snackbar from '~/components/Snackbar.vue'
import helpers from '~/helpers/helpers'
import { authErrorMessage } from '~/helpers/authErrors'
import routes from '~/helpers/routes'
import type { FormInstance } from '~/helpers/types'

useHead({ title: 'Sign In' })

const userStore = useUserStore()
const router = useRouter()

const nuxtApp = useNuxtApp()
const auth = nuxtApp.$auth
const db = nuxtApp.$db
const logEvent = nuxtApp.$logEvent

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const emailForm = ref<FormInstance | null>(null)
const loading = ref(false)
const email = ref('')
const password = ref('')
const honeypot = ref('')
const turnstileToken = ref('')
// Turnstile is client-side deterrence only (static site — the token is never
// verified server-side). Without a configured site key the widget can never
// produce a token, which would lock everyone out of email sign-in, so the
// gate is skipped entirely in that case.
const turnstileEnabled = !!useRuntimeConfig().public.turnstileSiteKey

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isEmail: (v: string) => !v || isEmail(v) || 'Invalid email',
  // Firebase Auth's minimum password length
  isPassword: (v: string) => !v || v.length >= 6 || 'At least 6 characters',
}

function showAuthError(err: unknown) {
  helpers.handleError(err) // logs to analytics
  snackbar.value?.showSnackbarWithMessage(authErrorMessage(err), true)
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
    showAuthError(err)
  } finally {
    loading.value = false
  }
}

const signInWithGoogle = () => handleOAuthSignIn(new GoogleAuthProvider())
const signInWithFacebook = () => handleOAuthSignIn(new FacebookAuthProvider())

async function handleEmailSignIn() {
  const result = await emailForm.value?.validate()
  if (!result?.valid) return
  if (honeypot.value) return // bot trap
  if (turnstileEnabled && !turnstileToken.value) {
    snackbar.value?.showSnackbarWithMessage('Please complete the security check.', true)
    return
  }
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
    showAuthError(err)
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  if (!email.value || !isEmail(email.value)) {
    snackbar.value?.showSnackbarWithMessage(
      'Enter your email address above first, then click "Forgot password?".',
      true
    )
    return
  }
  loading.value = true
  try {
    await sendPasswordResetEmail(auth, email.value)
    snackbar.value?.showSnackbarWithMessage(
      'Password reset email sent. Check your inbox.',
      false
    )
  } catch (err) {
    showAuthError(err)
  } finally {
    loading.value = false
  }
}

async function handleEmailSignUp() {
  const result = await emailForm.value?.validate()
  if (!result?.valid) return
  if (honeypot.value) return // bot trap
  if (turnstileEnabled && !turnstileToken.value) {
    snackbar.value?.showSnackbarWithMessage('Please complete the security check.', true)
    return
  }
  loading.value = true
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    await sendEmailVerification(user)
    userStore.setUser(user)
    logEvent('sign_up', { method: 'email' })
    await update(dbRef(db, `users/${user.uid}`), {
      name: user.email,
      queryableName: user.email?.toLowerCase() ?? null,
      email: user.email,
      emailVerified: false,
    })
    snackbar.value?.showSnackbarWithMessage(
      'Account created! Check your email to verify your address.',
      false
    )
    router.push(routes.gameCollection)
  } catch (err) {
    showAuthError(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signin-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgba(205, 214, 244, 0.95);
}

.signin-subtitle {
  font-size: 1rem;
  color: rgba(205, 214, 244, 0.8);
}

.social-btn {
  font-weight: 500;
  border: 1px solid rgba(108, 92, 231, 0.15);
  transition: all 0.25s ease;
}

.social-btn:hover {
  border-color: rgba(108, 92, 231, 0.3);
  background: rgba(108, 92, 231, 0.06) !important;
}

.google-btn {
  color: #cdd6f4;
}

.facebook-btn {
  color: #cdd6f4;
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.divider-text {
  font-size: 0.875rem;
  color: rgba(205, 214, 244, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

/* Honeypot: visually hidden but present in DOM so bots fill it */
.bot-trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>

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
            :loading="isLoading"
            @click="signInWithGoogle"
          >
            <v-icon start>mdi-google</v-icon>
            Continue with Google
          </v-btn>
          <v-btn
            block
            size="large"
            class="mb-3 social-btn facebook-btn"
            :loading="isLoading"
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

          <v-form ref="emailForm" @submit.prevent="submitEmailSignIn">
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
                :disabled="isLoading"
                @click="submitForgotPassword"
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
              :loading="isLoading"
              class="mb-3"
            >
              Sign In
            </v-btn>
            <v-btn
              block
              variant="text"
              color="accent"
              :disabled="isLoading"
              @click="submitEmailSignUp"
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
import { ref, watch, onMounted } from 'vue'
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import isEmail from 'validator/lib/isEmail'
import Snackbar from '~/components/Snackbar.vue'
import routes from '~/helpers/routes'
import type { FormInstance } from '~/helpers/types'

useHead({ title: 'Sign In' })

const userStore = useUserStore()
const router = useRouter()

const snackbar = ref<InstanceType<typeof Snackbar> | null>(null)
const emailForm = ref<FormInstance | null>(null)
const email = ref('')
const password = ref('')
const honeypot = ref('')
const turnstileToken = ref('')
// Turnstile is client-side deterrence only (static site — the token is never
// verified server-side). Without a configured site key the widget can never
// produce a token, which would lock everyone out of email sign-in, so the
// gate is skipped entirely in that case.
const turnstileEnabled = !!useRuntimeConfig().public.turnstileSiteKey

const {
  isLoading,
  errorMessage,
  handleOAuthSignIn,
  handleEmailSignIn,
  handleEmailSignUp,
  handleForgotPassword,
} = useAuthSignIn()

watch(errorMessage, (message) => {
  if (message) {
    snackbar.value?.showSnackbarWithMessage(message, true)
    errorMessage.value = null
  }
})

const validation = {
  isRequired: (v: string) => !!v || 'Required',
  isEmail: (v: string) => !v || isEmail(v) || 'Invalid email',
  // Firebase Auth's minimum password length
  isPassword: (v: string) => !v || v.length >= 6 || 'At least 6 characters',
}

onMounted(() => {
  if (userStore.user) {
    router.push(routes.gameCollection)
  }
})

const signInWithGoogle = () => handleOAuthSignIn(new GoogleAuthProvider())
const signInWithFacebook = () => handleOAuthSignIn(new FacebookAuthProvider())

// shared bot/validation gate for the email flows
async function emailFormReady(): Promise<boolean> {
  const result = await emailForm.value?.validate()
  if (!result?.valid) return false
  if (honeypot.value) return false // bot trap
  if (turnstileEnabled && !turnstileToken.value) {
    snackbar.value?.showSnackbarWithMessage('Please complete the security check.', true)
    return false
  }
  return true
}

async function submitEmailSignIn() {
  if (!(await emailFormReady())) return
  await handleEmailSignIn(email.value, password.value)
}

async function submitEmailSignUp() {
  if (!(await emailFormReady())) return
  const created = await handleEmailSignUp(email.value, password.value)
  if (created) {
    snackbar.value?.showSnackbarWithMessage(
      'Account created! Check your email to verify your address.',
      false
    )
  }
}

async function submitForgotPassword() {
  if (!email.value || !isEmail(email.value)) {
    snackbar.value?.showSnackbarWithMessage(
      'Enter your email address above first, then click "Forgot password?".',
      true
    )
    return
  }
  const sent = await handleForgotPassword(email.value)
  if (sent) {
    snackbar.value?.showSnackbarWithMessage(
      'Password reset email sent. Check your inbox.',
      false
    )
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

import { ref } from 'vue'
import {
  type GoogleAuthProvider,
  type FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { ref as dbRef, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import helpers from '~/helpers/helpers'
import { authErrorMessage } from '~/helpers/authErrors'
import routes from '~/helpers/routes'

// The four sign-in flows. Each handler resolves to true on success; on failure
// it logs the error and exposes a user-facing message via errorMessage.
export function useAuthSignIn() {
  const userStore = useUserStore()
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const auth = nuxtApp.$auth
  const db = nuxtApp.$db
  const logEvent = nuxtApp.$logEvent

  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  function fail(err: unknown): false {
    helpers.handleError(err) // logs to analytics
    errorMessage.value = authErrorMessage(err)
    return false
  }

  // email/queryableEmail are validated against auth.token.email by the
  // security rules, so they always come from the auth user, never form input.
  // Absent fields are skipped, not nulled — a null in update() would delete
  // profile data the user saved (e.g. their phone number) on every sign-in.
  function writeProfile(user: User, name: string | null) {
    const profile: Record<string, string> = {}
    if (name) {
      profile.name = name
      profile.queryableName = name.toLowerCase()
    }
    if (user.email) {
      profile.email = user.email
      profile.queryableEmail = user.email.toLowerCase()
    }
    if (user.phoneNumber) {
      const nationalPhone =
        parsePhoneNumber(user.phoneNumber, { regionCode: 'US' }).number
          ?.national ?? user.phoneNumber
      profile.phoneNumber = nationalPhone
      profile.queryablePhone = nationalPhone.replace(/\D/g, '')
    }
    if (!Object.keys(profile).length) return Promise.resolve()
    return update(dbRef(db, `users/${user.uid}`), profile)
  }

  async function handleOAuthSignIn(
    provider: GoogleAuthProvider | FacebookAuthProvider
  ): Promise<boolean> {
    isLoading.value = true
    try {
      const { user } = await signInWithPopup(auth, provider)
      userStore.setUser(user)
      logEvent('login', { method: provider.providerId })
      await writeProfile(user, user.displayName)
      await router.push(routes.gameCollection)
      return true
    } catch (err) {
      return fail(err)
    } finally {
      isLoading.value = false
    }
  }

  async function handleEmailSignIn(
    email: string,
    password: string
  ): Promise<boolean> {
    isLoading.value = true
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      userStore.setUser(user)
      logEvent('login', { method: 'email' })
      await router.push(routes.gameCollection)
      return true
    } catch (err) {
      return fail(err)
    } finally {
      isLoading.value = false
    }
  }

  async function handleEmailSignUp(
    email: string,
    password: string
  ): Promise<boolean> {
    isLoading.value = true
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      await sendEmailVerification(user)
      userStore.setUser(user)
      logEvent('sign_up', { method: 'email' })
      // no display name at signup; the email doubles as the name until the
      // user edits their profile
      await writeProfile(user, user.email)
      await router.push(routes.gameCollection)
      return true
    } catch (err) {
      return fail(err)
    } finally {
      isLoading.value = false
    }
  }

  async function handleForgotPassword(email: string): Promise<boolean> {
    isLoading.value = true
    try {
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (err) {
      return fail(err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    handleOAuthSignIn,
    handleEmailSignIn,
    handleEmailSignUp,
    handleForgotPassword,
  }
}

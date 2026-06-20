import { ref } from 'vue'
import {
  type GoogleAuthProvider,
  type FacebookAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth'
import { ref as dbRef, update } from 'firebase/database'
import { parsePhoneNumber } from 'awesome-phonenumber'
import helpers from '~/helpers/helpers'
import { authErrorMessage } from '~/helpers/authErrors'
import routes from '~/helpers/routes'

export function useAuthSignIn() {
  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()
  const nuxtApp = useNuxtApp()
  const auth = nuxtApp.$auth
  const db = nuxtApp.$db
  const logEvent = nuxtApp.$logEvent

  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  function fail(err: unknown): false {
    helpers.handleError(err)
    errorMessage.value = authErrorMessage(err)
    return false
  }

  // Honor ?redirect=… set by the auth middleware (e.g. an email RSVP
  // deep-link), but only for internal paths to avoid an open-redirect.
  function redirectTarget(): string {
    const redirect = route.query.redirect
    if (typeof redirect === 'string' && /^\/(?!\/)/.test(redirect)) {
      return redirect
    }
    return routes.gameCollection
  }

  // queryableEmail is validated against the *verified* auth token email by
  // the security rules (otherwise anyone could squat a stranger's address at
  // signup), so it always comes from the auth user, never form input — and
  // only once verified. The token is fresh at sign-in, so emailVerified is
  // current here. Absent fields are skipped, not nulled — a null in update()
  // would delete profile data the user saved (e.g. their phone number) on
  // every sign-in.
  async function writeProfile(user: User, name: string | null) {
    const publicProfile: Record<string, string> = {}
    if (name) {
      publicProfile.name = name
      publicProfile.queryableName = name.toLowerCase()
    }
    if (user.email && user.emailVerified) {
      publicProfile.queryableEmail = user.email.toLowerCase()
    }
    if (user.phoneNumber) {
      const nationalPhone =
        parsePhoneNumber(user.phoneNumber, { regionCode: 'US' }).number
          ?.national ?? user.phoneNumber
      publicProfile.queryablePhone = nationalPhone.replace(/\D/g, '')
      await update(dbRef(db, `users/${user.uid}`), {
        phoneNumber: nationalPhone,
      })
    }
    if (Object.keys(publicProfile).length) {
      await update(dbRef(db, `profiles/${user.uid}`), publicProfile)
    }
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
      await router.push(redirectTarget())
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
  }
}

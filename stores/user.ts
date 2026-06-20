import { defineStore } from 'pinia'
import type { User, AuthProvider, OAuthCredential } from 'firebase/auth'
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  linkWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth'

function getCredentialFromError(
  provider: AuthProvider,
  error: unknown
): OAuthCredential | null {
  if (provider instanceof GoogleAuthProvider)
    return GoogleAuthProvider.credentialFromError(error as Error)
  if (provider instanceof FacebookAuthProvider)
    return FacebookAuthProvider.credentialFromError(error as Error)
  return null
}

async function signInWithProvider(
  auth: ReturnType<typeof import('firebase/auth').getAuth>,
  provider: AuthProvider
) {
  try {
    return await signInWithPopup(auth, provider)
  } catch (error: unknown) {
    const code = (error as { code?: string }).code
    if (code !== 'auth/account-exists-with-different-credential') throw error

    // An account already exists with this email under the other provider.
    // Sign in with that provider then link the pending credential.
    const pendingCred = getCredentialFromError(provider, error)
    const otherProvider =
      provider instanceof GoogleAuthProvider
        ? new FacebookAuthProvider()
        : new GoogleAuthProvider()

    const result = await signInWithPopup(auth, otherProvider)
    if (pendingCred) await linkWithCredential(result.user, pendingCred)
    return result
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    setUser(user: User | null) {
      this.user = user
    },
    signInWithGoogle() {
      const { $auth } = useNuxtApp()
      return signInWithProvider($auth, new GoogleAuthProvider())
    },
    signInWithFacebook() {
      const { $auth } = useNuxtApp()
      return signInWithProvider($auth, new FacebookAuthProvider())
    },
    async signOut() {
      const { $auth } = useNuxtApp()
      await firebaseSignOut($auth)
      this.user = null
    },
  },
})

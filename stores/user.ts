import { defineStore } from 'pinia'
import type { User, AuthProvider, OAuthCredential } from 'firebase/auth'
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth'

function getProviderForMethod(method: string): AuthProvider {
  if (method === GoogleAuthProvider.PROVIDER_ID) return new GoogleAuthProvider()
  if (method === FacebookAuthProvider.PROVIDER_ID)
    return new FacebookAuthProvider()
  throw new Error(`Unsupported provider: ${method}`)
}

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

    const email = (error as { customData?: { email?: string } }).customData
      ?.email
    if (!email) throw error

    const pendingCred = getCredentialFromError(provider, error)
    const methods = await fetchSignInMethodsForEmail(auth, email)
    const existingProvider = getProviderForMethod(methods[0])

    // Sign in with the existing provider, then link the pending credential
    const result = await signInWithPopup(auth, existingProvider)
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

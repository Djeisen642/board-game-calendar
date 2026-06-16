import { onAuthStateChanged, getAuth } from 'firebase/auth'
import { defineNuxtPlugin } from 'nuxt/app'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()
  const auth = getAuth()

  // Keep the listener alive for the lifetime of the app so that server-side
  // account revocation, token refresh, and forced sign-out are reflected
  // immediately rather than only on the next page load.
  await new Promise<void>((resolve) => {
    let resolved = false
    onAuthStateChanged(auth, (user) => {
      userStore.setUser(user)
      if (!resolved) {
        resolved = true
        resolve()
      }
    })
  })
})

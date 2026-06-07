import { onAuthStateChanged } from 'firebase/auth'
import { defineNuxtPlugin } from '#app'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(async (nuxtApp) => {
  const userStore = useUserStore()
  const auth = (nuxtApp as any).$auth

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      userStore.setUser(user)
      unsubscribe()
      resolve()
    })
  })
})

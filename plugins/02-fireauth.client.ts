import { onAuthStateChanged, getAuth } from 'firebase/auth'
import { defineNuxtPlugin } from 'nuxt/app'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()
  const auth = getAuth()

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      userStore.setUser(user)
      unsubscribe()
      resolve()
    })
  })
})

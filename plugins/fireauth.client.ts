import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '~/plugins/firebase'

export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      userStore.setUser(user)
      unsubscribe()
      resolve()
    })
  })
})

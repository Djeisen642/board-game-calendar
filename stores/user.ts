import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { useNuxtApp } from '#app'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    setUser(user: User | null) {
      this.user = user
    },
    signInWithGoogle() {
      const nuxtApp = useNuxtApp()
      const auth = (nuxtApp as any).$auth
      return signInWithPopup(auth, new GoogleAuthProvider())
    },
    async signOut() {
      const nuxtApp = useNuxtApp()
      const auth = (nuxtApp as any).$auth
      await firebaseSignOut(auth)
      this.user = null
    },
  },
})

import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '~/plugins/firebase'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    setUser(user: User | null) {
      this.user = user
    },
    signInWithGoogle() {
      return signInWithPopup(auth, new GoogleAuthProvider())
    },
    async signOut() {
      await firebaseSignOut(auth)
      this.user = null
    },
  },
})

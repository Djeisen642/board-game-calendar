import Vuex, { ActionContext, Store } from 'vuex'
import firebase from 'firebase/app'
import { auth, authProviders } from '~/plugins/firebase'

export type StoreType = {
  user:firebase.User|null
}

export default ():Store<StoreType> => {
  return new Vuex.Store({
    state: {
      user: null
    },
    getters: {
      activeUser: (state) => {
        return state.user
      }
    },
    mutations: {
      setUser (state, payload) {
        state.user = payload
      }
    },
    actions: {
      autoSignIn ({ commit }, payload) {
        commit('setUser', payload)
      },

      signInWithGoogle () {
        return auth.signInWithRedirect(authProviders.Google)
      },

      async signOut ({ commit }:ActionContext<StoreType, StoreType>) {
        await auth.signOut()
        commit('setUser', null)
      }
    }
  })
}

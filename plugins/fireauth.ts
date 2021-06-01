import { Context } from '@nuxt/types'
import { auth } from '~/plugins/firebase'

export default (context:Context):Promise<boolean> => {
  const { store } = context

  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        store.commit('setUser', user)
        return resolve(true)
      }
      return resolve(false)
    })
  })
}

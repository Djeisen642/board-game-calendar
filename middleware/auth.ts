import { Context } from '@nuxt/types'
import GameCollection from '~/pages/GameCollection.vue'
import SignIn from '~/pages/SignIn.vue'
import index from '~/pages/index.vue'

export default function ({ store, redirect, route }:Context):void {
  if (store.state.user) {
    route.name === SignIn.name && redirect(GameCollection.route)
  } else if (route.name) {
    ![index.name, SignIn.name].includes(route.name) && redirect(SignIn.route)
  }
}

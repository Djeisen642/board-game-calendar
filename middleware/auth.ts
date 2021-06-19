import { Context } from '@nuxt/types'
import SignIn from '~/pages/SignIn.vue'
import index from '~/pages/index.vue'
import GameCollection from '~/pages/GameCollection.vue'

export default function ({ store, redirect, route }:Context):void {
  if (store.state.user) {
    route.name === SignIn.routeName && redirect(GameCollection.route)
  } else if (route.name) {
    ![index.routeName, SignIn.routeName].includes(route.name) && redirect(SignIn.route)
  }
}

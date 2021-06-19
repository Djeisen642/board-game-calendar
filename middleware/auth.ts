import { Context } from '@nuxt/types'
// import GameCollection from '~/pages/GameCollection.vue'
// import SignIn from '~/pages/SignIn.vue'
// import index from '~/pages/index.vue'

export default function ({ store, redirect, route }:Context):void {
  console.log(route.name)
  // if (store.state.user) {
  //   route.name === SignIn.routeName && redirect(GameCollection.route)
  // } else if (route.name) {
  //   ![index.routeName, SignIn.routeName].includes(route.name) && redirect(SignIn.route)
  // }
}

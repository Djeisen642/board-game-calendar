import { Context } from '@nuxt/types'

export default function ({ store, redirect, route }:Context):void {
  if (store.state.user) {
    route.name === 'Login' && redirect('/inspire')
  } else if (route.name) {
    !['index', 'Login'].includes(route.name) && redirect('/login')
  }
}

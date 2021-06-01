import { Context } from '@nuxt/types'

export default function ({ store, redirect, route }:Context):void {
  if (store.state.user) {
    route.name === 'SignIn' && redirect('/inspire')
  } else if (route.name) {
    !['index', 'SignIn'].includes(route.name) && redirect('/signin')
  }
}

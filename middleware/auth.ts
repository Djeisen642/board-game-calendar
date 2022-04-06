import { Context } from '@nuxt/types'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

export default function ({ store, redirect, route }: Context): void {
  if (store.state.user) {
    route.name === names.signIn && redirect(routes.gameCollection)
  } else if (route.name) {
    ![names.index, names.signIn].includes(route.name) && redirect(routes.signIn)
  }
}

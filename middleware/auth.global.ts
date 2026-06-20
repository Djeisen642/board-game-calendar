import routes from '~/helpers/routes'
import names from '~/helpers/names'

export default defineNuxtRouteMiddleware((to) => {
  const userStore = useUserStore()

  if (userStore.user) {
    if (to.name === names.signIn) {
      return navigateTo(routes.gameCollection)
    }
  } else if (
    to.name &&
    ![names.index, names.signIn].includes(to.name as string)
  ) {
    // Preserve the intended destination (incl. query, e.g. email RSVP
    // deep-links) so sign-in can return the user there.
    return navigateTo({ path: routes.signIn, query: { redirect: to.fullPath } })
  }
})

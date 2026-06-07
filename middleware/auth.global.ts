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
    return navigateTo(routes.signIn)
  }
})

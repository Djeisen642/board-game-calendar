import { nextTick } from 'vue'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { $logEvent } = useNuxtApp()
  let initialNavDone = false

  router.afterEach(async () => {
    if (!initialNavDone) {
      initialNavDone = true
      return
    }
    await nextTick()
    $logEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    })
  })
})

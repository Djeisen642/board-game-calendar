import { computed } from 'vue'

// Cookie/analytics consent, persisted in localStorage and shared app-wide via
// Nuxt `useState`. `null` means the visitor has not answered yet (show the
// banner); 'granted'/'denied' are their choice. Only analytics is gated here —
// strictly-necessary cookies (Firebase Auth session, App Check abuse
// prevention) are always on and are disclosed in the privacy policy.
export type ConsentValue = 'granted' | 'denied'

const STORAGE_KEY = 'bgc-cookie-consent'

export function useCookieConsent() {
  const consent = useState<ConsentValue | null>('cookie-consent', () => null)

  // Hydrate from localStorage the first time this runs on the client.
  if (import.meta.client && consent.value === null) {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      consent.value = stored
    }
  }

  const hasResponded = computed(() => consent.value !== null)
  const analyticsAllowed = computed(() => consent.value === 'granted')

  function set(value: ConsentValue) {
    consent.value = value
    if (import.meta.client) {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  }

  const acceptAll = () => set('granted')
  const rejectAll = () => set('denied')

  // Clears the stored choice so the banner reappears ("Cookie settings").
  function reopen() {
    consent.value = null
    if (import.meta.client) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { consent, hasResponded, analyticsAllowed, acceptAll, rejectAll, reopen }
}

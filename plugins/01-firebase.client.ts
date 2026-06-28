import { defineNuxtPlugin } from 'nuxt/app'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import type { Analytics } from 'firebase/analytics'
import firebaseConf from '~/firebase.config'
import type { ConsentValue } from '~/composables/useCookieConsent'

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export default defineNuxtPlugin(() => {
  if (getApps().length === 0) {
    initializeApp(firebaseConf)
  }

  const app = getApp()
  const config = useRuntimeConfig()

  if (config.public.recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(config.public.recaptchaSiteKey as string),
      isTokenAutoRefreshEnabled: true,
    })
  }

  const db = getDatabase(app)
  const auth = getAuth(app)
  const functions = getFunctions(app)

  let _analytics: Analytics | null = null
  let _pendingUserId: string | null | undefined = undefined
  let _analyticsRequested = false
  let _firebaseLogEvent:
    | ((analytics: Analytics, name: string, params?: Record<string, string>) => void)
    | null = null
  let _firebaseSetUserId:
    | ((analytics: Analytics, id: string | null) => void)
    | null = null
  let _firebaseSetCollectionEnabled:
    | ((analytics: Analytics, enabled: boolean) => void)
    | null = null

  // Analytics is only loaded after the visitor grants consent (see the cookie
  // banner). Until then nothing from firebase/analytics is imported, so no
  // analytics cookies are set and no gtag script loads.
  const enableAnalytics = () => {
    if (typeof window === 'undefined') return
    if (_analytics) {
      _firebaseSetCollectionEnabled?.(_analytics, true)
      return
    }
    if (_analyticsRequested) return
    _analyticsRequested = true
    import('firebase/analytics').then(
      ({
        isSupported,
        getAnalytics,
        logEvent: fbLogEvent,
        setUserId: fbSetUserId,
        setAnalyticsCollectionEnabled,
      }) => {
        _firebaseLogEvent = fbLogEvent
        _firebaseSetUserId = fbSetUserId
        _firebaseSetCollectionEnabled = setAnalyticsCollectionEnabled
        isSupported().then((yes) => {
          if (yes) {
            _analytics = getAnalytics(app)
            if (_pendingUserId !== undefined) {
              fbSetUserId(_analytics, _pendingUserId)
            }
          }
        })
      }
    )
  }

  const disableAnalytics = () => {
    if (_analytics) {
      _firebaseSetCollectionEnabled?.(_analytics, false)
    }
  }

  if (import.meta.client) {
    const { consent } = useCookieConsent()
    watch(
      consent,
      (value: ConsentValue | null) => {
        if (value === 'granted') enableAnalytics()
        else if (value === 'denied') disableAnalytics()
      },
      { immediate: true }
    )
  }

  const logEvent = (
    eventName: string,
    params?: Record<string, unknown>
  ): void => {
    if (_analytics && _firebaseLogEvent) {
      _firebaseLogEvent(_analytics, eventName, params as Record<string, string>)
    }
  }

  const log = (
    logLevel: LogLevel,
    message: string,
    details?: Record<string, string>
  ): void => {
    logEvent(logLevel, { message, ...details })
  }

  const setAnalyticsUserId = (uid: string | null): void => {
    if (_analytics && _firebaseSetUserId) {
      _firebaseSetUserId(_analytics, uid)
    } else {
      _pendingUserId = uid
    }
  }

  return {
    provide: {
      auth,
      db,
      functions,
      logEvent,
      log,
      setAnalyticsUserId,
    },
  }
})

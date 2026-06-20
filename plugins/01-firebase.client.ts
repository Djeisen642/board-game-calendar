import { defineNuxtPlugin } from 'nuxt/app'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import type { Analytics } from 'firebase/analytics'
import firebaseConf from '~/firebase.config'

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

  if (typeof window !== 'undefined') {
    import('firebase/analytics').then(
      ({ isSupported, getAnalytics, logEvent: fbLogEvent, setUserId: fbSetUserId }) => {
        isSupported().then((yes) => {
          if (yes) {
            _analytics = getAnalytics(app)
            if (_pendingUserId !== undefined) {
              fbSetUserId(_analytics, _pendingUserId)
            }
          }
        })
        _firebaseLogEvent = fbLogEvent
        _firebaseSetUserId = fbSetUserId
      }
    )
  }

  let _firebaseLogEvent:
    | ((analytics: Analytics, name: string, params?: Record<string, string>) => void)
    | null = null
  let _firebaseSetUserId:
    | ((analytics: Analytics, id: string | null) => void)
    | null = null

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

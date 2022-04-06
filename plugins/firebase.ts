import firebase from 'firebase/compat/app'
import firebaseConf from '~/firebase.config.js'
import 'firebase/compat/database'
import 'firebase/compat/auth'
import 'firebase/compat/analytics'

!firebase.apps.length && firebase.initializeApp(firebaseConf)

export const authProviders = {
  Google: {
    provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    providerId: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  },
  Email: {
    provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
    providerId: firebase.auth.EmailAuthProvider.PROVIDER_ID,
  },
  Facebook: {
    provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    providerId: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
  },
}
export const db = firebase.database()
export const auth = firebase.auth()
export const analytics = firebase.analytics()
export const logEvent = analytics.logEvent

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export const log = (
  logLevel: LogLevel,
  message: string,
  details?: Record<string, string>
): void => {
  analytics.logEvent(logLevel, {
    message,
    details,
  })
}

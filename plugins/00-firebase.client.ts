import { defineNuxtPlugin } from '#app'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'
import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  isSupported,
} from 'firebase/analytics'
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

  const db = getDatabase(app)
  const auth = getAuth(app)

  let _analytics: ReturnType<typeof getAnalytics> | null = null

  if (typeof window !== 'undefined') {
    isSupported().then((yes) => {
      if (yes) _analytics = getAnalytics(app)
    })
  }

  const logEvent = (
    eventName: string,
    params?: Record<string, unknown>
  ): void => {
    if (_analytics) {
      firebaseLogEvent(_analytics, eventName, params as Record<string, string>)
    }
  }

  const log = (
    logLevel: LogLevel,
    message: string,
    details?: Record<string, string>
  ): void => {
    logEvent(logLevel, { message, ...details })
  }

  return {
    provide: {
      auth,
      db,
      logEvent,
      log,
    },
  }
})

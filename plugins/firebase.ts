import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'
import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  isSupported,
} from 'firebase/analytics'
import firebaseConf from '~/firebase.config'

if (getApps().length === 0) {
  initializeApp(firebaseConf)
}

export const db = getDatabase(getApp())
export const auth = getAuth(getApp())

let _analytics: ReturnType<typeof getAnalytics> | null = null

if (typeof window !== 'undefined') {
  isSupported().then((yes) => {
    if (yes) _analytics = getAnalytics(getApp())
  })
}

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export const logEvent = (
  eventName: string,
  params?: Record<string, unknown>
): void => {
  if (_analytics) {
    firebaseLogEvent(_analytics, eventName, params as Record<string, string>)
  }
}

export const log = (
  logLevel: LogLevel,
  message: string,
  details?: Record<string, string>
): void => {
  logEvent(logLevel, { message, ...details })
}

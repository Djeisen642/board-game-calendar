import type { Database } from 'firebase/database'
import type { Auth } from 'firebase/auth'
import type { LogLevel } from '~/plugins/01-firebase.client'

declare module 'nuxt/app' {
  interface NuxtApp {
    $auth: Auth
    $db: Database
    $logEvent: (eventName: string, params?: Record<string, unknown>) => void
    $log: (
      logLevel: LogLevel,
      message: string,
      details?: Record<string, string>
    ) => void
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $auth: Auth
    $db: Database
    $logEvent: (eventName: string, params?: Record<string, unknown>) => void
    $log: (
      logLevel: LogLevel,
      message: string,
      details?: Record<string, string>
    ) => void
  }
}

export {}

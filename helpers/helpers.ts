
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export default {
  handleError(error: unknown): Error {
    const errorMessage = typeof error === 'string' ? error : 'Unknown error'
    const handledError =
      error instanceof Error ? error : new Error(errorMessage)
    const nuxtApp = useNuxtApp()
    const log = (nuxtApp as any).$log
    if (log) {
      log(LogLevel.ERROR, handledError.message, {
        stack: handledError.stack ?? '',
      })
    }
    return handledError
  },

  decodeHtml(string: string): string {
    const txt = document.createElement('textarea')
    txt.innerHTML = string
    return txt.value
  },
}

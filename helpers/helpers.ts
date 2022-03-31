import { log, LogLevel } from '~/plugins/firebase'

export default {
  handleError (error: unknown):Error {
    const errorMessage = typeof error === 'string' ? error : 'Unknown error'
    const handledError = error instanceof Error ? error : new Error(errorMessage)
    log(LogLevel.ERROR, handledError.message, { stack: handledError.stack || '' })
    return handledError
  },

  decodeHtml (string:string):string {
    const txt = document.createElement('textarea')
    txt.innerHTML = string
    return txt.value
  }
}

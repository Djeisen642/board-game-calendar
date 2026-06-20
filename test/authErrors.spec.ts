import { describe, it, expect } from 'vitest'
import { authErrorMessage } from '~/helpers/authErrors'

describe('authErrorMessage', () => {
  it('maps known auth error codes to friendly messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'Sign-in failed. Please try again.'
    )
    expect(
      authErrorMessage({ code: 'auth/popup-blocked' })
    ).toContain('popup')
    expect(
      authErrorMessage({ code: 'auth/account-exists-with-different-credential' })
    ).toContain('different sign-in method')
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(authErrorMessage({ code: 'auth/some-new-code' })).toBe(
      'Something went wrong. Please try again.'
    )
  })

  it('handles non-error inputs without throwing', () => {
    expect(authErrorMessage(null)).toBe(
      'Something went wrong. Please try again.'
    )
    expect(authErrorMessage('boom')).toBe(
      'Something went wrong. Please try again.'
    )
    expect(authErrorMessage(undefined)).toBe(
      'Something went wrong. Please try again.'
    )
  })
})

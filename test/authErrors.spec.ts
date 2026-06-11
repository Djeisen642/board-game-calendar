import { describe, it, expect } from 'vitest'
import { authErrorMessage } from '~/helpers/authErrors'

describe('authErrorMessage', () => {
  it('maps known auth error codes to friendly messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'Incorrect email or password.'
    )
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toContain(
      'already exists'
    )
    expect(authErrorMessage({ code: 'auth/weak-password' })).toContain(
      'at least 6 characters'
    )
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

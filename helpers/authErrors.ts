const messages: Record<string, string> = {
  'auth/invalid-credential': 'Sign-in failed. Please try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes and try again.',
  'auth/popup-closed-by-user': 'Sign-in was canceled.',
  'auth/cancelled-popup-request': 'Sign-in was canceled.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
  'auth/network-request-failed':
    'Network error. Check your connection and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code && messages[code]) return messages[code]
  return 'Something went wrong. Please try again.'
}

// Mock for firebase/auth — used when NUXT_PUBLIC_SCREENSHOT_MODE=true.
// onAuthStateChanged immediately resolves with a fake user so the Pinia
// store is populated and the auth middleware lets all routes through.

const FAKE_USER = {
  uid: 'screenshot-uid-1',
  email: 'player@example.com',
  displayName: 'Alex Johnson',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  phoneNumber: null,
  providerData: [] as unknown[],
  metadata: {
    creationTime: '2024-01-01T00:00:00Z',
    lastSignInTime: '2024-06-01T00:00:00Z',
  },
  tenantId: null,
  providerId: 'firebase',
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({
    token: 'mock-id-token',
    claims: {} as Record<string, unknown>,
    authTime: '',
    issuedAtTime: '',
    expirationTime: '',
    signInProvider: 'password' as string | null,
    signInSecondFactor: null,
  }),
  reload: async () => {},
  toJSON: () => ({}),
} as const

export type MockUser = typeof FAKE_USER

class MockAuth {
  currentUser: MockUser | null = FAKE_USER
  languageCode: string | null = null
}

const _mockAuth = new MockAuth()

export function getAuth(_app?: unknown): MockAuth {
  return _mockAuth
}

export function onAuthStateChanged(
  _auth: MockAuth,
  callback: (user: MockUser | null) => void,
  _onError?: (err: Error) => void
): () => void {
  setTimeout(() => callback(FAKE_USER), 0)
  return () => {}
}

export async function signInWithPopup(): Promise<never> {
  throw new Error('signInWithPopup is unavailable in screenshot mode')
}

export async function signInWithEmailAndPassword(): Promise<never> {
  throw new Error(
    'signInWithEmailAndPassword is unavailable in screenshot mode'
  )
}

export async function createUserWithEmailAndPassword(): Promise<never> {
  throw new Error(
    'createUserWithEmailAndPassword is unavailable in screenshot mode'
  )
}

export async function fetchSignInMethodsForEmail(): Promise<string[]> {
  return []
}

export async function linkWithCredential(): Promise<never> {
  throw new Error('linkWithCredential is unavailable in screenshot mode')
}

export async function sendEmailVerification(): Promise<void> {}

export async function sendPasswordResetEmail(): Promise<void> {}

export async function signOut(): Promise<void> {}

export async function updateProfile(): Promise<void> {}

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com'
  static credentialFromError(_error: unknown) {
    return null
  }
  addScope(_scope: string) {
    return this
  }
}

export class FacebookAuthProvider {
  static PROVIDER_ID = 'facebook.com'
  static credentialFromError(_error: unknown) {
    return null
  }
  providerId = 'facebook.com'
}

export class OAuthProvider {
  constructor(public providerId: string) {}
}

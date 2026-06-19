// Mock for firebase/functions — used when NUXT_PUBLIC_SCREENSHOT_MODE=true.
// httpsCallable returns empty results; BGG search is not needed when
// displaying existing collection data from fixtures.

export function getFunctions(_app?: unknown, _region?: string): Record<string, never> {
  return {}
}

export function httpsCallable(_functions: unknown, _name: string) {
  return async (_data?: unknown) => ({ data: { items: [] } })
}

export function connectFunctionsEmulator(): void {}

// Mock for firebase/analytics — used when NUXT_PUBLIC_SCREENSHOT_MODE=true.

export function getAnalytics(): null { return null }
export function logEvent(): void {}
export async function isSupported(): Promise<boolean> { return false }

// Mock for firebase/app-check — used when NUXT_PUBLIC_SCREENSHOT_MODE=true.
// Prevents App Check from attempting to fetch a reCAPTCHA token.

export function initializeAppCheck(): void {}

export class ReCaptchaV3Provider {
  constructor(public siteKey: string) {}
}

export class ReCaptchaEnterpriseProvider {
  constructor(public siteKey: string) {}
}

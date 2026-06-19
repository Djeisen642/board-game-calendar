#!/usr/bin/env node
/**
 * Screenshot tool for Board Game Calendar.
 *
 * Usage:
 *   yarn screenshot /calendar
 *   yarn screenshot /gamecollection --mobile
 *   yarn screenshot /calendar --desktop --full-page
 *   yarn screenshot /calendar --fixture scripts/fixtures/custom.json
 *
 * The dev server is started automatically in screenshot mode if not already
 * running. Firebase is fully mocked — no credentials needed.
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createConnection } from 'net'
import { spawn, execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE_URL = 'http://localhost:3005'
const SCREENSHOTS_DIR = join(ROOT, 'screenshots')
const DEFAULT_FIXTURE = join(ROOT, 'scripts/fixtures/default.json')

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
  })
}

async function waitForPort(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isPortListening(port)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function ensureChromium() {
  try {
    chromium.executablePath()
  } catch {
    console.log('Installing Playwright Chromium...')
    execSync('npx playwright install chromium --with-deps', { stdio: 'inherit', cwd: ROOT })
  }
}

// ── Dev server ─────────────────────────────────────────────────────────────

let _devServerProc = null

async function ensureDevServer() {
  if (await isPortListening(3005)) {
    console.log('Using existing dev server on :3005')
    return false
  }
  console.log('Starting dev server in screenshot mode...')
  _devServerProc = spawn('yarn', ['dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NUXT_PUBLIC_SCREENSHOT_MODE: 'true' },
  })
  _devServerProc.stdout?.on('data', (d) => process.stdout.write(d))
  _devServerProc.stderr?.on('data', (d) => process.stderr.write(d))

  const ready = await waitForPort(3005, 90_000)
  if (!ready) throw new Error('Dev server did not start within 90 s')
  // Brief pause for Nuxt to finish its warm-up logs
  await new Promise((r) => setTimeout(r, 1500))
  return true
}

function stopDevServer() {
  if (_devServerProc) {
    _devServerProc.kill('SIGTERM')
    _devServerProc = null
  }
}

// ── Screenshot ─────────────────────────────────────────────────────────────

async function takeScreenshots(route, viewportNames, fullPage, fixture) {
  const browser = await chromium.launch({ headless: true })
  const saved = []

  try {
    for (const vpName of viewportNames) {
      const vp = VIEWPORTS[vpName]
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      })

      // Inject fixture data before any page script runs
      await ctx.addInitScript((data) => {
        window.__SCREENSHOT_FIXTURE = data
      }, fixture)

      const page = await ctx.newPage()

      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      // Wait for loading spinners to clear (mock onValue fires after 50 ms,
      // Vue needs another tick to re-render; 2 s is comfortably enough)
      await page.waitForFunction(
        () => document.querySelectorAll('.v-progress-linear--indeterminate').length === 0,
        { timeout: 5_000 },
      ).catch(() => {})
      await page.waitForTimeout(300)

      mkdirSync(SCREENSHOTS_DIR, { recursive: true })
      const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'index'
      const filename = `${slug}-${vpName}.png`
      const filepath = join(SCREENSHOTS_DIR, filename)
      await page.screenshot({ path: filepath, fullPage })
      console.log(`  ✓ ${filepath}`)
      saved.push(filepath)

      await ctx.close()
    }
  } finally {
    await browser.close()
  }

  return saved
}

// ── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const route = args.find((a) => a.startsWith('/')) ?? '/'
const mobileOnly = args.includes('--mobile')
const desktopOnly = args.includes('--desktop')
const fullPage = args.includes('--full-page')
const fixtureArg = args[args.indexOf('--fixture') + 1]
const fixturePath = fixtureArg ? resolve(process.cwd(), fixtureArg) : DEFAULT_FIXTURE
const viewports = mobileOnly ? ['mobile'] : desktopOnly ? ['desktop'] : ['mobile', 'desktop']

if (!existsSync(fixturePath)) {
  console.error(`Fixture not found: ${fixturePath}`)
  process.exit(1)
}
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))

let startedServer = false
try {
  ensureChromium()
  startedServer = await ensureDevServer()
  console.log(`\nScreenshotting ${route} (${viewports.join(', ')})...`)
  const files = await takeScreenshots(route, viewports, fullPage, fixture)
  console.log(`\nDone. ${files.length} file(s) saved to screenshots/`)
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  if (startedServer) stopDevServer()
}

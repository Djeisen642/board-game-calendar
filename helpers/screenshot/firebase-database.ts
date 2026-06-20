// Mock for firebase/database — used when NUXT_PUBLIC_SCREENSHOT_MODE=true.
// Reads from window.__SCREENSHOT_FIXTURE, which is injected by the Playwright
// script via page.addInitScript before any page JS runs.

type FixtureData = Record<string, unknown>

declare global {
  interface Window {
    __SCREENSHOT_FIXTURE?: FixtureData
  }
}

function getFixture(): FixtureData {
  return typeof window !== 'undefined' && window.__SCREENSHOT_FIXTURE
    ? window.__SCREENSHOT_FIXTURE
    : {}
}

function getAtPath(data: FixtureData, path: string): unknown {
  const parts = path.split('/').filter(Boolean)
  let curr: unknown = data
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return null
    curr = (curr as FixtureData)[part]
  }
  return curr ?? null
}

export class MockRef {
  constructor(public readonly _path: string) {}
  get key(): string | null {
    return this._path.split('/').pop() ?? null
  }
}

export class MockDataSnapshot {
  constructor(
    private readonly _value: unknown,
    private readonly _key: string | null = null
  ) {}
  val(): unknown {
    return this._value
  }
  exists(): boolean {
    return this._value !== null && this._value !== undefined
  }
  get key(): string | null {
    return this._key
  }
}

export const mockDatabaseInstance: Record<string, never> = {}

export function getDatabase(_app?: unknown) {
  return mockDatabaseInstance
}

export function ref(_db: unknown, path: string): MockRef {
  return new MockRef(path)
}

export function child(parentRef: MockRef, path: string): MockRef {
  return new MockRef(`${parentRef._path}/${path}`)
}

export function onValue(
  dbRef: MockRef,
  callback: (snapshot: MockDataSnapshot) => void,
  _errorCallback?: (err: Error) => void
): () => void {
  const value = getAtPath(getFixture(), dbRef._path)
  // Defer so Vue's reactivity system is set up before data arrives
  setTimeout(() => callback(new MockDataSnapshot(value, dbRef.key)), 50)
  return () => {}
}

export function get(dbRef: MockRef): Promise<MockDataSnapshot> {
  const value = getAtPath(getFixture(), dbRef._path)
  return Promise.resolve(new MockDataSnapshot(value, dbRef.key))
}

export function set(_ref: MockRef, _value: unknown): Promise<void> {
  return Promise.resolve()
}

export function remove(_ref: MockRef): Promise<void> {
  return Promise.resolve()
}

export function update(
  _ref: unknown,
  _updates?: Record<string, unknown>
): Promise<void> {
  return Promise.resolve()
}

let _pushCounter = 0
export function push(parentRef: MockRef): MockRef {
  return new MockRef(`${parentRef._path}/mock-push-${++_pushCounter}`)
}

// Query builder stubs — screenshot mode never runs live queries
export function query(dbRef: MockRef, ..._constraints: unknown[]): MockRef {
  return dbRef
}
export function orderByChild(_path: string) {
  return { type: 'orderByChild', path: _path }
}
export function startAt(_value: unknown, _key?: string) {
  return { type: 'startAt', value: _value }
}
export function endAt(_value: unknown, _key?: string) {
  return { type: 'endAt', value: _value }
}
export function limitToFirst(_limit: number) {
  return { type: 'limitToFirst', limit: _limit }
}
export function limitToLast(_limit: number) {
  return { type: 'limitToLast', limit: _limit }
}
export function orderByKey() {
  return { type: 'orderByKey' }
}
export function orderByValue() {
  return { type: 'orderByValue' }
}
export function equalTo(_value: unknown, _key?: string) {
  return { type: 'equalTo', value: _value }
}

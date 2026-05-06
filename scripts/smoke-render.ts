/**
 * Smoke render: server-renders <App /> at every route to catch first-render
 * React errors that build-time TS can't see (missing Providers, hook-order
 * issues, throw-during-render bugs).
 *
 * Synchronous SSR via react-dom/server is enough for this — we don't need a
 * real DOM. localStorage isn't available, so contexts that touch it must
 * tolerate its absence (they do — both ScopeContext and Sidebar wrap reads
 * in try/catch).
 *
 * Run: `npx tsx scripts/smoke-render.ts`. Exits 0 on success, 1 on any
 * thrown error or React error-boundary trigger.
 */

const errors: string[] = []
const origError = console.error
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '))
  origError(...args)
}

const ROUTES = [
  '/',
  '/dashboard',
  '/pos',
  '/offerings',
  '/people/roles',
  '/people/directory',
  '/people/directory/p0000001-0000-0000-0000-000000000008', // Aroha Henare — visible to Leila
  '/people/directory/p0000001-0000-0000-0000-000000000001', // Sarah Chen — out of Leila's scope, expect Navigate
  '/people/directory/this-is-not-a-real-person',
  '/finance/charges',
  '/finance/refunds',
  '/finance/adjustments',
  '/admin/org',
  '/admin/audit',
  '/no-access',
  '/totally-fake-route',
]

async function main() {
  // Stub the bits ScopeContext / Sidebar reach for so SSR doesn't blow up.
  const g = globalThis as unknown as Record<string, unknown>
  g.window = { addEventListener: () => {}, removeEventListener: () => {} }
  g.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }

  const React = await import('react')
  const { renderToString } = await import('react-dom/server')
  const { StaticRouter } = await import('react-router-dom/server')
  const { AppProviders } = await import('../src/contexts/index.tsx')
  const { AppRoutes } = await import('../src/routes/index.tsx')
  const { bootstrapSeed } = await import('../src/mocks/index.ts')

  bootstrapSeed()

  let failed = 0
  for (const route of ROUTES) {
    const before = errors.length
    let html = ''
    try {
      html = renderToString(
        React.createElement(
          StaticRouter,
          { location: route },
          React.createElement(
            AppProviders,
            null,
            React.createElement(AppRoutes, null),
          ),
        ),
      )
    } catch (e) {
      console.log(`✗ ${route} threw: ${(e as Error).message}`)
      failed += 1
      continue
    }
    const newErrors = errors.slice(before).filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('not implemented') &&
        !e.includes('act(...)') &&
        !e.includes('not wrapped in act') &&
        !e.includes('Future Flag'),
    )
    if (newErrors.length > 0) {
      console.log(`✗ ${route} produced ${newErrors.length} error(s):`)
      for (const msg of newErrors) console.log(`    ${msg.slice(0, 200)}`)
      failed += 1
    } else {
      console.log(`✓ ${route} (${html.length} chars rendered)`)
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} route(s) failed.`)
    process.exit(1)
  }
  console.log(`\nAll ${ROUTES.length} routes rendered cleanly.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

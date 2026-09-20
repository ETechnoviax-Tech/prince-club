import assert from 'assert'
import { APP_DOMAIN, API_DOMAIN, FRONTEND_URL, API_URL, isOriginAllowed } from '../server/config/domain.js'
import { resolveApiBase } from '../frontend/src/api/client.js'

async function runDomainRoutingTests() {
  console.log('🧪 [Test Suite] Dynamic Domain & API Routing Validation')

  // 1. Configured domain variables
  console.log(`\n1. Active Domain Configuration:`)
  console.log(`   APP_DOMAIN:   ${APP_DOMAIN}`)
  console.log(`   API_DOMAIN:   ${API_DOMAIN}`)
  console.log(`   FRONTEND_URL: ${FRONTEND_URL}`)
  console.log(`   API_URL:      ${API_URL}`)

  assert.strictEqual(APP_DOMAIN, '69club1.site', 'APP_DOMAIN should match configured domain')
  assert.strictEqual(API_DOMAIN, 'api.69club1.site', 'API_DOMAIN should match configured api subdomain')

  // 2. CORS dynamic origin matching
  console.log('\n2. Testing CORS Origin Verification:')
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'https://69club1.site',
    'https://www.69club1.site',
    'https://api.69club1.site',
    'https://m.69club1.site',
  ]

  for (const origin of allowedOrigins) {
    const isAllowed = isOriginAllowed(origin)
    console.log(`   Origin: ${origin} -> Allowed: ${isAllowed}`)
    assert.strictEqual(isAllowed, true, `Origin ${origin} must be allowed`)
  }

  // Verify unauthorized origins are blocked
  const blockedOrigins = [
    'https://attacker.site',
    'https://fake-69club1.site.attacker.com',
    'http://otherdomain.org',
  ]

  for (const origin of blockedOrigins) {
    const isAllowed = isOriginAllowed(origin)
    console.log(`   Blocked Origin: ${origin} -> Allowed: ${isAllowed}`)
    assert.strictEqual(isAllowed, false, `Origin ${origin} must be blocked`)
  }

  // 3. API Base Resolver
  console.log('\n3. Testing API Base URL Resolution:')
  const apiBase = resolveApiBase()
  console.log(`   Resolved API Base (Node/SSR/Dev): ${apiBase}`)
  assert.ok(apiBase.endsWith('/api'), 'API base must end with /api')

  // 4. Live Server /api/health verification
  console.log('\n4. Live Health Check Verification:')
  const healthRes = await fetch('http://localhost:5000/api/health')
  const healthJson = await healthRes.json()
  console.log(`   Status: ${healthJson.status}`)
  console.log(`   Domain Info:`, healthJson.domain)
  assert.strictEqual(healthJson.status, 'ok', 'Health check must return ok')
  assert.strictEqual(healthJson.domain.app, '69club1.site', 'Domain app must match 69club1.site')
  assert.strictEqual(healthJson.domain.api, 'api.69club1.site', 'Domain api must match api.69club1.site')

  console.log('\n🎉 ALL DOMAIN ROUTING TESTS PASSED SUCCESSFULLY!')
}

runDomainRoutingTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

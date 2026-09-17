process.env.NODE_ENV = 'test'
import assert from 'assert'

async function runVercelHandlerTest() {
  console.log('🧪 Testing Vercel serverless handler export...')
  const { default: app } = await import('../api/index.js')
  assert.ok(app, 'App must be defined')
  assert.strictEqual(typeof app, 'function', 'App should be an Express request listener function')
  console.log('✅ Vercel serverless entry point api/index.js is valid!')
  process.exit(0)
}

runVercelHandlerTest().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})

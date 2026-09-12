import assert from 'assert'
import app from '../server/index.js'

async function run() {
  const server = app.listen(0)
  const port = server.address().port
  const base = `http://localhost:${port}/api/game/veer`

  try {
    console.log('1. Testing /api/game/veer/issue?typeId=30 (30s)...')
    const res1 = await fetch(`${base}/issue?typeId=30`)
    assert.strictEqual(res1.status, 200)
    const issue30 = await res1.json()
    console.log('Issue 30s:', issue30)
    assert(issue30.issueNumber)
    assert(issue30.secondsRemaining >= 0)

    console.log('\n2. Testing /api/game/veer/history?typeId=30&page=1...')
    const res2 = await fetch(`${base}/history?typeId=30&page=1`)
    assert.strictEqual(res2.status, 200)
    const history30 = await res2.json()
    console.log('History 30s items count:', history30?.list?.length)
    assert(history30?.list?.length > 0)
    console.log('Latest 2 outcomes:', history30.list.slice(0, 2))

    console.log('\n3. Testing /api/game/veer/issue?typeId=1 (1m)...')
    const res3 = await fetch(`${base}/issue?typeId=1`)
    assert.strictEqual(res3.status, 200)
    const issue1m = await res3.json()
    console.log('Issue 1m:', issue1m)
    assert(issue1m.issueNumber)

    console.log('\n✓ ALL VEER ENDPOINTS VERIFIED SUCCESSFULLY!')
  } finally {
    server.close()
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})

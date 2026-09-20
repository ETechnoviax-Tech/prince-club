/**
 * Automated Verification Script for 55 CLUB Live API Integration
 * Tests direct connectivity to https://api.api55clubapi.com,
 * live issue number synchronization, and draw history retrieval.
 */
import { getLiveIssue, getLiveHistory } from '../server/services/veerGameService.js'

async function runTests() {
  console.log('🧪 Starting 55 CLUB Live API Verification...\n')
  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      failed++
    }
  }

  // 1. Test Win Go 30s Live Issue
  try {
    const issue30 = await getLiveIssue(30)
    assert(
      issue30.success === true &&
      typeof issue30.issueNumber === 'string' &&
      issue30.issueNumber.length >= 16,
      `Win Go 30s live round fetched: ${issue30.issueNumber} (remaining: ${issue30.secondsRemaining}s, source: ${issue30.source})`
    )
    assert(issue30.source === '55club', 'Win Go 30s primary source is 55club official API')
  } catch (err) {
    assert(false, `Win Go 30s live issue error: ${err.message}`)
  }

  // 2. Test Win Go 1m Live Issue
  try {
    const issue1 = await getLiveIssue(1)
    assert(
      issue1.success === true &&
      typeof issue1.issueNumber === 'string' &&
      issue1.issueNumber.includes('10001'),
      `Win Go 1m live round format verified: ${issue1.issueNumber}`
    )
  } catch (err) {
    assert(false, `Win Go 1m live issue error: ${err.message}`)
  }

  // 3. Test Win Go 3m Live Issue
  try {
    const issue2 = await getLiveIssue(2)
    assert(
      issue2.success === true &&
      typeof issue2.issueNumber === 'string' &&
      issue2.issueNumber.includes('10002'),
      `Win Go 3m live round format verified: ${issue2.issueNumber}`
    )
  } catch (err) {
    assert(false, `Win Go 3m live issue error: ${err.message}`)
  }

  // 4. Test Win Go 5m Live Issue
  try {
    const issue3 = await getLiveIssue(3)
    assert(
      issue3.success === true &&
      typeof issue3.issueNumber === 'string' &&
      issue3.issueNumber.includes('10003'),
      `Win Go 5m live round format verified: ${issue3.issueNumber}`
    )
  } catch (err) {
    assert(false, `Win Go 5m live issue error: ${err.message}`)
  }

  // 5. Test Live History Retrieval
  try {
    const history = await getLiveHistory(30, 1)
    assert(
      history.success === true &&
      Array.isArray(history.list) &&
      history.list.length > 0,
      `Live draw history returned ${history.list?.length} rounds from 55CLUB`
    )

    const first = history.list[0]
    assert(
      typeof first.digit === 'number' &&
      ['red', 'green', 'violet'].includes(first.color) &&
      ['Big', 'Small'].includes(first.size),
      `First draw outcome valid: digit ${first.digit} (${first.color}, ${first.size})`
    )
  } catch (err) {
    assert(false, `Live history error: ${err.message}`)
  }

  console.log(`\n===================================`)
  console.log(`Summary: ${passed} passed, ${failed} failed`)
  console.log(`===================================`)

  if (failed > 0) process.exit(1)
}

runTests()

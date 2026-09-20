import assert from 'assert'
import { sound } from '../frontend/src/utils/audio.js'

async function runAudioGuardTests() {
  console.log('🧪 [Test Suite] Audio Guard & Sound Isolation Validation')

  // 1. Initial State: Sound must be inactive by default
  console.log('\n1. Verifying initial state:')
  console.log(`   sound.gameActive: ${sound.gameActive}`)
  assert.strictEqual(sound.gameActive, false, 'gameActive must be false by default')

  // 2. Mock playTone to ensure no sound is played when unauthenticated/not playing
  let playedCount = 0
  const originalPlayTone = sound.playTone.bind(sound)
  sound.playTone = function (...args) {
    playedCount++
    return originalPlayTone(...args)
  }

  console.log('\n2. Testing sounds while unauthenticated/outside game:')
  sound.playTick()
  sound.playLockTick()
  sound.playBetPlaced()
  sound.playWin()
  console.log(`   Sound calls triggered when inactive: ${playedCount}`)
  assert.strictEqual(playedCount, 0, 'Zero sounds should play when gameActive is false')

  // 3. Testing sound activation inside active game session
  console.log('\n3. Testing sounds after entering active game session:')
  sound.setGameActive(true)
  assert.strictEqual(sound.gameActive, true, 'gameActive should become true')
  sound.playTick()
  console.log(`   Sound calls triggered after activation: ${playedCount}`)
  assert.strictEqual(playedCount, 1, 'Audio should play when gameActive is true')

  // 4. Testing immediate silencing upon navigating away or logging out
  console.log('\n4. Testing immediate silencing on logout/navigation:')
  sound.setGameActive(false)
  sound.playTick()
  sound.playLockTick()
  console.log(`   Sound calls after deactivation: ${playedCount}`)
  assert.strictEqual(playedCount, 1, 'No additional sounds should play after deactivation')

  console.log('\n🎉 ALL AUDIO GUARD TESTS PASSED SUCCESSFULLY!')
}

runAudioGuardTests().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

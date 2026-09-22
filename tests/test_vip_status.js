import { supabase, isSupabaseConfigured } from '../server/config/supabase.js'
import { generateToken } from '../server/middleware/auth.js'

process.env.NODE_ENV = 'test'

const API_BASE = 'http://localhost:5000/api'


async function runTest() {
  console.log('--- Testing VIP Status Real-Time API ---')
  const testPhone = '99' + Math.floor(10000000 + Math.random() * 90000000)
  let token = null
  let userId = null

  try {
    // 1. Create temporary test user with valid token
    if (isSupabaseConfigured) {
      const { data: profile, error } = await supabase.from('profiles').insert({
        phone: testPhone,
        username: `testuser_${Date.now()}`,
      }).select().single()


      if (error || !profile) {
        throw new Error(`Failed to create test profile: ${error?.message}`)
      }
      userId = profile.id
    } else {
      userId = 'test-vip-' + Date.now()
    }

    token = generateToken({ id: userId, role: 'user' })
    console.log('✅ Created temporary test user:', userId)


    if (!token || !userId) {
      throw new Error('Failed to obtain auth token for test user')
    }

    // 2. Fetch VIP status
    const vipRes = await fetch(`${API_BASE}/wallet/vip/status/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const vipData = await vipRes.json()
    console.log('VIP Status Response:', vipData)

    if (!vipRes.ok || !vipData.success) {
      throw new Error(`VIP status endpoint failed: ${JSON.stringify(vipData)}`)
    }

    if (typeof vipData.experience !== 'number') {
      throw new Error('vipData.experience is not a number')
    }
    if (typeof vipData.vipLevel !== 'number') {
      throw new Error('vipData.vipLevel is not a number')
    }
    if (typeof vipData.daysUntilPayout !== 'number') {
      throw new Error('vipData.daysUntilPayout is not a number')
    }
    if (!Array.isArray(vipData.history)) {
      throw new Error('vipData.history is not an array')
    }

    console.log('✅ Verified real-time VIP API contracts:')
    console.log(`   - Experience (turnover): ${vipData.experience} EXP`)
    console.log(`   - VIP Level: VIP${vipData.vipLevel}`)
    console.log(`   - Days Until Payout: ${vipData.daysUntilPayout} Days`)
    console.log(`   - History items count: ${vipData.history.length}`)

  } finally {
    // 3. STRICT CLEANUP: Delete temporary test user and test data immediately
    if (userId && isSupabaseConfigured) {
      console.log('🧹 Cleaning up test user and records...')
      await supabase.from('wallet_transactions').delete().eq('user_id', userId)
      await supabase.from('bets').delete().eq('user_id', userId)
      await supabase.from('wallets').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)
      console.log('✅ Cleaned up test user successfully.')
    }
  }
}

runTest()
  .then(() => {
    console.log('🎉 VIP Status API Test Passed!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ VIP Status API Test Failed:', err)
    process.exit(1)
  })

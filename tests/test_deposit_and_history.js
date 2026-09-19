import 'dotenv/config'
import http from 'http'
import { generateToken } from '../server/middleware/auth.js'

async function run() {
  console.log('--- TESTING DEPOSIT QR GENERATION & HISTORY ENDPOINTS ---')

  const testUserId = 'test-dep-user-99'
  const token = generateToken({ id: testUserId, username: 'tester' })

  // 1. Test Deposit endpoint returns both qrCode and qrCodeDataUrl
  const postData = JSON.stringify({ userId: testUserId, amount: 500 })
  const depResult = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:5000/api/payments/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) })
        } catch {
          resolve({ status: res.statusCode, data: d })
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })

  console.log('Deposit status:', depResult.status)
  if (depResult.status !== 201) {
    throw new Error(`Deposit creation failed with status ${depResult.status}: ${JSON.stringify(depResult.data)}`)
  }

  const { qrCode, qrCodeDataUrl, upiUri, merchantVPA } = depResult.data
  if (!qrCode || !qrCode.startsWith('data:image/png;base64,')) {
    throw new Error('qrCode is missing or invalid base64 data URL')
  }
  if (!qrCodeDataUrl || !qrCodeDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('qrCodeDataUrl is missing or invalid base64 data URL')
  }
  if (!upiUri || !upiUri.startsWith('upi://pay?')) {
    throw new Error('upiUri is missing or invalid')
  }

  console.log('✓ PASS: qrCode generated correctly:', qrCode.slice(0, 35) + '...')
  console.log('✓ PASS: qrCodeDataUrl generated correctly:', qrCodeDataUrl.slice(0, 35) + '...')
  console.log('✓ PASS: upiUri generated correctly:', upiUri)
  console.log('✓ PASS: merchantVPA:', merchantVPA)

  // 2. Test User Deposits History endpoint
  const depHistResult = await new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5000/api/payments/user/${testUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }))
    })
    req.on('error', reject)
  })

  if (depHistResult.status !== 200 || !Array.isArray(depHistResult.data.deposits)) {
    throw new Error('Failed to fetch user deposits history')
  }
  console.log(`✓ PASS: User deposits history endpoint returned ${depHistResult.data.deposits.length} records`)

  // 3. Test User Withdrawals History endpoint
  const withHistResult = await new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5000/api/wallet/withdrawals/${testUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }))
    })
    req.on('error', reject)
  })

  if (withHistResult.status !== 200 || !Array.isArray(withHistResult.data.withdrawals)) {
    throw new Error('Failed to fetch user withdrawals history')
  }
  console.log(`✓ PASS: User withdrawals history endpoint returned ${withHistResult.data.withdrawals.length} records`)

  console.log('ALL DEPOSIT & WITHDRAWAL TESTS PASSED!')
}

run().catch((err) => {
  console.error('Test Failed:', err)
  process.exit(1)
})

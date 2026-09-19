import 'dotenv/config'
import http from 'http'
import { generateToken } from '../server/middleware/auth.js'

const userId = 'e89ccff4-5115-4432-a088-0b981b40d9e5'
const token = generateToken({ id: userId, username: 'tester', role: 'user' })

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/game/bets/${userId}`,
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', (chunk) => (body += chunk))
  res.on('end', () => {
    try {
      const data = JSON.parse(body)
      console.log('HTTP Status:', res.statusCode)
      console.log('Total Bets Found:', data.bets ? data.bets.length : 0)

      if (data.bets && data.bets.length > 0) {
        data.bets.slice(0, 5).forEach((b, idx) => {
          console.log(`Bet [${idx + 1}]:`, {
            game_mode: b.game_mode,
            round_number: b.round_number,
            selection: b.selection,
            amount: b.amount,
            payout: b.payout,
            status: b.status,
            mult: b.mult || b.multiplier,
          })
        })

        // Verify assertions
        const aviatorBets = data.bets.filter((b) => b.game_mode === 'AVIATOR')
        console.log(`Aviator bets count: ${aviatorBets.length}`)
        if (aviatorBets.length > 0) {
          const first = aviatorBets[0]
          if (first.status === 'pending') {
            console.error('FAIL: Aviator bet status is still pending!')
            process.exit(1)
          } else {
            console.log(`SUCCESS: Aviator bet status normalized to '${first.status}'`)
          }
          if (!first.round_number || first.round_number === 'undefined') {
            console.error('FAIL: Round number is missing or undefined!')
            process.exit(1)
          } else {
            console.log(`SUCCESS: Aviator round number resolved to '${first.round_number}'`)
          }
        }
      }
      process.exit(0)
    } catch (e) {
      console.error('JSON parse error:', e.message, body)
      process.exit(1)
    }
  })
})

req.on('error', (err) => {
  console.error('HTTP Request failed:', err.message)
  process.exit(1)
})

req.end()

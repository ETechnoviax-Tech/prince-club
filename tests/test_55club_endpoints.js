import { call55ClubAPI } from '../server/services/veerGameService.js'

async function checkEndpoints() {
  console.log('Testing 55club API endpoints...')
  
  // Win Go
  try {
    const wg = await call55ClubAPI('/GetGameIssue', { typeId: 30 })
    console.log('WinGo 30s /GetGameIssue success:', wg.code, wg.data?.issueNumber)
  } catch (e) {
    console.log('WinGo issue failed:', e.message)
  }

  // K3 endpoints?
  // Let's test typical 55club/rajaluck endpoints
  const testEndpoints = [
    { ep: '/GetK3GameIssue', data: { typeId: 1 } },
    { ep: '/GetGameIssueK3', data: { typeId: 1 } },
    { ep: '/GetFiveDGameIssue', data: { typeId: 1 } },
    { ep: '/GetTrxGameIssue', data: { typeId: 1 } },
    { ep: '/GetGameIssue', data: { typeId: 10 } }, // typeId 10 or 20 for K3?
    { ep: '/GetGameIssue', data: { typeId: 4 } },
    { ep: '/GetGameIssue', data: { typeId: 5 } },
    { ep: '/GetNoaverageEmerdList', data: { typeId: 10, pageno: 1 } },
  ]

  for (const t of testEndpoints) {
    try {
      const res = await call55ClubAPI(t.ep, t.data)
      console.log(`Endpoint ${t.ep} with ${JSON.stringify(t.data)}: code=${res.code}`, res.data ? 'HAS DATA' : 'NO DATA')
      if (res.data) console.log(JSON.stringify(res.data).slice(0, 100))
    } catch (e) {
      console.log(`Endpoint ${t.ep} failed:`, e.message)
    }
  }
}

checkEndpoints()

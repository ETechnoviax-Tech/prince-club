async function testVeerApi() {
  const base = 'https://api.veergameapi.com/api/webapi'
  const endpoints = [
    '/GetGameIssue',
    '/WinGo/GetGameIssue',
    '/GetTypeList',
    '/WinGo/GetTypeList',
    '/GetNoaverageEmerdList',
    '/WinGo/GetNoaverageEmerdList',
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({ typeId: 1, type: 1 }),
      })
      console.log(`Endpoint: ${ep} -> Status: ${res.status}`)
      const text = await res.text()
      console.log('Response:', text.slice(0, 300))
    } catch (e) {
      console.log(`Endpoint: ${ep} -> Error:`, e.message)
    }
  }
}

testVeerApi()

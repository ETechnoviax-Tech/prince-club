async function testBackend() {
  try {
    const res = await fetch('http://localhost:5000/api/game/providers')
    const json = await res.json()
    console.log('Providers status:', res.status, json.providers?.length)

    const catRes = await fetch('http://localhost:5000/api/game/third-party/catalog?provider=JILI&limit=5')
    const catJson = await catRes.json()
    console.log('JILI Catalog count:', catJson.totalCount, 'games returned:', catJson.games?.length)
    if (catJson.games?.length > 0) {
      console.log('First JILI game:', catJson.games[0])
    }

    const evoRes = await fetch('http://localhost:5000/api/game/third-party/catalog?provider=EVO&limit=5')
    const evoJson = await evoRes.json()
    console.log('EVO Catalog count:', evoJson.totalCount, 'games returned:', evoJson.games?.length)
    if (evoJson.games?.length > 0) {
      console.log('First EVO game:', evoJson.games[0])
    }
  } catch (e) {
    console.error('Test error:', e.message)
  }
}

testBackend()

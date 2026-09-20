import crypto from 'crypto'

function ez() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (e) {
    var t = (Math.random() * 16) | 0,
      n = e === 'x' ? t : (t & 3) | 8
    return n.toString(16)
  })
}

function signPayload(data) {
  const Kce = ['signature', 'track', 'xosoBettingData']
  const t = { ...data }
  delete t.signature
  delete t.timestamp
  t.language = 'en'
  t.random = ez()

  const n = {}
  Object.keys(t)
    .sort()
    .forEach((r) => {
      const o = t[r]
      if (o !== null && o !== '' && !Kce.includes(r)) {
        n[r] = o === 0 ? 0 : o
      }
    })

  const payloadStr = JSON.stringify(n)
  t.signature = crypto.createHash('md5').update(payloadStr).digest('hex').toUpperCase().slice(0, 32)
  t.timestamp = Math.floor(Date.now() / 1000)
  return t
}

async function callVeer(endpoint, data = {}) {
  const signed = signPayload(data)
  const res = await fetch(`https://api.veergameapi.com/api/webapi${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Ar-Origin': 'https://www.veergame32.com',
      Referer: 'https://www.veergame32.com/',
      Origin: 'https://www.veergame32.com',
    },
    body: JSON.stringify(signed),
  })
  return res.json()
}

async function run() {
  console.log('--- 1. GetTypeList ---')
  const typeList = await callVeer('/GetTypeList')
  console.log('TypeList:', JSON.stringify(typeList, null, 2))

  console.log('\n--- 2. GetNoaverageEmerdList (History for typeId: 1) ---')
  const history = await callVeer('/GetNoaverageEmerdList', { typeId: 1, pageno: 1 })
  console.log('History sample:', JSON.stringify(history?.data?.list?.slice(0, 3), null, 2))
}

run()

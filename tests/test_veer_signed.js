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

async function testSignedCall() {
  const signedBody = signPayload({ typeId: 1 })
  console.log('Sending payload:', signedBody)

  const res = await fetch('https://api.veergameapi.com/api/webapi/GetGameIssue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Ar-Origin': 'https://www.veergame32.com',
      Referer: 'https://www.veergame32.com/',
      Origin: 'https://www.veergame32.com',
    },
    body: JSON.stringify(signedBody),
  })

  console.log('Status:', res.status)
  const json = await res.json()
  console.log('Response:', JSON.stringify(json, null, 2))
}

testSignedCall()

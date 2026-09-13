async function verify() {
  const htmlRes = await fetch('http://localhost:5173/')
  const html = await htmlRes.text()
  console.log('1. HTML Status:', htmlRes.status)
  console.log('   Contains #root:', html.includes('id="root"'))

  const jsRes = await fetch('http://localhost:5173/src/main.jsx')
  const js = await jsRes.text()
  console.log('2. JS Status:', jsRes.status)
  console.log('   Contains createRoot:', js.includes('createRoot'))
  console.log('   Starts with <!DOCTYPE (should be FALSE):', js.trim().startsWith('<!DOCTYPE'))

  const appRes = await fetch('http://localhost:5173/src/App.jsx')
  const appJs = await appRes.text()
  console.log('3. App.jsx Status:', appRes.status)
  console.log('   Contains VEERGAME:', appJs.includes('VEERGAME'))
}

verify().catch(console.error)

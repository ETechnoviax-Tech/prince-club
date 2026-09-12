async function findChunks() {
  const res = await fetch('https://www.veergame32.com/assets/js/index-CHxPVtAp.js')
  const js = await res.text()

  const matches = js.match(/assets\/js\/[a-zA-Z0-9_\-]+\.js/g) || []
  console.log('Found chunks:', [...new Set(matches)])
}

findChunks()

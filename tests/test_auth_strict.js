async function test() {
  const base = 'http://localhost:5000/api/auth'
  
  // 1. Random non-existent user login
  const randomUser = 'random_' + Date.now()
  const res1 = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: randomUser, password: 'password123' })
  })
  const json1 = await res1.json()
  console.log('1. Non-existent login status:', res1.status, json1)

  // 2. Register user
  const newUser = 'user_' + Date.now()
  const res2 = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: newUser, password: 'correctpassword123' })
  })
  const json2 = await res2.json()
  console.log('2. Register status:', res2.status, json2.message)

  // 3. Login with wrong password
  const res3 = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: newUser, password: 'WRONGpassword123' })
  })
  const json3 = await res3.json()
  console.log('3. Wrong password login status:', res3.status, json3)

  // 4. Login with correct password
  const res4 = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: newUser, password: 'correctpassword123' })
  })
  const json4 = await res4.json()
  console.log('4. Correct password login status:', res4.status, json4.message, 'User:', json4.user?.username)
}

test().catch(console.error)

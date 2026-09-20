import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('--- Testing Prince Club Page & Link Navigation ---')

// 1. Check all component files exist
const frontendDir = path.resolve(process.cwd(), 'frontend/src/components')
const requiredComponents = [
  'HomeLobby.jsx',
  'ActivityView.jsx',
  'PromotionView.jsx',
  'AccountView.jsx',
  'AviatorGame.jsx',
  'WingoGame.jsx',
  'FortuneWheelModal.jsx',
  'DepositModal.jsx',
  'WithdrawModal.jsx',
  'pages/DepositPage.jsx',
  'pages/WithdrawPage.jsx',
]

for (const comp of requiredComponents) {
  const compPath = path.join(frontendDir, comp)
  assert(fs.existsSync(compPath), `Missing component: ${comp}`)
  console.log(`✓ Component present: ${comp}`)
}

// 2. Check App.jsx imports & routes
const appFile = path.resolve(process.cwd(), 'frontend/src/App.jsx')
const appContent = fs.readFileSync(appFile, 'utf8')

assert(appContent.includes("import ActivityView from './components/ActivityView'"), 'ActivityView import missing')
assert(appContent.includes("import PromotionView from './components/PromotionView'"), 'PromotionView import missing')
assert(appContent.includes("import AccountView from './components/AccountView'"), 'AccountView import missing')
assert(appContent.includes("import WingoGame from './components/WingoGame'"), 'WingoGame import missing')
assert(appContent.includes("activeNav === 'home'"), 'home route missing')
assert(appContent.includes("activeNav === 'activity'"), 'activity route missing')
assert(appContent.includes("activeNav === 'promotion'"), 'promotion route missing')
assert(appContent.includes("activeNav === 'account'"), 'account route missing')
assert(appContent.includes("currentGame === 'aviator'"), 'aviator route missing')
assert(appContent.includes("currentGame === 'wingo'"), 'wingo route missing')
assert(appContent.includes("<WingoGame"), 'WingoGame component mount missing')
console.log('✓ App.jsx routes and WingoGame component verified')

// 3. Check HomeLobby.jsx redirections
const lobbyFile = path.join(frontendDir, 'HomeLobby.jsx')
const lobbyContent = fs.readFileSync(lobbyFile, 'utf8')

assert(lobbyContent.includes("onSelectGame('wingo'"), 'Win Go route missing in lobby')
assert(lobbyContent.includes("onSelectGame('k3')"), 'K3 route missing in lobby')
assert(lobbyContent.includes("onSelectGame('5d')"), '5D route missing in lobby')
assert(lobbyContent.includes("onSelectGame('trx')"), 'TRX route missing in lobby')
assert(lobbyContent.includes("onSelectGame('aviator')"), 'Aviator route missing in lobby')
assert(lobbyContent.includes("handleCategorySelect"), 'Category selection missing in lobby')
assert(lobbyContent.includes("section-minigame"), 'Minigame section anchor missing')
assert(lobbyContent.includes("section-slots"), 'Slots section anchor missing')
console.log('✓ HomeLobby.jsx game links, modes and anchors verified')

console.log('ALL NAVIGATION TESTS PASSED!')

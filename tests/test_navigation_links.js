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
  'FortuneWheelModal.jsx',
  'DepositModal.jsx',
  'WithdrawModal.jsx',
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
assert(appContent.includes("activeNav === 'home'"), 'home route missing')
assert(appContent.includes("activeNav === 'activity'"), 'activity route missing')
assert(appContent.includes("activeNav === 'promotion'"), 'promotion route missing')
assert(appContent.includes("activeNav === 'account'"), 'account route missing')
assert(appContent.includes("currentGame === 'aviator'"), 'aviator route missing')
assert(appContent.includes("currentGame === 'wingo'"), 'wingo route missing')
assert(appContent.includes("wingo-subnav-bar"), 'wingo subnav missing')
console.log('✓ App.jsx routes and subnav verified')

// 3. Check HomeLobby.jsx redirections
const lobbyFile = path.join(frontendDir, 'HomeLobby.jsx')
const lobbyContent = fs.readFileSync(lobbyFile, 'utf8')

assert(lobbyContent.includes("onSelectGame('wingo', 'PARITY')"), 'Win Go parity route missing in lobby')
assert(lobbyContent.includes("onSelectGame('wingo', 'SAPRE')"), 'K3 sapre route missing in lobby')
assert(lobbyContent.includes("onSelectGame('wingo', 'BCONE')"), '5D bcone route missing in lobby')
assert(lobbyContent.includes("onSelectGame('wingo', 'EMERD')"), 'Moto Racing emerd route missing in lobby')
assert(lobbyContent.includes("onSelectGame('aviator')"), 'Aviator route missing in lobby')
assert(lobbyContent.includes("handleCategorySelect"), 'Category selection missing in lobby')
assert(lobbyContent.includes("section-minigame"), 'Minigame section anchor missing')
assert(lobbyContent.includes("section-slots"), 'Slots section anchor missing')
console.log('✓ HomeLobby.jsx game links, modes and anchors verified')

console.log('ALL NAVIGATION TESTS PASSED!')

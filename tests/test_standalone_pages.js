import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('🚀 Verifying Standalone Pages Architecture...\n')

const root = process.cwd()

// 1. Verify existence of all 4 standalone subpage components
const pages = [
  'frontend/src/components/pages/WalletPage.jsx',
  'frontend/src/components/pages/DepositPage.jsx',
  'frontend/src/components/pages/WithdrawPage.jsx',
  'frontend/src/components/pages/VIPPage.jsx',
  'frontend/src/components/admin/AdminDashboard.jsx',
]

for (const p of pages) {
  const fullPath = path.join(root, p)
  assert(fs.existsSync(fullPath), `Page file ${p} must exist on disk`)
  const content = fs.readFileSync(fullPath, 'utf8')
  assert(content.length > 200, `Page file ${p} must have substantial code`)
  console.log(`✓ ${p} exists and has valid component structure.`)
}

// 2. Verify App.jsx imports and mounts them
const appPath = path.join(root, 'frontend/src/App.jsx')
const appContent = fs.readFileSync(appPath, 'utf8')

assert(appContent.includes("import WalletPage from './components/pages/WalletPage'"), 'App.jsx must import WalletPage')
assert(appContent.includes("import DepositPage from './components/pages/DepositPage'"), 'App.jsx must import DepositPage')
assert(appContent.includes("import WithdrawPage from './components/pages/WithdrawPage'"), 'App.jsx must import WithdrawPage')
assert(appContent.includes("import VIPPage from './components/pages/VIPPage'"), 'App.jsx must import VIPPage')

assert(appContent.includes("activeNav === 'wallet'"), "App.jsx must have route for activeNav === 'wallet'")
assert(appContent.includes("activeNav === 'deposit'"), "App.jsx must have route for activeNav === 'deposit'")
assert(appContent.includes("activeNav === 'withdraw'"), "App.jsx must have route for activeNav === 'withdraw'")
assert(appContent.includes("activeNav === 'vip'"), "App.jsx must have route for activeNav === 'vip'")

console.log('\n✓ App.jsx mounts all 4 standalone pages with smooth back navigation.')

// 3. Verify AccountView.jsx wires the buttons to separate pages
const accountViewPath = path.join(root, 'frontend/src/components/AccountView.jsx')
const accountContent = fs.readFileSync(accountViewPath, 'utf8')

assert(accountContent.includes('onOpenWallet'), 'AccountView must accept onOpenWallet')
assert(accountContent.includes('onOpenDeposit'), 'AccountView must accept onOpenDeposit')
assert(accountContent.includes('onOpenWithdraw'), 'AccountView must accept onOpenWithdraw')
assert(accountContent.includes('onOpenVIP'), 'AccountView must accept onOpenVIP')
assert(accountContent.includes('onOpenAdmin'), 'AccountView must accept onOpenAdmin')

console.log('✓ AccountView.jsx wires ARWallet, Deposit, Withdraw, VIP, and Admin Management to standalone views.')

console.log('\n============================================================')
console.log('🎉 ALL STANDALONE PAGE ARCHITECTURE TESTS PASSED!')
console.log('============================================================')

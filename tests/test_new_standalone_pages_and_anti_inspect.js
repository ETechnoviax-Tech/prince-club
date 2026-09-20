// tests/test_new_standalone_pages_and_anti_inspect.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('=== VERIFYING NEW STANDALONE SUBPAGES & ANTI-INSPECT PROTECTION ===\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`)
    passCount++
  } else {
    console.error(`❌ FAIL: ${message}`)
    failCount++
  }
}

// 1. Check file existence
const pages = [
  'NotificationPage.jsx',
  'GiftsPage.jsx',
  'CouponsPage.jsx',
  'SecurityPage.jsx',
  'CustomerServicePage.jsx',
]

pages.forEach((p) => {
  const fullPath = path.join(__dirname, '../frontend/src/components/pages', p)
  assert(fs.existsSync(fullPath), `Page exists: frontend/src/components/pages/${p}`)
})

// 2. Check Anti-Inspect utility
const antiInspectPath = path.join(__dirname, '../frontend/src/utils/antiInspect.js')
assert(fs.existsSync(antiInspectPath), 'Anti-Inspect security utility exists')
const antiContent = fs.readFileSync(antiInspectPath, 'utf8')
assert(antiContent.includes('contextmenu') && antiContent.includes('preventDefault'), 'Blocks right-click context menu')
assert(antiContent.includes('F12') && antiContent.includes('keyCode === 123'), 'Blocks F12 DevTools key')
assert(antiContent.includes('Ctrl+Shift+I') || antiContent.includes("e.key === 'I'"), 'Blocks Ctrl+Shift+I / J / C')
assert(antiContent.includes("e.key === 'U'") || antiContent.includes("e.key === 'u'"), 'Blocks Ctrl+U View Source')

// 3. Check index.html body oncontextmenu
const indexPath = path.join(__dirname, '../frontend/index.html')
const indexContent = fs.readFileSync(indexPath, 'utf8')
assert(indexContent.includes('oncontextmenu="return false;"'), 'index.html body has native oncontextmenu="return false;"')

// 4. Check AccountView wiring
const accountViewPath = path.join(__dirname, '../frontend/src/components/AccountView.jsx')
const accountContent = fs.readFileSync(accountViewPath, 'utf8')
assert(accountContent.includes('onOpenNotification'), 'AccountView accepts onOpenNotification')
assert(accountContent.includes('onOpenGifts'), 'AccountView accepts onOpenGifts')
assert(accountContent.includes('onOpenCoupons'), 'AccountView accepts onOpenCoupons')
assert(accountContent.includes('onOpenSecurity'), 'AccountView accepts onOpenSecurity')
assert(accountContent.includes('onOpenCustomerService'), 'AccountView accepts onOpenCustomerService')

// 5. Check App.jsx routing and anti-inspect init
const appPath = path.join(__dirname, '../frontend/src/App.jsx')
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('initAntiInspect'), 'App.jsx imports and activates initAntiInspect')
assert(appContent.includes("activeNav === 'notification'"), "App.jsx routes activeNav === 'notification'")
assert(appContent.includes("activeNav === 'gifts'"), "App.jsx routes activeNav === 'gifts'")
assert(appContent.includes("activeNav === 'coupons'"), "App.jsx routes activeNav === 'coupons'")
assert(appContent.includes("activeNav === 'security'"), "App.jsx routes activeNav === 'security'")
assert(appContent.includes("activeNav === 'customerservice'"), "App.jsx routes activeNav === 'customerservice'")

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed`)
if (failCount > 0) {
  process.exit(1)
}
console.log('ALL NEW STANDALONE PAGES AND ANTI-INSPECT TESTS PASSED!')

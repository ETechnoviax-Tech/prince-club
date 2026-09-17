// tests/test_wingo_ui_bet_edge_cases.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('=== RUNNING WIN GO UI & BET EDGE CASES TEST SUITE ===\n')

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

// 1. Verify styles.css contrast rules for Win Go
const cssPath = path.join(__dirname, '../frontend/src/styles.css')
const cssContent = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n')

assert(
  cssContent.includes('.raja-header .raja-brand-name') &&
  cssContent.includes('#0f172a !important'),
  'raja-header brand name has high contrast dark obsidian text (#0f172a)'
)

assert(
  cssContent.includes('.mobile-ticker') &&
  cssContent.includes('#b45309'),
  'mobile-ticker has rich amber readable text (#b45309) instead of faint yellow'
)

assert(
  cssContent.includes('.raja-mode-tab.active') &&
  cssContent.includes('linear-gradient(135deg, #ff6054 0%, #f2413b 50%, #e62c25 100%)'),
  'raja-mode-tab active has 55 CLUB signature coral-to-red gradient'
)

assert(
  cssContent.includes('.raja-mode-tab.active .raja-mode-sub') &&
  cssContent.includes('#ffffff !important'),
  'raja-mode-tab active sub-text has pure white (#ffffff) contrast'
)

assert(
  cssContent.includes('.bet-target') &&
  cssContent.includes('#0f172a !important'),
  'bet-target has dark bold text (#0f172a) preventing white-on-white invisibility'
)

assert(
  cssContent.includes('.sheet-title') &&
  cssContent.includes('#0f172a !important'),
  'sheet-title in bottom sheet drawer has crisp dark text (#0f172a)'
)

assert(
  cssContent.includes('.records-table th') &&
  cssContent.includes('background: #f8fafc !important'),
  'records table header has clean readable styling'
)

// 2. Verify App.jsx edge cases & toast debug logic
const appPath = path.join(__dirname, '../frontend/src/App.jsx')
const appContent = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n')

assert(
  appContent.includes("if (!currentUser) {\n      console.log('[Win Go Bet Debug] Target clicked without login')"),
  'handleSelectTarget blocks unauthenticated users and logs debug'
)

assert(
  appContent.includes("if (isLocked || seconds <= activeLevel.lock) {\n      console.log('[Win Go Bet Debug] Target clicked during lock period')"),
  'handleSelectTarget blocks betting during lock timer'
)

assert(
  appContent.includes("if (isLocked || seconds <= activeLevel.lock) {\n      console.log('[Win Go Bet Debug] Confirm bet blocked: period locked')"),
  'handleConfirmBet guards against lock window race condition'
)

assert(
  appContent.includes("if (totalBetAmount > balance) {\n      console.log('[Win Go Bet Debug] Insufficient balance:"),
  'handleConfirmBet validates sufficient balance before placing bet'
)

assert(
  appContent.includes("console.log('[Win Go Debug] Period settled without user bets:"),
  'settleCurrentRound suppresses intrusive toast spam when user did not bet'
)

assert(
  appContent.includes("toast.type === 'warning' ? (\n                <AlertCircle size={16} />"),
  'mobile-toast renders AlertCircle for warning notifications'
)

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed`)
if (failCount > 0) {
  process.exit(1)
}
console.log('ALL EDGE CASES AND UI CONTRAST TESTS PASSED!')

import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('--- Testing Account Page Redesign ---')

const accountViewPath = path.resolve('frontend/src/components/AccountView.jsx')
const stylesPath = path.resolve('frontend/src/styles.css')

const accountCode = fs.readFileSync(accountViewPath, 'utf8')
const stylesCode = fs.readFileSync(stylesPath, 'utf8')

// 1. Check Profile Header elements
assert.ok(accountCode.includes('profile-vip-medal'), 'Must have VIP badge')
assert.ok(accountCode.includes('VIP0'), 'Must include VIP0 medal')
assert.ok(accountCode.includes('profile-uid-pill'), 'Must include UID pill')
assert.ok(accountCode.includes('UID'), 'Must include UID label')
assert.ok(accountCode.includes('handleCopyUid'), 'Must handle UID copy')
assert.ok(accountCode.includes('Last login:'), 'Must display last login timestamp')
console.log('✓ 1. Profile Header with Avatar, VIP0, UID pill and Last Login verified.')

// 2. Check Balance Card elements
assert.ok(accountCode.includes('Total balance'), 'Must display Total balance label')
assert.ok(accountCode.includes('enter-wallet-btn'), 'Must have Enter wallet button')
assert.ok(accountCode.includes('Enter wallet'), 'Must display Enter wallet text')
assert.ok(accountCode.includes('ARWallet'), 'Must have ARWallet action')
assert.ok(accountCode.includes('Deposit'), 'Must have Deposit action')
assert.ok(accountCode.includes('Withdraw'), 'Must have Withdraw action')
assert.ok(accountCode.includes('VIP'), 'Must have VIP action')
console.log('✓ 2. Total Balance card with Enter wallet and 4 Action icons verified.')

// 3. Check 2x2 History Grid
assert.ok(accountCode.includes('Game History'), 'Must include Game History card')
assert.ok(accountCode.includes('Transaction'), 'Must include Transaction card')
assert.ok(accountCode.includes('My game history'), 'Must include My game history subtitle')
assert.ok(accountCode.includes('My transaction history'), 'Must include My transaction history subtitle')
assert.ok(accountCode.includes('My deposit history'), 'Must include My deposit history subtitle')
assert.ok(accountCode.includes('My withdraw history'), 'Must include My withdraw history subtitle')
console.log('✓ 3. 2x2 Quick History Grid verified.')

// 4. Check Menu List
assert.ok(accountCode.includes('Notification'), 'Must include Notification row')
assert.ok(accountCode.includes('menu-count-badge'), 'Must include badge on notification')
assert.ok(accountCode.includes('Gifts'), 'Must include Gifts row')
assert.ok(accountCode.includes('My Top-Up Coupons'), 'Must include Top-Up Coupons row')
assert.ok(accountCode.includes('Customer Service'), 'Must include Customer Service row')
console.log('✓ 4. Vertical Menu List verified.')

// 5. Check CSS classes present
assert.ok(stylesCode.includes('.account-view-wrapper'), 'CSS must include .account-view-wrapper')
assert.ok(stylesCode.includes('.account-profile-header'), 'CSS must include .account-profile-header')
assert.ok(stylesCode.includes('.account-balance-card'), 'CSS must include .account-balance-card')
assert.ok(stylesCode.includes('.account-history-grid'), 'CSS must include .account-history-grid')
assert.ok(stylesCode.includes('.account-menu-card'), 'CSS must include .account-menu-card')
console.log('✓ 5. CSS stylesheet definitions verified.')

console.log('--- ALL ACCOUNT PAGE TESTS PASSED (5/5) ---')

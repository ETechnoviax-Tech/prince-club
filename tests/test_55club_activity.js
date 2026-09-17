/**
 * Automated Verification Script for 55 CLUB Authentic Activity Page
 * Tests JSX structure, CSS styling classes, and App routing.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

function runTests() {
  console.log('🧪 Starting 55 CLUB Activity Page Verification...\n')
  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      failed++
    }
  }

  // 1. Check ActivityView.jsx file exists and contains core 55CLUB brand elements
  const activityJsxPath = path.join(rootDir, 'frontend', 'src', 'components', 'ActivityView.jsx')
  const activityJsx = fs.readFileSync(activityJsxPath, 'utf8')

  assert(activityJsx.includes('69 CLUB'), 'ActivityView contains 69 CLUB branding text')
  assert(activityJsx.includes('Today\'s bonus') && activityJsx.includes('Total bonus'), 'ActivityView displays Today\'s and Total bonus counters')
  assert(activityJsx.includes('Bonus details'), 'ActivityView contains Bonus details trigger button')
  assert(
    activityJsx.includes('Betting rebate') &&
    activityJsx.includes('Super Jackpot') &&
    activityJsx.includes('First gift') &&
    activityJsx.includes('Invite Wheel'),
    'ActivityView contains 4-icon shortcut row (Betting rebate, Super Jackpot, First gift, Invite Wheel)'
  )

  // 2. Check 2-Column Feature Cards
  assert(
    activityJsx.includes('Gifts') &&
    activityJsx.includes('Enter the redemption code to receive gift rewards'),
    'ActivityView contains Gifts card with redemption subtitle'
  )
  assert(
    activityJsx.includes('Attendance bonus') &&
    activityJsx.includes('The more consecutive days you sign in, the higher the reward will be'),
    'ActivityView contains Attendance bonus card with streak subtitle'
  )

  // 3. Check Event Banners
  assert(
    activityJsx.includes('ARBET INVITE FRIENDS') &&
    activityJsx.includes('Invite Friends, Earn More') &&
    activityJsx.includes('Sep 1 - Sep 30'),
    'ActivityView contains ARBET Invite Friends sports promotional banner'
  )
  assert(
    activityJsx.includes('69 CLUB MEGA SPIN WHEEL') ||
    activityJsx.includes('Mega Spin Wheel'),
    'ActivityView contains 69 CLUB Mega Spin Wheel banner'
  )

  // 4. Check Modals
  assert(
    activityJsx.includes('bonusModalOpen') &&
    activityJsx.includes('giftModalOpen') &&
    activityJsx.includes('attendanceModalOpen') &&
    activityJsx.includes('rebateModalOpen') &&
    activityJsx.includes('jackpotModalOpen'),
    'ActivityView implements all 5 interactive modals'
  )

  // 5. Check CSS rules in styles.css
  const stylesPath = path.join(rootDir, 'frontend', 'src', 'styles.css')
  const stylesCss = fs.readFileSync(stylesPath, 'utf8')

  assert(stylesCss.includes('.activity-coral-header'), 'styles.css contains .activity-coral-header gradient style')
  assert(stylesCss.includes('.btn-bonus-details'), 'styles.css contains .btn-bonus-details pill button')
  assert(stylesCss.includes('.activity-icons-grid'), 'styles.css contains .activity-icons-grid layout')
  assert(stylesCss.includes('.activity-feature-2col-grid'), 'styles.css contains .activity-feature-2col-grid layout')
  assert(stylesCss.includes('.banner-arbet-sports'), 'styles.css contains .banner-arbet-sports visual style')
  assert(stylesCss.includes('.banner-mega-spin'), 'styles.css contains .banner-mega-spin visual style')
  assert(stylesCss.includes('.activity-dialog-card'), 'styles.css contains .activity-dialog-card modal style')

  // 6. Check App.jsx mounting
  const appJsxPath = path.join(rootDir, 'frontend', 'src', 'App.jsx')
  const appJsx = fs.readFileSync(appJsxPath, 'utf8')
  assert(
    appJsx.includes('<ActivityView') && appJsx.includes("activeNav === 'activity'"),
    'App.jsx mounts ActivityView conditionally on activeNav === activity'
  )

  console.log(`\n===================================`)
  console.log(`Summary: ${passed} passed, ${failed} failed`)
  console.log(`===================================`)

  if (failed > 0) process.exit(1)
}

runTests()

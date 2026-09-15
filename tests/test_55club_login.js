import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('--- Testing 55CLUB Login Page Implementation ---')

const authModalPath = path.resolve('frontend/src/components/AuthModal.jsx')
const stylesPath = path.resolve('frontend/src/styles.css')

const authCode = fs.readFileSync(authModalPath, 'utf8')
const stylesCode = fs.readFileSync(stylesPath, 'utf8')

// 1. Check Header Elements
assert.ok(authCode.includes('auth-coral-header'), 'Must have coral gradient header')
assert.ok(authCode.includes('PRINCE CLUB'), 'Must display PRINCE CLUB logo')
assert.ok(authCode.includes('auth-lang-selector'), 'Must have language selector with EN')
assert.ok(authCode.includes('auth-nav-back-btn'), 'Must have back button')
console.log('✓ 1. Header with PRINCE CLUB logo, back button, and EN selector verified.')

// 2. Check Tab Switcher
assert.ok(authCode.includes('auth-method-tabs'), 'Must have method tabs')
assert.ok(authCode.includes('Phone Number'), 'Must have Phone Number tab')
assert.ok(authCode.includes('Email'), 'Must have Email tab')
assert.ok(authCode.includes('tab-active-indicator'), 'Must have active indicator')
console.log('✓ 2. Phone Number and Email tab switcher verified.')

// 3. Check Form Inputs
assert.ok(authCode.includes('country-code-select-box'), 'Must have country code box')
assert.ok(authCode.includes('+91'), 'Must include +91 country code')
assert.ok(authCode.includes('9675042566'), 'Must include default phone placeholder')
assert.ok(authCode.includes('password-eye-toggle'), 'Must have password eye toggle')
console.log('✓ 3. Phone input with country code and password input with eye toggle verified.')

// 4. Check Options and Buttons
assert.ok(authCode.includes('remember-checkbox-label'), 'Must have remember password checkbox')
assert.ok(authCode.includes('forgot-password-link'), 'Must have forgot password link')
assert.ok(authCode.includes('auth-btn-primary'), 'Must have primary action button')
assert.ok(authCode.includes('auth-btn-secondary'), 'Must have secondary register button')
console.log('✓ 4. Remember password checkbox, forgot link, Log in & Register buttons verified.')

// 5. Check CSS definitions
assert.ok(stylesCode.includes('.auth-coral-header'), 'CSS must include .auth-coral-header')
assert.ok(stylesCode.includes('.auth-55club-brand'), 'CSS must include .auth-55club-brand')
assert.ok(stylesCode.includes('.auth-method-tabs'), 'CSS must include .auth-method-tabs')
assert.ok(stylesCode.includes('.auth-btn-primary'), 'CSS must include .auth-btn-primary')
assert.ok(stylesCode.includes('.auth-btn-secondary'), 'CSS must include .auth-btn-secondary')
console.log('✓ 5. CSS styles for 55CLUB login screen verified.')

console.log('--- ALL 55CLUB LOGIN TESTS PASSED (5/5) ---')

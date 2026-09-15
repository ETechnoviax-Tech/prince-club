import React, { useState } from 'react'
import {
  User,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  Coins,
  CreditCard,
  Crown,
  History,
  FileText,
  Bookmark,
  ArrowDownCircle,
  Bell,
  Gift,
  Ticket,
  Shield,
  Headphones,
  ChevronRight,
  LogOut,
  LogIn,
  Lock,
} from 'lucide-react'
import { sound } from '../utils/audio'

export function AccountView({
  currentUser,
  userId,
  balance = 0,
  onRefreshBalance,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenFortuneWheel,
  onOpenVIP,
  onOpenRules,
  onOpenBets,
  onOpenSupport,
  onOpenAuth,
  onLogout,
}) {
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  // Generate or format consistent display data matching user screenshot
  const username = currentUser?.username || 'MEMBERNNG5EZDK'
  const displayUid = currentUser?.id
    ? String(currentUser.id).replace(/\D/g, '').slice(-7) || '1015140'
    : '1015140'
  const lastLogin = currentUser?.last_login || '2026-09-13 17:41:23'

  const handleCopyUid = () => {
    try {
      navigator.clipboard.writeText(displayUid)
      setCopied(true)
      sound.playTick()
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    sound.playTick()
    if (onRefreshBalance) {
      await onRefreshBalance()
    }
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="account-view-wrapper">
      {/* 1. TOP PROFILE BANNER (Purple Gradient) */}
      <div className="account-profile-header">
        <div className="account-profile-main">
          {/* Avatar */}
          <div className="account-avatar-container">
            {!avatarError ? (
              <img
                src="/avatar.jpg"
                alt="User Avatar"
                className="account-avatar-img"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="account-avatar-fallback">
                <User size={36} className="text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="account-profile-info">
            <div className="profile-name-row">
              <h2 className="profile-username">{username}</h2>
              <div className="profile-vip-medal">
                <span className="vip-medal-star">⭐</span>
                <span className="vip-medal-text">VIP0</span>
              </div>
            </div>

            <div className="profile-uid-row">
              <button className="profile-uid-pill" onClick={handleCopyUid} title="Copy UID">
                <span className="uid-label">UID</span>
                <span className="uid-divider">|</span>
                <span className="uid-number">{displayUid}</span>
                {copied ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-white opacity-80" />}
              </button>
            </div>

            <div className="profile-login-time">
              Last login: {lastLogin}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOTAL BALANCE FLOATING CARD */}
      <div className="account-balance-card">
        <div className="balance-card-top">
          <div className="balance-left">
            <span className="balance-label">Total balance</span>
            <div className="balance-amount-row">
              <span className="balance-value">₹{Number(balance).toFixed(2)}</span>
              <button
                className={`balance-refresh-btn ${refreshing ? 'spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh Balance"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          <button
            className="enter-wallet-btn"
            onClick={onOpenDeposit}
            title="Enter Wallet"
          >
            Enter wallet
          </button>
        </div>

        {/* 4 Action Icons Row */}
        <div className="balance-actions-grid">
          <div className="action-item" onClick={onOpenDeposit}>
            <div className="action-icon-circle bg-arwallet">
              <Wallet size={20} />
            </div>
            <span className="action-name">ARWallet</span>
          </div>

          <div className="action-item" onClick={onOpenDeposit}>
            <div className="action-icon-circle bg-deposit">
              <Coins size={20} />
            </div>
            <span className="action-name">Deposit</span>
          </div>

          <div className="action-item" onClick={onOpenWithdraw}>
            <div className="action-icon-circle bg-withdraw">
              <CreditCard size={20} />
            </div>
            <span className="action-name">Withdraw</span>
          </div>

          <div className="action-item" onClick={onOpenVIP}>
            <div className="action-icon-circle bg-vip">
              <Crown size={20} />
            </div>
            <span className="action-name">VIP</span>
          </div>
        </div>
      </div>

      {/* 3. 2x2 QUICK HISTORY CARDS GRID */}
      <div className="account-history-grid">
        <div className="history-card-tile" onClick={onOpenBets}>
          <div className="history-icon-box bg-blue-history">
            <FileText size={18} />
          </div>
          <div className="history-text-col">
            <h4 className="history-title">Game History</h4>
            <span className="history-sub">My game history</span>
          </div>
        </div>

        <div className="history-card-tile" onClick={onOpenBets}>
          <div className="history-icon-box bg-green-transaction">
            <History size={18} />
          </div>
          <div className="history-text-col">
            <h4 className="history-title">Transaction</h4>
            <span className="history-sub">My transaction history</span>
          </div>
        </div>

        <div className="history-card-tile" onClick={onOpenDeposit}>
          <div className="history-icon-box bg-coral-deposit">
            <Bookmark size={18} />
          </div>
          <div className="history-text-col">
            <h4 className="history-title">Deposit</h4>
            <span className="history-sub">My deposit history</span>
          </div>
        </div>

        <div className="history-card-tile" onClick={onOpenWithdraw}>
          <div className="history-icon-box bg-orange-withdraw">
            <ArrowDownCircle size={18} />
          </div>
          <div className="history-text-col">
            <h4 className="history-title">Withdraw</h4>
            <span className="history-sub">My withdraw history</span>
          </div>
        </div>
      </div>

      {/* 4. VERTICAL MENU LIST */}
      <div className="account-menu-card">
        {/* Notification */}
        <div className="menu-list-row" onClick={onOpenSupport}>
          <div className="menu-row-left">
            <div className="menu-icon-box bg-menu-indigo">
              <Bell size={16} />
            </div>
            <span className="menu-row-title">Notification</span>
          </div>
          <div className="menu-row-right">
            <span className="menu-count-badge">6</span>
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        {/* Gifts */}
        <div className="menu-list-row" onClick={onOpenFortuneWheel}>
          <div className="menu-row-left">
            <div className="menu-icon-box bg-menu-purple">
              <Gift size={16} />
            </div>
            <span className="menu-row-title">Gifts</span>
          </div>
          <div className="menu-row-right">
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        {/* My Top-Up Coupons */}
        <div className="menu-list-row" onClick={onOpenDeposit}>
          <div className="menu-row-left">
            <div className="menu-icon-box bg-menu-lavender">
              <Ticket size={16} />
            </div>
            <span className="menu-row-title">My Top-Up Coupons</span>
          </div>
          <div className="menu-row-right">
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        {/* Security Center */}
        <div className="menu-list-row" onClick={() => onOpenAuth && onOpenAuth('forgot')}>
          <div className="menu-row-left">
            <div className="menu-icon-box bg-menu-cyan">
              <Shield size={16} />
            </div>
            <span className="menu-row-title">Security Center</span>
          </div>
          <div className="menu-row-right">
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        {/* Live Support */}
        <div className="menu-list-row" onClick={onOpenSupport}>
          <div className="menu-row-left">
            <div className="menu-icon-box bg-menu-amber">
              <Headphones size={16} />
            </div>
            <span className="menu-row-title">Customer Service</span>
          </div>
          <div className="menu-row-right">
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>
      </div>

      {/* 5. AUTH / LOGOUT BUTTON */}
      <div className="account-footer-actions">
        {currentUser ? (
          <button className="account-auth-action-btn logout-style" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out ({currentUser.username})</span>
          </button>
        ) : (
          <button className="account-auth-action-btn login-style" onClick={() => onOpenAuth && onOpenAuth('login')}>
            <LogIn size={16} />
            <span>Log In / Register</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default AccountView

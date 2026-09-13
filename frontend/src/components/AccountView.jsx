import React from 'react'
import {
  User,
  Crown,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  History,
  CreditCard,
  Gift,
  HelpCircle,
  Headphones,
  Lock,
  LogOut,
  LogIn,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react'

export function AccountView({
  currentUser,
  userId,
  balance,
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
  const displayId = currentUser?.id || userId || '98721'
  const username = currentUser?.username || 'Guest Player'
  const phone = currentUser?.phone || currentUser?.mobile || '+91 98••••••21'

  return (
    <div className="account-page-container">
      {/* Top Profile Header */}
      <div className="account-hero-card">
        <div className="account-avatar-row">
          <div className="account-avatar-wrap">
            <div className="avatar-circle">
              <User size={28} className="text-white" />
            </div>
            <div className="avatar-crown-badge">👑</div>
          </div>
          <div className="account-meta">
            <div className="account-name-row">
              <strong className="account-name">{username}</strong>
              <span className="vip-tag-pill">
                <Crown size={12} /> VIP 1
              </span>
            </div>
            <div className="account-id-row">
              <span>UID: {String(displayId).substring(0, 12)}</span>
              <span className="divider">•</span>
              <span className="phone-hidden">{phone}</span>
            </div>
          </div>
        </div>

        {/* Balance Card within Profile */}
        <div className="account-balance-card">
          <div className="bal-top">
            <span className="bal-label">Total Game Balance</span>
            <button className="bal-refresh" onClick={onRefreshBalance} title="Refresh balance">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="bal-amount-row">
            <span className="bal-currency">₹</span>
            <strong className="bal-digits">{Number(balance).toFixed(2)}</strong>
          </div>

          <div className="account-actions-row">
            <button className="btn-acct-withdraw" onClick={onOpenWithdraw}>
              <div className="action-circle-icon"><ArrowUp size={14} /></div>
              <span>Withdraw</span>
            </button>
            <button className="btn-acct-deposit" onClick={onOpenDeposit}>
              <div className="action-circle-icon"><ArrowDown size={14} /></div>
              <span>Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid (8 items) */}
      <div className="account-services-panel">
        <h4 className="services-heading">Quick Services</h4>
        <div className="services-grid-list">
          <div className="service-tile" onClick={onOpenBets}>
            <div className="service-icon-wrap icon-bets">
              <History size={20} />
            </div>
            <span className="service-title">Bet Records</span>
          </div>

          <div className="service-tile" onClick={onOpenDeposit}>
            <div className="service-icon-wrap icon-recharge">
              <CreditCard size={20} />
            </div>
            <span className="service-title">Deposit Records</span>
          </div>

          <div className="service-tile" onClick={onOpenWithdraw}>
            <div className="service-icon-wrap icon-withdraw">
              <ArrowUp size={20} />
            </div>
            <span className="service-title">Withdrawal</span>
          </div>

          <div className="service-tile" onClick={onOpenFortuneWheel}>
            <div className="service-icon-wrap icon-wheel">
              <Sparkles size={20} />
            </div>
            <span className="service-title">Lucky Spin</span>
          </div>

          <div className="service-tile" onClick={onOpenVIP}>
            <div className="service-icon-wrap icon-vip">
              <Gift size={20} />
            </div>
            <span className="service-title">VIP Privileges</span>
          </div>

          <div className="service-tile" onClick={onOpenRules}>
            <div className="service-icon-wrap icon-rules">
              <HelpCircle size={20} />
            </div>
            <span className="service-title">Game Rules</span>
          </div>

          <div className="service-tile" onClick={onOpenSupport}>
            <div className="service-icon-wrap icon-support">
              <Headphones size={20} />
            </div>
            <span className="service-title">Live Support</span>
          </div>

          <div className="service-tile" onClick={() => onOpenAuth('forgot')}>
            <div className="service-icon-wrap icon-security">
              <Lock size={20} />
            </div>
            <span className="service-title">Security Center</span>
          </div>
        </div>
      </div>

      {/* Account Management & Session */}
      <div className="account-options-list">
        <div className="option-row" onClick={() => onOpenAuth('forgot')}>
          <div className="option-left">
            <Lock size={16} className="text-slate" />
            <span>Change Login Password</span>
          </div>
          <ChevronRight size={16} className="text-slate" />
        </div>

        <div className="option-row" onClick={onOpenSupport}>
          <div className="option-left">
            <ShieldCheck size={16} className="text-emerald" />
            <span>Customer Service & Safety Center</span>
          </div>
          <ChevronRight size={16} className="text-slate" />
        </div>

        {currentUser ? (
          <button className="btn-logout-full" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out / Switch Account</span>
          </button>
        ) : (
          <button className="btn-login-full" onClick={() => onOpenAuth('login')}>
            <LogIn size={16} />
            <span>Log In / Register Account</span>
          </button>
        )}
      </div>
    </div>
  )
}
export default AccountView

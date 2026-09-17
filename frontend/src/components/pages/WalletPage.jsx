import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  ArrowDownCircle,
  Coins,
  History,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle,
} from 'lucide-react'
import { fetchWalletTransactions } from '../../api/client'

export default function WalletPage({
  currentUser,
  balance,
  onBack,
  onNavigateDeposit,
  onNavigateWithdraw,
  onRefreshBalance,
  onOpenTransactions,
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)

  useEffect(() => {
    if (currentUser?.id) {
      setLoadingTx(true)
      fetchWalletTransactions(currentUser.id)
        .then((res) => setTransactions(res.slice(0, 8)))
        .catch(() => {})
        .finally(() => setLoadingTx(false))
    }
  }, [currentUser?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    if (onRefreshBalance) await onRefreshBalance()
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className="subpage-container">
      {/* 1. TOP HEADER */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Wallet Center</h2>
        <button className="subpage-right-action" onClick={onOpenTransactions} title="History">
          <History size={18} />
        </button>
      </header>

      <div className="subpage-content">
        {/* 2. MAIN BALANCE CARD */}
        <div className="wallet-hero-card">
          <div className="wallet-hero-top">
            <span className="wallet-hero-label">Total Available Balance</span>
            <button
              className={`wallet-refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title="Refresh Balance"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="wallet-hero-amount">
            <span className="currency-symbol">₹</span>
            <strong className="amount-num">{Number(balance || 0).toFixed(2)}</strong>
          </div>

          <div className="wallet-stats-mini-row">
            <div className="mini-stat">
              <span>Main Wallet</span>
              <strong>₹{Number(balance || 0).toFixed(2)}</strong>
            </div>
            <div className="mini-divider" />
            <div className="mini-stat">
              <span>Third-Party Games</span>
              <strong>₹0.00</strong>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTION BUTTONS */}
        <div className="wallet-actions-trio">
          <button className="wallet-action-tile deposit-tile" onClick={onNavigateDeposit}>
            <div className="tile-icon-wrap bg-deposit-gradient">
              <Coins size={22} />
            </div>
            <span className="tile-title">Deposit</span>
            <span className="tile-subtitle">Instant UPI / QR</span>
          </button>

          <button className="wallet-action-tile withdraw-tile" onClick={onNavigateWithdraw}>
            <div className="tile-icon-wrap bg-withdraw-gradient">
              <ArrowDownCircle size={22} />
            </div>
            <span className="tile-title">Withdraw</span>
            <span className="tile-subtitle">Bank & Instant UPI</span>
          </button>
        </div>

        {/* 4. GAME BALANCES SECTION */}
        <div className="wallet-section-box">
          <div className="section-title-row">
            <h4>Game Wallets</h4>
            <span className="auto-transfer-badge">
              <CheckCircle size={12} /> Auto-Transfers Enabled
            </span>
          </div>

          <div className="game-wallet-list">
            <div className="game-wallet-item">
              <div className="gw-info">
                <span className="gw-name">Lottery (Win Go, K3, 5D, TRX)</span>
                <span className="gw-status">100% Shared Balance</span>
              </div>
              <strong className="gw-balance">₹{Number(balance || 0).toFixed(2)}</strong>
            </div>

            <div className="game-wallet-item">
              <div className="gw-info">
                <span className="gw-name">Crash Arena (Aviator)</span>
                <span className="gw-status">Instant Seamless Settlement</span>
              </div>
              <strong className="gw-balance">₹{Number(balance || 0).toFixed(2)}</strong>
            </div>

            <div className="game-wallet-item">
              <div className="gw-info">
                <span className="gw-name">Arcade Slots & Table Games</span>
                <span className="gw-status">Crazy 777, Dragon vs Tiger</span>
              </div>
              <strong className="gw-balance">₹{Number(balance || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* 5. RECENT TRANSACTIONS PREVIEW */}
        <div className="wallet-section-box">
          <div className="section-title-row">
            <h4>Recent Transactions</h4>
            <button className="btn-view-all-link" onClick={onOpenTransactions}>
              View All <ChevronRight size={14} />
            </button>
          </div>

          {loadingTx ? (
            <div className="wallet-loading-tx">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="wallet-empty-tx">
              <History size={28} className="text-gray-400 mb-2" />
              <p>No recent transaction records found.</p>
            </div>
          ) : (
            <div className="wallet-tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="wallet-tx-row">
                  <div className="tx-left">
                    <span className={`tx-type-tag ${String(tx.type).toLowerCase()}`}>
                      {tx.type}
                    </span>
                    <span className="tx-date">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <div className="tx-right">
                    <strong className={`tx-amount ${tx.type === 'DEPOSIT' || tx.type === 'BONUS' ? 'credit' : 'debit'}`}>
                      {tx.type === 'DEPOSIT' || tx.type === 'BONUS' ? '+' : '-'}₹{Number(tx.amount || 0).toFixed(2)}
                    </strong>
                    <span className="tx-after">Bal: ₹{Number(tx.balance_after || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  TrendingUp,
  Gift,
  RotateCcw,
  Check,
  Copy,
  Calendar,
  FileText,
  Filter,
} from 'lucide-react'
import { fetchWalletTransactions } from '../api/client.js'
import { sound } from '../utils/audio.js'

export function TransactionModal({ isOpen, onClose, userId, currentUser }) {
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'BONUS'
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadTransactions()
    }
  }, [isOpen, userId])

  async function loadTransactions() {
    try {
      setLoading(true)
      const data = await fetchWalletTransactions(userId)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[TransactionModal] Failed to load ledger:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    sound.playTick?.()
    try {
      const data = await fetchWalletTransactions(userId)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[TransactionModal] Refresh failed:', err)
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  function handleCopy(text, id) {
    if (!text) return
    try {
      navigator.clipboard?.writeText(text)
      setCopiedId(id)
      sound.playTick?.()
      setTimeout(() => setCopiedId(null), 1800)
    } catch (_) {}
  }

  if (!isOpen) return null

  // Filter transactions
  const filteredList = transactions.filter((t) => {
    if (filter === 'ALL') return true
    if (filter === 'DEPOSIT') return t.type === 'DEPOSIT'
    if (filter === 'WITHDRAWAL') return t.type === 'WITHDRAWAL'
    if (filter === 'BET') return t.type === 'BET_PLACED' || t.type === 'BET_PAYOUT'
    if (filter === 'BONUS') return t.type === 'BONUS' || t.type === 'REFUND'
    return true
  })

  // Format type details
  function getTypeMeta(type, amount) {
    const isCredit = Number(amount) > 0 || ['DEPOSIT', 'BET_PAYOUT', 'BONUS', 'REFUND'].includes(type)
    switch (type) {
      case 'DEPOSIT':
        return {
          label: 'Deposit',
          icon: <ArrowDownLeft size={16} />,
          badgeClass: 'tx-badge-deposit',
          isCredit: true,
        }
      case 'WITHDRAWAL':
        return {
          label: 'Withdrawal',
          icon: <ArrowUpRight size={16} />,
          badgeClass: 'tx-badge-withdraw',
          isCredit: false,
        }
      case 'BET_PLACED':
        return {
          label: 'Bet Placed',
          icon: <Coins size={16} />,
          badgeClass: 'tx-badge-bet',
          isCredit: false,
        }
      case 'BET_PAYOUT':
        return {
          label: 'Bet Won',
          icon: <TrendingUp size={16} />,
          badgeClass: 'tx-badge-win',
          isCredit: true,
        }
      case 'BONUS':
        return {
          label: 'VIP Bonus',
          icon: <Gift size={16} />,
          badgeClass: 'tx-badge-bonus',
          isCredit: true,
        }
      case 'REFUND':
        return {
          label: 'Refund',
          icon: <RotateCcw size={16} />,
          badgeClass: 'tx-badge-refund',
          isCredit: true,
        }
      default:
        return {
          label: type,
          icon: <FileText size={16} />,
          badgeClass: 'tx-badge-default',
          isCredit,
        }
    }
  }

  return (
    <div className="tx-modal-backdrop" onClick={onClose}>
      <div className="tx-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="tx-modal-header">
          <button className="tx-back-btn" onClick={onClose} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div className="tx-header-title">
            <h3>Transaction History</h3>
            <span>Wallet balance movements</span>
          </div>
          <button
            className={`tx-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            aria-label="Refresh transactions"
          >
            <RefreshCw size={19} />
          </button>
        </div>

        {/* FILTER TABS */}
        <div className="tx-filter-tabs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'DEPOSIT', label: 'Deposit' },
            { id: 'WITHDRAWAL', label: 'Withdraw' },
            { id: 'BET', label: 'Bets' },
            { id: 'BONUS', label: 'Bonus/Refund' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tx-tab-btn ${filter === tab.id ? 'active' : ''}`}
              onClick={() => {
                setFilter(tab.id)
                sound.playTick?.()
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="tx-list-scroll-area">
          {loading ? (
            <div className="tx-loading-state">
              <RefreshCw size={24} className="spinning text-coral" />
              <span>Loading transactions...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="tx-empty-state">
              <div className="tx-empty-icon-wrap">
                <FileText size={32} />
              </div>
              <h4>No transactions found</h4>
              <p>There are no transactions recorded under this category yet.</p>
            </div>
          ) : (
            <div className="tx-cards-stack">
              {filteredList.map((tx, idx) => {
                const meta = getTypeMeta(tx.type, tx.amount)
                const absAmount = Math.abs(Number(tx.amount || 0)).toFixed(2)
                const createdDate = tx.created_at
                  ? new Date(tx.created_at).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'Recent'

                return (
                  <div key={tx.id || idx} className="tx-card-item">
                    <div className="tx-card-main-row">
                      <div className="tx-type-group">
                        <div className={`tx-icon-badge ${meta.badgeClass}`}>
                          {meta.icon}
                        </div>
                        <div className="tx-type-text-col">
                          <span className="tx-type-name">{meta.label}</span>
                          <span className="tx-date-stamp">{createdDate}</span>
                        </div>
                      </div>

                      <div className="tx-amount-col">
                        <span className={`tx-amount-value ${meta.isCredit ? 'credit' : 'debit'}`}>
                          {meta.isCredit ? `+₹${absAmount}` : `-₹${absAmount}`}
                        </span>
                        {tx.balance_after !== undefined && tx.balance_after !== null && (
                          <span className="tx-bal-after">
                            Bal: ₹{Number(tx.balance_after).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Secondary details row */}
                    {(tx.description || tx.reference_id) && (
                      <div className="tx-card-detail-row">
                        {tx.description && (
                          <span className="tx-desc-text">{tx.description}</span>
                        )}
                        {tx.reference_id && (
                          <button
                            className="tx-copy-ref-pill"
                            onClick={() => handleCopy(tx.reference_id, tx.id || idx)}
                            title="Click to copy reference ID"
                          >
                            <span>Ref: {String(tx.reference_id).slice(0, 14)}...</span>
                            {copiedId === (tx.id || idx) ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TransactionModal

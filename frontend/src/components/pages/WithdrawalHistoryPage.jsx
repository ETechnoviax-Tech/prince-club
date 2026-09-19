import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownCircle,
} from 'lucide-react'
import { fetchUserWithdrawals } from '../../api/client'

export default function WithdrawalHistoryPage({ currentUser, onBack }) {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [copiedId, setCopiedId] = useState(null)

  const loadWithdrawals = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUserWithdrawals(currentUser.id)
      if (Array.isArray(res?.withdrawals)) {
        setWithdrawals(res.withdrawals)
      } else {
        setWithdrawals([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load withdrawal history')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  const handleCopy = (text, id) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = withdrawals.filter((w) => {
    if (filter === 'ALL') return true
    return String(w.status || '').toUpperCase() === filter
  })

  return (
    <div className="subpage-container">
      {/* 1. Top Header */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Withdrawal Status</h2>
        <button
          className="subpage-right-action"
          onClick={loadWithdrawals}
          title="Refresh Status"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>
      </header>

      <div className="subpage-content">
        {/* 2. Filter Pills */}
        <div className="deposit-channel-pills" style={{ marginBottom: 16 }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'In Review' },
            { id: 'APPROVED', label: 'Successful' },
            { id: 'REJECTED', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`channel-pill ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Error Alert */}
        {error && (
          <div className="deposit-alert error" style={{ marginBottom: 12 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 4. Withdrawal Items List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div className="spinner-border" style={{ margin: '0 auto 12px' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Loading withdrawals...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <ArrowDownCircle size={42} style={{ color: '#94a3b8', margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>No Withdrawal Records</h4>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              {filter === 'ALL'
                ? 'You have not requested any payouts yet.'
                : `No withdrawal requests found with status ${filter.toLowerCase()}.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => {
              const status = String(item.status || 'PENDING').toUpperCase()
              const isApproved = status === 'APPROVED' || status === 'COMPLETED'
              const isRejected = status === 'REJECTED'

              // Payout details normalization
              const method = item.payout_method || item.payoutMethod || 'UPI'
              const details = item.payout_details || item.payoutDetails || {}
              const upiTarget = item.upi_id || details.upiId || item.upiId
              const bankAcc = details.accountNumber || details.account_number || item.account_number
              const ifsc = details.ifsc || item.ifsc

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: isApproved ? '#ecfdf5' : isRejected ? '#fef2f2' : '#fefce8',
                          color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowUpRight size={20} />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                          {method === 'BANK' ? 'IMPS Bank Payout' : 'UPI Payout'}
                        </span>
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                          -₹{Number(item.amount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                        color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                      }}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>SUCCESSFUL</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <AlertCircle size={12} />
                          <span>REFUNDED</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>IN REVIEW</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      fontSize: 12,
                      color: '#475569',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Reference ID:</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          color: '#0f172a',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        <span>{String(item.id).slice(0, 10)}...</span>
                        {copiedId === item.id ? (
                          <Check size={12} style={{ color: '#10b981' }} />
                        ) : (
                          <Copy size={12} style={{ color: '#94a3b8' }} />
                        )}
                      </button>
                    </div>

                    {method === 'BANK' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Account:</span>
                          <span style={{ fontWeight: 600 }}>{bankAcc ? `••••${String(bankAcc).slice(-4)}` : 'Bank Transfer'}</span>
                        </div>
                        {ifsc && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>IFSC:</span>
                            <span style={{ fontWeight: 600 }}>{ifsc}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>UPI Target:</span>
                        <span style={{ fontWeight: 600 }}>{upiTarget || 'Registered UPI ID'}</span>
                      </div>
                    )}

                    {item.admin_notes && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: isRejected ? '#b91c1c' : '#0369a1' }}>
                        <span>Note:</span>
                        <span style={{ fontWeight: 600 }}>{item.admin_notes}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>Requested At:</span>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

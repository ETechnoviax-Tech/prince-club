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
  ArrowDownLeft,
  Bookmark,
} from 'lucide-react'
import { fetchUserDeposits } from '../../api/client'

export default function DepositHistoryPage({ currentUser, onBack }) {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [copiedId, setCopiedId] = useState(null)

  const loadDeposits = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUserDeposits(currentUser.id)
      if (Array.isArray(res?.deposits)) {
        setDeposits(res.deposits)
      } else {
        setDeposits([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load deposit history')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    loadDeposits()
  }, [loadDeposits])

  const handleCopy = (text, id) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = deposits.filter((d) => {
    if (filter === 'ALL') return true
    return String(d.status || '').toUpperCase() === filter
  })

  return (
    <div className="subpage-container">
      {/* 1. Top Header */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Deposit History</h2>
        <button
          className="subpage-right-action"
          onClick={loadDeposits}
          title="Refresh History"
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
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Completed' },
            { id: 'REJECTED', label: 'Rejected' },
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

        {/* 4. Deposit Items List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div className="spinner-border" style={{ margin: '0 auto 12px' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Loading deposits...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Bookmark size={42} style={{ color: '#94a3b8', margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>No Deposit Records</h4>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              {filter === 'ALL'
                ? 'You have not made any deposits yet.'
                : `No deposits found with status ${filter.toLowerCase()}.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => {
              const status = String(item.status || 'PENDING').toUpperCase()
              const isApproved = status === 'APPROVED' || status === 'COMPLETED'
              const isRejected = status === 'REJECTED'

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
                        <ArrowDownLeft size={20} />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                          UPI Deposit
                        </span>
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                          +₹{Number(item.amount || 0).toFixed(2)}
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
                          <span>COMPLETED</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <AlertCircle size={12} />
                          <span>REJECTED</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>PENDING</span>
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
                    {item.order_ref && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Order ID:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.order_ref, `ref-${item.id}`)}
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
                          <span>{item.order_ref}</span>
                          {copiedId === `ref-${item.id}` ? (
                            <Check size={12} style={{ color: '#10b981' }} />
                          ) : (
                            <Copy size={12} style={{ color: '#94a3b8' }} />
                          )}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>UTR Ref:</span>
                      {item.utr_number ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.utr_number, `utr-${item.id}`)}
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
                          <span>{item.utr_number}</span>
                          {copiedId === `utr-${item.id}` ? (
                            <Check size={12} style={{ color: '#10b981' }} />
                          ) : (
                            <Copy size={12} style={{ color: '#94a3b8' }} />
                          )}
                        </button>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11 }}>
                          Awaiting UTR submission
                        </span>
                      )}
                    </div>

                    {item.upi_vpa && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>VPA Address:</span>
                        <span style={{ fontWeight: 600 }}>{item.upi_vpa}</span>
                      </div>
                    )}

                    {item.admin_notes && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                        <span>Admin Note:</span>
                        <span style={{ fontWeight: 600 }}>{item.admin_notes}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>Date:</span>
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

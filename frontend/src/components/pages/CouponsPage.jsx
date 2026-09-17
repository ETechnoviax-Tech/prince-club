import React, { useState } from 'react'
import { ArrowLeft, Ticket, CheckCircle2, Clock, Sparkles, ArrowRight } from 'lucide-react'

export default function CouponsPage({ onBack, onApplyCouponToDeposit }) {
  const [activeTab, setActiveTab] = useState('usable')

  const coupons = [
    {
      id: 'CPN-500',
      title: '₹100 Top-Up Bonus',
      discount: '₹100 Extra',
      minDeposit: '₹500',
      expiry: 'Valid till 30 Sep 2026',
      code: 'TOPUP100',
      status: 'usable',
      tag: 'HOT',
    },
    {
      id: 'CPN-1000',
      title: '₹250 Mega Recharge Cash',
      discount: '₹250 Extra',
      minDeposit: '₹1,000',
      expiry: 'Valid till 30 Sep 2026',
      code: 'MEGA250',
      status: 'usable',
      tag: 'POPULAR',
    },
    {
      id: 'CPN-VIP',
      title: 'VIP 10% Unlimited Cashback',
      discount: '10% Extra',
      minDeposit: '₹2,000',
      expiry: 'Valid till 15 Oct 2026',
      code: 'VIP10PERCENT',
      status: 'usable',
      tag: 'VIP ONLY',
    },
    {
      id: 'CPN-USED-1',
      title: 'First Deposit Welcome Bonus',
      discount: '₹50 Extra',
      minDeposit: '₹100',
      expiry: 'Used on 12 Sep 2026',
      code: 'WELCOME50',
      status: 'used',
      tag: 'CLAIMED',
    },
  ]

  const filtered = coupons.filter((c) => c.status === activeTab)

  return (
    <div className="standalone-page-container">
      {/* Header */}
      <header className="standalone-page-header">
        <button className="standalone-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="standalone-page-title">My Top-Up Coupons</h2>
        <div style={{ width: 34 }} />
      </header>

      <div className="standalone-page-content">
        {/* Filter Pills */}
        <div className="deposit-channel-pills" style={{ marginBottom: 16 }}>
          {[
            { id: 'usable', label: 'Usable (3)' },
            { id: 'used', label: 'Used (1)' },
            { id: 'expired', label: 'Expired (0)' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`channel-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Coupons List */}
        {filtered.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Ticket size={42} style={{ color: '#94a3b8', margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>No Coupons Found</h4>
            <p style={{ color: '#64748b', fontSize: 13 }}>You currently have no vouchers in this category.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((cpn) => (
              <div
                key={cpn.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 16,
                  padding: '16px 18px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  opacity: cpn.status === 'usable' ? 1 : 0.65,
                }}
              >
                {/* Coupon Tag */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background:
                      cpn.tag === 'HOT'
                        ? '#ef4444'
                        : cpn.tag === 'VIP ONLY'
                        ? '#8b5cf6'
                        : cpn.tag === 'CLAIMED'
                        ? '#64748b'
                        : '#f59e0b',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderBottomLeftRadius: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  {cpn.tag}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: '#dc2626' }}>
                      {cpn.discount}
                    </h3>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {cpn.title}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>
                      Min. Deposit: <strong style={{ color: '#0f172a' }}>{cpn.minDeposit}</strong>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                      {cpn.expiry}
                    </div>
                  </div>

                  {cpn.status === 'usable' && (
                    <button
                      className="deposit-submit-btn"
                      onClick={() => onApplyCouponToDeposit && onApplyCouponToDeposit(cpn.code)}
                      style={{
                        padding: '8px 16px',
                        width: 'auto',
                        fontSize: 12.5,
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>Use Now</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

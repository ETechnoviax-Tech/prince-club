import React, { useState } from 'react'
import { ChevronLeft, HelpCircle, BookOpen, ShieldCheck, ArrowDownCircle, Coins, ChevronDown, ChevronUp } from 'lucide-react'
import { sound } from '../../utils/audio'
import './service.css'

export default function BeginnersGuidePage({ onBack }) {
  const [activeTab, setActiveTab] = useState('wingo')
  const [expandedFaq, setExpandedFaq] = useState(0)

  const tabs = [
    { id: 'wingo', label: 'Win Go Rules' },
    { id: 'deposit', label: 'How to Deposit' },
    { id: 'withdraw', label: 'How to Withdraw' },
    { id: 'security', label: 'Fair Play & RNG' },
  ]

  const toggleFaq = (idx) => {
    sound.playTick?.()
    setExpandedFaq(expandedFaq === idx ? -1 : idx)
  }

  return (
    <div className="service-page-container">
      {/* Header */}
      <header className="service-page-header">
        <button
          className="service-back-btn"
          onClick={() => {
            sound.playTick?.()
            onBack?.()
          }}
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="service-header-title">Beginner's Guide</h1>
        <div className="service-header-spacer" />
      </header>

      <div className="service-content">
        {/* Navigation Tabs */}
        <div className="service-tabs-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`service-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                sound.playTick?.()
                setActiveTab(tab.id)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: WIN GO RULES */}
        {activeTab === 'wingo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="service-card">
              <h2 className="service-card-title">How to Play Win Go Lottery</h2>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
                Win Go is a live 30-second to 5-minute prediction lottery. Players predict whether the upcoming round will result in Green, Red, Violet, Big (5-9), Small (0-4), or exact digits (0-9).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: '#16a34a', fontSize: 13 }}>🟢 Green (1, 3, 7, 9)</strong>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                    Win Multiplier: <strong>2.0x</strong><br />If result is 5: <strong>1.5x</strong>
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: '#dc2626', fontSize: 13 }}>🔴 Red (2, 4, 6, 8)</strong>
                  <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                    Win Multiplier: <strong>2.0x</strong><br />If result is 0: <strong>1.5x</strong>
                  </div>
                </div>

                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: '#9333ea', fontSize: 13 }}>🟣 Violet (0, 5)</strong>
                  <div style={{ fontSize: 12, color: '#6b21a8', marginTop: 4 }}>
                    Win Multiplier: <strong>4.5x</strong><br />Triggers on 0 or 5
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: '#2563eb', fontSize: 13 }}>⭐ Numbers (0–9)</strong>
                  <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                    Exact Number: <strong>9.0x</strong><br />Highest return!
                  </div>
                </div>
              </div>
            </div>

            <div className="service-card">
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                Big / Small Prediction
              </h3>
              <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                • <strong>Big</strong>: Digits 5, 6, 7, 8, 9 (2.0x payout)<br />
                • <strong>Small</strong>: Digits 0, 1, 2, 3, 4 (2.0x payout)
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT TUTORIAL */}
        {activeTab === 'deposit' && (
          <div className="service-card">
            <h2 className="service-card-title">Step-by-Step Deposit Guide</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f84545', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>1</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Select Payment Method & Amount</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Open the Deposit page, choose your preferred UPI channel (PhonePe, Paytm, GPay), and pick an amount (Min ₹100).
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f84545', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>2</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Scan UPI QR or Copy VPA</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Scan the dynamic merchant QR code in any UPI application and complete your payment.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f84545', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>3</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Submit 12-Digit UTR Number</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Copy the 12-digit UTR transaction reference from your UPI receipt, paste it into the deposit confirmation box, and tap Submit. Funds credit automatically in 10-60 seconds!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WITHDRAWAL GUIDE */}
        {activeTab === 'withdraw' && (
          <div className="service-card">
            <h2 className="service-card-title">How to Withdraw Funds</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>1</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Enter Payout Method & Amount</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Choose UPI or Direct Bank Transfer. Minimum withdrawal amount is ₹100.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>2</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Confirm Destination Credentials</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Ensure your UPI ID (e.g. name@okhdfcbank) or Bank Account & IFSC are accurate before confirming.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>3</div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Processing & Payout</strong>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
                    Withdrawals are processed through fast automated banking channels 24/7. Track status in Withdrawal History.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FAIR PLAY & SECURITY */}
        {activeTab === 'security' && (
          <div className="service-card">
            <h2 className="service-card-title">Cryptographic RNG & Fair Play</h2>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
              69 Club operates on certified fair-play architectures. Every lottery draw and game crash point is mathematically proven and immutable.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>🔒 SHA-256 Provably Fair</strong>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  Aviator crash curves are pre-hashed before round start. Players can verify cryptographic seeds independently.
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>🛡️ Anti-Tamper Draw Seeds</strong>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  Win Go lottery draw numbers synchronize with authoritative upstream providers (55Club / VeerGame) with zero manual manipulation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { ChevronLeft, Copy, ChevronRight, X, Users, BookOpen } from 'lucide-react'
import { sound } from '../../utils/audio'
import { fetchPromotionStats } from '../../api/client'
import './partner_rewards.css'

export default function PartnerRewardsPage({
  currentUser,
  userId,
  onBack,
  onCopyNotification,
}) {
  const activeUserId = currentUser?.id || userId
  const [stats, setStats] = useState({
    invitationCount: 0,
    effectiveCount: 0,
    totalBonus: '0.00',
    referralCode: currentUser?.referral_code || '654568129509',
    referralLink: '',
    subordinates: [],
  })
  const [copied, setCopied] = useState(false)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  useEffect(() => {
    if (activeUserId) {
      fetchPromotionStats(activeUserId)
        .then((res) => {
          if (res?.success) {
            setStats({
              invitationCount: res.directStats?.registerCount ?? (res.directSubordinates || 0),
              effectiveCount: res.directStats?.firstDepositCount ?? 0,
              totalBonus: res.cumulativeTotal || '0.00',
              referralCode: res.referralCode || stats.referralCode,
              referralLink: res.referralLink || '',
              subordinates: res.subordinates || [],
            })
          }
        })
        .catch(() => {})
    }
  }, [activeUserId])

  const appOrigin =
    typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : import.meta.env?.VITE_APP_DOMAIN
      ? `https://${import.meta.env.VITE_APP_DOMAIN}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://69club1.site'

  const effectiveLink = stats.referralLink || `${appOrigin}?ref=${stats.referralCode}`

  const showToast = (msg) => {
    setToastMsg(msg)
    if (onCopyNotification) onCopyNotification(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const handleCopyLink = () => {
    sound.playTick?.()
    navigator.clipboard?.writeText(effectiveLink)
    setCopied(true)
    showToast('Invitation link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="partner-rewards-container">
      {/* 1. Header */}
      <header className="partner-rewards-header">
        <button
          type="button"
          className="partner-rewards-back-btn"
          onClick={() => {
            sound.playTick?.()
            onBack?.()
          }}
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="partner-rewards-title">Partner rewards</h1>
      </header>

      <div className="partner-rewards-content">
        {/* 2. Golden Trophy Hero Banner */}
        <div className="partner-hero-banner">
          <div className="partner-hero-left">🏆</div>
          <div className="partner-hero-right">
            <span className="partner-hero-tagline">Invite friends to get max rewards</span>
            <div className="partner-hero-badge">₹5,888.00</div>
          </div>
        </div>

        {/* 3. Three Stat Tiles */}
        <div className="partner-stat-card">
          <span className="partner-stat-label">Invitation count</span>
          <span className="partner-stat-value">{stats.invitationCount}</span>
        </div>

        <div className="partner-stat-card">
          <span className="partner-stat-label">Effective invitation count</span>
          <span className="partner-stat-value green">{stats.effectiveCount}</span>
        </div>

        <div className="partner-stat-card">
          <span className="partner-stat-label">Invitation total bonus</span>
          <span className="partner-stat-value coral">₹{stats.totalBonus}</span>
        </div>

        {/* 4. Invitation record link */}
        <div
          className="partner-invitation-record-link"
          onClick={() => {
            sound.playTick?.()
            setRecordModalOpen(true)
          }}
        >
          <span>Invitation record</span>
          <ChevronRight size={14} />
        </div>

        {/* 5. INVITATION LINK Section */}
        <div className="partner-section-title">
          <div className="partner-section-bar" />
          <span>INVITATION LINK</span>
        </div>

        <div className="partner-link-box">
          <input
            type="text"
            readOnly
            value={effectiveLink}
            className="partner-link-input"
            onClick={handleCopyLink}
          />
          <button
            type="button"
            className="partner-link-copy-btn"
            onClick={handleCopyLink}
            title="Copy invitation link"
          >
            <Copy size={16} />
          </button>
        </div>

        {/* 6. Invitation Rules Section */}
        <div className="partner-rules-heading">
          <BookOpen size={16} color="#f84545" />
          <span>Invitation rules</span>
        </div>

        <div className="partner-rules-sub">
          If you invites player A, with in <span className="highlight-red">7 Day</span>
        </div>

        {/* 7. Structured Table matching Screenshots 1 & 2 */}
        <table className="partner-rules-table">
          <thead>
            <tr>
              <th>When Player A</th>
              <th>You get bonus</th>
            </tr>
          </thead>
          <tbody>
            {/* 1st Deposit Group */}
            <tr>
              <td rowSpan={6} className="partner-table-deposit-col">
                1st<br />deposit
              </td>
              <td className="partner-table-condition-cell">
                ₹100 ≤ Amount &lt; ₹500<br />and Turnover ≥ ₹300
              </td>
              <td className="partner-table-bonus-cell">₹28</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹500 ≤ Amount &lt; ₹1,200<br />and Turnover ≥ ₹1,500
              </td>
              <td className="partner-table-bonus-cell">₹68</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹1,200 ≤ Amount &lt; ₹5,000<br />and Turnover ≥ ₹3,600
              </td>
              <td className="partner-table-bonus-cell">₹128</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹5,000 ≤ Amount &lt; ₹12,000<br />and Turnover ≥ ₹15,000
              </td>
              <td className="partner-table-bonus-cell">₹328</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹12,000 ≤ Amount &lt; ₹60,000<br />and Turnover ≥ ₹36,000
              </td>
              <td className="partner-table-bonus-cell">₹528</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                Amount ≥ ₹60,000<br />and Turnover ≥ ₹180,000
              </td>
              <td className="partner-table-bonus-cell">₹1,888</td>
            </tr>

            {/* 2nd Deposit Group */}
            <tr>
              <td rowSpan={6} className="partner-table-deposit-col">
                2nd<br />deposit
              </td>
              <td className="partner-table-condition-cell">
                ₹200 ≤ Amount &lt; ₹500<br />and Turnover ≥ ₹900
              </td>
              <td className="partner-table-bonus-cell">₹48</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹500 ≤ Amount &lt; ₹1,200<br />and Turnover ≥ ₹3,000
              </td>
              <td className="partner-table-bonus-cell">₹88</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹1,200 ≤ Amount &lt; ₹5,000<br />and Turnover ≥ ₹7,200
              </td>
              <td className="partner-table-bonus-cell">₹168</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹5,000 ≤ Amount &lt; ₹12,000<br />and Turnover ≥ ₹30,000
              </td>
              <td className="partner-table-bonus-cell">₹468</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹12,000 ≤ Amount &lt; ₹60,000<br />and Turnover ≥ ₹72,000
              </td>
              <td className="partner-table-bonus-cell">₹688</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                Amount ≥ ₹60,000<br />and Turnover ≥ ₹360,000
              </td>
              <td className="partner-table-bonus-cell">₹4,888</td>
            </tr>

            {/* 3rd Deposit Group */}
            <tr>
              <td rowSpan={4} className="partner-table-deposit-col">
                3rd<br />deposit
              </td>
              <td className="partner-table-condition-cell">
                ₹1,000 ≤ Amount &lt; ₹5,000<br />and Turnover ≥ ₹8,000
              </td>
              <td className="partner-table-bonus-cell">₹88</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹5,000 ≤ Amount &lt; ₹12,000<br />and Turnover ≥ ₹45,000
              </td>
              <td className="partner-table-bonus-cell">₹488</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                ₹12,000 ≤ Amount &lt; ₹60,000<br />and Turnover ≥ ₹108,000
              </td>
              <td className="partner-table-bonus-cell">₹888</td>
            </tr>
            <tr>
              <td className="partner-table-condition-cell">
                Amount ≥ ₹60,000<br />and Turnover ≥ ₹540,000
              </td>
              <td className="partner-table-bonus-cell">₹5,888</td>
            </tr>
          </tbody>
        </table>

        {/* 8. Disclaimer & Diamond Bullet Rules */}
        <div className="partner-single-bonus-disclaimer">
          Each deposit is eligible for only one bonus.
        </div>

        <div className="partner-diamond-bullets">
          <div className="partner-diamond-row">
            <span className="partner-diamond-marker">◆</span>
            <span>
              eg: Player A 1st deposit <span style={{ color: '#f84545' }}>₹99.00</span> and turnover{' '}
              <span style={{ color: '#f84545' }}>₹300.00</span>, you can't get bonus
            </span>
          </div>

          <div className="partner-diamond-row">
            <span className="partner-diamond-marker">◆</span>
            <span>
              the reward has no limitation, the more you invited the more rewards you will get it
            </span>
          </div>

          <div className="partner-diamond-row">
            <span className="partner-diamond-marker">◆</span>
            <span>
              If the conditions are met the rewards will be automatically credited to player's balance
            </span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && <div className="partner-toast">{toastMsg}</div>}

      {/* Invitation Record Modal */}
      {recordModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setRecordModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 380,
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <strong style={{ fontSize: 15, color: '#0f172a' }}>Invitation Records</strong>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto' }}>
              {stats.subordinates && stats.subordinates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.subordinates.map((sub, i) => (
                    <div
                      key={sub.id || i}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                          {sub.username}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          Registered:{' '}
                          {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#ecfdf5',
                          color: '#10b981',
                        }}
                      >
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                  <div>No invitation records yet.</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>
                    Share your invitation link to recruit team partners!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

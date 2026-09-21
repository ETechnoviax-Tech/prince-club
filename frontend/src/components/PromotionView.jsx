import React, { useState, useEffect, useCallback } from 'react'
import {
  Copy,
  ChevronRight,
  X,
  Filter,
  Users,
  Calendar,
  FileText,
  Bookmark,
  Headphones,
  Coins,
  CheckCircle2,
  Award,
  Layers,
} from 'lucide-react'
import { sound } from '../utils/audio'
import { fetchPromotionStats } from '../api/client'
import './promotion.css'

export function PromotionView({ currentUser, userId, onCopyNotification, onNavigate }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'partner' | 'subordinates' | 'commission' | 'rules' | 'rebate'
  const [toastMsg, setToastMsg] = useState(null)

  const activeUserId = currentUser?.id || userId

  // Real Agent Promotion stats from server
  const [promoData, setPromoData] = useState({
    referralCode: currentUser?.referral_code || '654568129509',
    referralLink: '',
    yesterdayCommission: '0',
    directStats: {
      registerCount: 0,
      depositNumber: 0,
      depositAmount: '0',
      firstDepositCount: 0,
    },
    teamStats: {
      registerCount: 0,
      depositNumber: 0,
      depositAmount: '0',
      firstDepositCount: 0,
    },
    promotionData: {
      thisWeek: '0',
      totalCommission: '0',
      directSubordinates: 0,
      totalTeamMembers: 0,
    },
    subordinates: [],
  })

  const loadPromotionData = useCallback(async () => {
    if (!activeUserId) return
    try {
      setLoading(true)
      const data = await fetchPromotionStats(activeUserId)
      if (data?.success) {
        setPromoData({
          referralCode: data.referralCode || promoData.referralCode,
          referralLink: data.referralLink || '',
          yesterdayCommission: data.yesterdayCommission || '0',
          directStats: data.directStats || {
            registerCount: data.directSubordinates || 0,
            depositNumber: 0,
            depositAmount: '0',
            firstDepositCount: 0,
          },
          teamStats: data.teamStats || {
            registerCount: data.totalTeamMembers || 0,
            depositNumber: 0,
            depositAmount: '0',
            firstDepositCount: 0,
          },
          promotionData: data.promotionData || {
            thisWeek: '0',
            totalCommission: data.cumulativeTotal || '0',
            directSubordinates: data.directSubordinates || 0,
            totalTeamMembers: data.totalTeamMembers || 0,
          },
          subordinates: data.subordinates || [],
        })
      }
    } catch (err) {
      console.warn('[PromotionView] Could not load promotion data:', err.message)
    } finally {
      setLoading(false)
    }
  }, [activeUserId])

  useEffect(() => {
    loadPromotionData()
  }, [loadPromotionData])

  const appOrigin =
    typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : import.meta.env?.VITE_APP_DOMAIN
      ? `https://${import.meta.env.VITE_APP_DOMAIN}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://69club1.site'

  const effectiveReferralCode = promoData.referralCode || '654568129509'
  const effectiveReferralLink = promoData.referralLink || `${appOrigin}?ref=${effectiveReferralCode}`

  const showToast = (msg) => {
    setToastMsg(msg)
    if (onCopyNotification) onCopyNotification(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const handleCopyCode = (e) => {
    e?.stopPropagation()
    sound.playTick?.()
    navigator.clipboard?.writeText(effectiveReferralCode)
    setCopiedCode(true)
    showToast('Invitation code copied to clipboard!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = () => {
    sound.playBet?.()
    navigator.clipboard?.writeText(effectiveReferralLink)
    setCopiedLink(true)
    showToast('Invitation link copied! Share with friends.')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="agency-page-container">
      {/* 1. Header */}
      <header className="agency-header">
        <h1 className="agency-header-title">Agency</h1>
        <button
          type="button"
          className="agency-header-right-btn"
          onClick={() => {
            sound.playTick?.()
            setActiveModal('subordinates')
          }}
          title="Filter / Records"
        >
          <Filter size={16} />
        </button>
      </header>

      <div className="agency-content">
        {/* 2. Hero Card with Coral Sunset Gradient */}
        <div className="agency-hero-card">
          <div className="agency-hero-stat-large">
            {Number(promoData.yesterdayCommission) || 0}
          </div>
          <div className="agency-hero-pill-badge">
            Yesterday's total commission
          </div>
          <div className="agency-hero-subtitle">
            Upgrade the level to increase commission income
          </div>

          {/* 2-Column Subordinate Breakdown Table */}
          <div className="agency-subordinate-table">
            <div className="subordinate-table-header">
              <div className="subordinate-header-col">Direct subordinates</div>
              <div className="subordinate-header-col">Team subordinates</div>
            </div>
            <div className="subordinate-table-body">
              {/* Row 1: Number of register */}
              <div className="subordinate-table-row">
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val">
                    {promoData.directStats?.registerCount ?? 0}
                  </span>
                  <span className="subordinate-cell-label">Number of register</span>
                </div>
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val">
                    {promoData.teamStats?.registerCount ?? 0}
                  </span>
                  <span className="subordinate-cell-label">Number of register</span>
                </div>
              </div>

              {/* Row 2: Deposit number */}
              <div className="subordinate-table-row">
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val green">
                    {promoData.directStats?.depositNumber ?? 0}
                  </span>
                  <span className="subordinate-cell-label">Deposit number</span>
                </div>
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val green">
                    {promoData.teamStats?.depositNumber ?? 0}
                  </span>
                  <span className="subordinate-cell-label">Deposit number</span>
                </div>
              </div>

              {/* Row 3: Deposit amount */}
              <div className="subordinate-table-row">
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val orange">
                    {Number(promoData.directStats?.depositAmount) || 0}
                  </span>
                  <span className="subordinate-cell-label">Deposit amount</span>
                </div>
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val orange">
                    {Number(promoData.teamStats?.depositAmount) || 0}
                  </span>
                  <span className="subordinate-cell-label">Deposit amount</span>
                </div>
              </div>

              {/* Row 4: First deposit count */}
              <div className="subordinate-table-row">
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val">
                    {promoData.directStats?.firstDepositCount ?? 0}
                  </span>
                  <span className="subordinate-cell-label">
                    Number of people making first deposit
                  </span>
                </div>
                <div className="subordinate-cell">
                  <span className="subordinate-cell-val">
                    {promoData.teamStats?.firstDepositCount ?? 0}
                  </span>
                  <span className="subordinate-cell-label">
                    Number of people making first deposit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Big Coral Pill Button: INVITATION LINK */}
        <button
          type="button"
          className="btn-invitation-link"
          onClick={handleCopyLink}
        >
          {copiedLink ? 'COPIED LINK!' : 'INVITATION LINK'}
        </button>

        {/* 4. Menu Rows List */}
        <div className="agency-menu-list">
          {/* Row 1: Partner rewards */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              if (onNavigate) {
                onNavigate('partner-rewards')
              } else {
                setActiveModal('partner')
              }
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Users size={18} />
              </div>
              <span className="agency-menu-title">Partner rewards</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* Row 2: Copy invitation code */}
          <div
            className="agency-menu-card"
            onClick={handleCopyCode}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Layers size={18} />
              </div>
              <span className="agency-menu-title">Copy invitation code</span>
            </div>
            <div className="agency-menu-right">
              <span className="agency-code-text">{effectiveReferralCode}</span>
              <button
                type="button"
                className="agency-copy-btn"
                onClick={handleCopyCode}
                title="Copy code"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Row 3: Subordinate data */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              setActiveModal('subordinates')
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Calendar size={18} />
              </div>
              <span className="agency-menu-title">Subordinate data</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* Row 4: Commission detail */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              setActiveModal('commission')
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <FileText size={18} />
              </div>
              <span className="agency-menu-title">Commission detail</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* Row 5: Invitation rules */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              setActiveModal('rules')
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Bookmark size={18} />
              </div>
              <span className="agency-menu-title">Invitation rules</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* Row 6: Agent line customer service */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              if (onNavigate) {
                onNavigate('customerservice')
              } else {
                setActiveModal('service')
              }
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Headphones size={18} />
              </div>
              <span className="agency-menu-title">Agent line customer service</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* Row 7: Rebate ratio */}
          <div
            className="agency-menu-card"
            onClick={() => {
              sound.playTick?.()
              setActiveModal('rebate')
            }}
          >
            <div className="agency-menu-left">
              <div className="agency-menu-icon-wrap">
                <Coins size={18} />
              </div>
              <span className="agency-menu-title">Rebate ratio</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>
        </div>

        {/* 5. Promotion data Section */}
        <div className="promotion-data-section">
          <div className="promotion-data-heading">
            <span className="promotion-data-icon">🎟️</span>
            <span>Promotion data</span>
          </div>

          <div className="promotion-data-card">
            {/* Cell 1: This Week */}
            <div className="promotion-data-cell">
              <span className="promotion-data-cell-val">
                {Number(promoData.promotionData?.thisWeek) || 0}
              </span>
              <span className="promotion-data-cell-label">This Week</span>
            </div>

            {/* Cell 2: Total commission */}
            <div className="promotion-data-cell">
              <span className="promotion-data-cell-val">
                {Number(promoData.promotionData?.totalCommission) || 0}
              </span>
              <span className="promotion-data-cell-label">Total commission</span>
            </div>

            {/* Cell 3: Direct Subordinate */}
            <div className="promotion-data-cell">
              <span className="promotion-data-cell-val">
                {promoData.promotionData?.directSubordinates ?? 0}
              </span>
              <span className="promotion-data-cell-label">Direct Subordinate</span>
            </div>

            {/* Cell 4: Total number of subordinates in the team */}
            <div className="promotion-data-cell">
              <span className="promotion-data-cell-val">
                {promoData.promotionData?.totalTeamMembers ?? 0}
              </span>
              <span className="promotion-data-cell-label">
                Total number of subordinates in the team
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast popup */}
      {toastMsg && <div className="agency-toast">{toastMsg}</div>}

      {/* MODAL 1: Partner Rewards */}
      {activeModal === 'partner' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Partner Rewards</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body">
              <p style={{ margin: '0 0 14px 0', color: '#64748b' }}>
                Build your team and earn massive monthly management salaries and instant tiered commission.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { level: 'Level 1 Agent', team: '5 Active Members', reward: '₹500 / month + 0.60% Rebate' },
                  { level: 'Level 2 Agent', team: '20 Active Members', reward: '₹2,500 / month + 0.65% Rebate' },
                  { level: 'Level 3 Agent', team: '50 Active Members', reward: '₹8,000 / month + 0.70% Rebate' },
                  { level: 'Level 4 Agent', team: '150 Active Members', reward: '₹25,000 / month + 0.75% Rebate' },
                  { level: 'Level 5 Agent', team: '500 Active Members', reward: '₹1,00,000 / month + 0.80% Rebate' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{item.level}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Requirement: {item.team}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f84545', marginTop: 2 }}>
                      {item.reward}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Subordinate Data */}
      {activeModal === 'subordinates' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Subordinate Data</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body">
              {promoData.subordinates && promoData.subordinates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {promoData.subordinates.map((sub, i) => (
                    <div
                      key={sub.id || i}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
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
                          background: sub.tier?.includes('Direct') ? '#fee2e2' : '#f1f5f9',
                          color: sub.tier?.includes('Direct') ? '#f84545' : '#64748b',
                        }}
                      >
                        {sub.tier}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
                  <div>No subordinates yet.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Share your invitation link to recruit team members!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Commission Detail */}
      {activeModal === 'commission' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Commission Detail</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    padding: 14,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b' }}>Yesterday Commission</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f84545', marginTop: 2 }}>
                    ₹{promoData.yesterdayCommission}
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b' }}>This Week Commission</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    ₹{promoData.promotionData?.thisWeek || '0.00'}
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Cumulative Commission</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                    ₹{promoData.promotionData?.totalCommission || '0.00'}
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  • Commission is calculated automatically every night at 00:00:00 UTC and settled into your agent balance.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Invitation Rules */}
      {activeModal === 'rules' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Invitation Rules</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13.5 }}>1. Commission Structure</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5 }}>
                    As a verified agent, you earn multi-tier turnover commissions from every bet placed by users in your referral chain:
                  </p>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, color: '#475569', fontSize: 12 }}>
                    <li><strong>Tier 1 (Direct Subordinates):</strong> 0.60% of all valid betting turnover.</li>
                    <li><strong>Tier 2 (Team Subordinates):</strong> 0.18% of all valid betting turnover.</li>
                  </ul>
                </div>

                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13.5 }}>2. Settlement Cycle</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5 }}>
                    Commissions are calculated daily from 00:00 to 23:59 and automatically credited to your wallet balance every day at 00:00.
                  </p>
                </div>

                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13.5 }}>3. Zero Risk & Lifetime Validity</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 12.5 }}>
                    Your referral code and invitation links never expire. Once a player registers under your invitation link, they remain permanently bound to your agency team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Rebate Ratio */}
      {activeModal === 'rebate' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Rebate Ratio</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#ff5240', color: '#ffffff' }}>
                    <th style={{ padding: '8px 6px', borderTopLeftRadius: 8 }}>Tier</th>
                    <th style={{ padding: '8px 6px' }}>Commission</th>
                    <th style={{ padding: '8px 6px', borderTopRightRadius: 8 }}>Turnover Ex.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>Tier 1 (Direct)</td>
                    <td style={{ padding: '10px 6px', color: '#16a34a', fontWeight: 700 }}>0.60%</td>
                    <td style={{ padding: '10px 6px', color: '#64748b' }}>₹1,00,000 = ₹600</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>Tier 2 (Team)</td>
                    <td style={{ padding: '10px 6px', color: '#16a34a', fontWeight: 700 }}>0.18%</td>
                    <td style={{ padding: '10px 6px', color: '#64748b' }}>₹1,00,000 = ₹180</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>VIP Bonus</td>
                    <td style={{ padding: '10px 6px', color: '#f84545', fontWeight: 700 }}>+0.20%</td>
                    <td style={{ padding: '10px 6px', color: '#64748b' }}>Scales with Level</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Customer Service fallback */}
      {activeModal === 'service' && (
        <div className="agency-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="agency-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agency-modal-header">
              <span className="agency-modal-title">Agent Line Support</span>
              <button
                type="button"
                className="agency-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="agency-modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <Headphones size={44} color="#f84545" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>24/7 Dedicated Agent Manager</div>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '8px 0 18px 0' }}>
                Have questions about team bonuses or high-volume agent commission contracts? Our support team is online 24/7.
              </p>
              <button
                type="button"
                className="btn-invitation-link"
                style={{ height: 42, fontSize: 14 }}
                onClick={() => {
                  window.open('https://t.me/club69_support', '_blank')
                  setActiveModal(null)
                }}
              >
                Open Telegram Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromotionView

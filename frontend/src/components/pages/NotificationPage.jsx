import React, { useState } from 'react'
import { ArrowLeft, Bell, Trash2, CheckCircle2, ShieldAlert, Sparkles, Gift, Clock, ChevronRight } from 'lucide-react'

export default function NotificationPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'system',
      title: '69 Club Platform Upgrade',
      desc: 'System performance enhanced with 100% instant UPI deposits and fast withdrawals.',
      time: '10 mins ago',
      unread: true,
    },
    {
      id: 2,
      type: 'prize',
      title: 'Daily VIP Bonus Unlocked',
      desc: 'Your daily VIP check-in credit is available. Claim up to ₹50 in your VIP Center.',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 3,
      type: 'activity',
      title: 'Mega Spin Wheel Active',
      desc: 'Spin the Fortune Wheel now to win exclusive cash prizes up to ₹500 directly to your balance.',
      time: '3 hours ago',
      unread: true,
    },
    {
      id: 4,
      type: 'system',
      title: 'Security Alert: Login Verified',
      desc: 'Your account was successfully authenticated. 2FA dual-verification security is active.',
      time: 'Yesterday',
      unread: false,
    },
    {
      id: 5,
      type: 'prize',
      title: 'Withdrawal Payout Processed',
      desc: 'Your instant withdrawal request was approved by the system gateway.',
      time: '2 days ago',
      unread: false,
    },
    {
      id: 6,
      type: 'activity',
      title: 'Win Go 30s High Payout Event',
      desc: 'Experience lightning-fast color trading rounds with guaranteed 2.0x and 9.0x multipliers.',
      time: '3 days ago',
      unread: false,
    },
  ])

  const filtered = activeTab === 'all' ? notifications : notifications.filter((n) => n.type === activeTab)

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  return (
    <div className="standalone-page-container">
      {/* Header */}
      <header className="standalone-page-header">
        <button className="standalone-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="standalone-page-title">Notification Center</h2>
        <div className="header-action-group" style={{ display: 'flex', gap: 6 }}>
          <button
            className="standalone-back-btn"
            onClick={handleMarkAllRead}
            title="Mark All Read"
            style={{ fontSize: 12, width: 'auto', padding: '0 10px', borderRadius: 16 }}
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            className="standalone-back-btn"
            onClick={handleClearAll}
            title="Clear All"
            style={{ fontSize: 12, width: 'auto', padding: '0 10px', borderRadius: 16 }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="standalone-page-content">
        {/* Filter Pills */}
        <div className="deposit-channel-pills" style={{ marginBottom: 16 }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'system', label: 'System' },
            { id: 'activity', label: 'Activity' },
            { id: 'prize', label: 'Prizes' },
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

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Bell size={42} style={{ color: '#94a3b8', margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>No Notifications</h4>
            <p style={{ color: '#64748b', fontSize: 13 }}>You are all caught up with recent messages.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  background: item.unread ? '#ffffff' : '#f8fafc',
                  border: `1px solid ${item.unread ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  boxShadow: item.unread ? '0 2px 8px rgba(239, 68, 68, 0.08)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background:
                      item.type === 'system'
                        ? '#eff6ff'
                        : item.type === 'prize'
                        ? '#fef3c7'
                        : '#fdf2f8',
                    color:
                      item.type === 'system'
                        ? '#2563eb'
                        : item.type === 'prize'
                        ? '#b45309'
                        : '#db2777',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.type === 'system' ? (
                    <ShieldAlert size={18} />
                  ) : item.type === 'prize' ? (
                    <Gift size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {item.title}
                    </h4>
                    {item.unread && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ef4444',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: '#475569', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                    <Clock size={12} />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

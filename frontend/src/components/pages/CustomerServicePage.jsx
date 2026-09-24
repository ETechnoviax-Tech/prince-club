import React, { useState } from 'react'
import { ArrowLeft, Headphones, MessageCircle, Send, HelpCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Clock } from 'lucide-react'

export default function CustomerServicePage({ onBack }) {
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    {
      q: 'How long does UPI Deposit take to reflect in my balance?',
      a: 'Instant UPI deposits via PhonePe, Google Pay, and Paytm reflect within 30 to 60 seconds after entering your 12-digit UTR reference number.',
    },
    {
      q: 'What is the minimum withdrawal amount?',
      a: 'The minimum withdrawal is ₹100. Payouts are processed directly to your registered UPI ID or IMPS Bank Account within 5 to 15 minutes.',
    },
    {
      q: 'How do I claim the VIP Daily Bonus?',
      a: 'Visit the VIP Center daily to claim free credits. The higher your VIP tier, the larger your daily check-in rewards and weekly cashback.',
    },
    {
      q: 'What happens if my round locks while betting?',
      a: 'Each round enters an 8-second lock window before settlement to process orders authoritative on the server. Bets placed before lock are securely recorded.',
    },
    {
      q: 'How do I change my bound Bank Account or UPI ID?',
      a: 'For anti-fraud security and balance protection, bound withdrawal methods are permanently locked once set. To update or reset your bound Bank Account or UPI ID, please connect with our 24/7 Live Agent or WhatsApp Support with your account ID and verification proof. Our admin support will reset it for you.',
    },
    {
      q: 'Is my data and wallet balance protected?',
      a: 'Yes. 69 Club utilizes bank-grade cryptographic hashing, anti-inspect client protection, and atomic database transactions.',
    },
  ]

  const handleOpenChannel = (channel) => {
    if (channel === 'telegram') {
      window.open('https://t.me/Club69Official', '_blank')
    } else if (channel === 'whatsapp') {
      window.open('https://wa.me/919999999999?text=Hello%2069%20Club%20Support', '_blank')
    } else {
      alert('Connecting to 24/7 Live Agent. Typical response time is under 30 seconds.')
    }
  }

  return (
    <div className="standalone-page-container">
      {/* Header */}
      <header className="standalone-page-header">
        <button className="standalone-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="standalone-page-title">Customer Service</h2>
        <div style={{ width: 34 }} />
      </header>

      <div className="standalone-page-content">
        {/* Support Hero Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ff6054 0%, #f2413b 50%, #e62c25 100%)',
            borderRadius: 18,
            padding: '22px 18px',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(230, 44, 37, 0.3)',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 10px',
            }}
          >
            <Headphones size={26} />
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 900 }}>24/7 VIP Help Center</h3>
          <p style={{ margin: 0, fontSize: 12.5, opacity: 0.9 }}>
            Our support specialists are online 24/7 to assist with your deposits, withdrawals, and account inquiries.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, fontSize: 11, fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.15)', padding: '3px 8px', borderRadius: 12 }}>
              <Clock size={12} /> Response: &lt; 30s
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.15)', padding: '3px 8px', borderRadius: 12 }}>
              <ShieldCheck size={12} /> 100% Verified
            </span>
          </div>
        </div>

        {/* Contact Channels Grid */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Official Support Channels
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 24 }}>
          {/* Live Chat */}
          <div
            onClick={() => handleOpenChannel('chat')}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                <MessageCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>24/7 Live Chat</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Connect with an online support executive instantly</div>
              </div>
            </div>
            <ExternalLink size={16} style={{ color: '#94a3b8' }} />
          </div>

          {/* Telegram */}
          <div
            onClick={() => handleOpenChannel('telegram')}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center' }}>
                <Send size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Telegram Channel</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>@Club69Official · Daily gift codes & updates</div>
              </div>
            </div>
            <ExternalLink size={16} style={{ color: '#94a3b8' }} />
          </div>

          {/* WhatsApp */}
          <div
            onClick={() => handleOpenChannel('whatsapp')}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                <Headphones size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>WhatsApp VIP Desk</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Dedicated manager for VIP deposit & withdrawal queries</div>
              </div>
            </div>
            <ExternalLink size={16} style={{ color: '#94a3b8' }} />
          </div>
        </div>

        {/* FAQs */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Frequently Asked Questions
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {isOpen && (
                  <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#475569', lineHeight: 1.4, borderTop: '1px solid #f8fafc' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

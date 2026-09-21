import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, MessageSquare, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { sound } from '../../utils/audio'
import { submitFeedbackTicket, fetchUserFeedback } from '../../api/client'
import './service.css'

export default function FeedbackPage({
  onBack,
  currentUser,
  userId,
}) {
  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'history'
  const [category, setCategory] = useState('Deposit/Withdrawal Issue')
  const [message, setMessage] = useState('')
  const [contactInfo, setContactInfo] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [feedbackAlert, setFeedbackAlert] = useState(null)

  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  const activeUserId = currentUser?.id || userId

  const loadTickets = useCallback(async () => {
    if (!activeUserId) return
    try {
      setLoadingTickets(true)
      const list = await fetchUserFeedback(activeUserId)
      setTickets(list)
    } catch (err) {
      console.warn('[FeedbackPage] Failed to fetch tickets:', err.message)
    } finally {
      setLoadingTickets(false)
    }
  }, [activeUserId])

  useEffect(() => {
    if (activeTab === 'history') {
      loadTickets()
    }
  }, [activeTab, loadTickets])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || message.trim().length < 5) {
      setFeedbackAlert({ type: 'error', text: 'Please enter at least 5 characters for your message.' })
      return
    }

    setSubmitting(true)
    setFeedbackAlert(null)
    sound.playBet?.()

    try {
      const res = await submitFeedbackTicket(category, message, contactInfo)
      sound.playWin?.()
      setFeedbackAlert({
        type: 'success',
        text: res.message || 'Feedback submitted successfully! Our support staff will review your ticket.',
      })
      setMessage('')
      setContactInfo('')
      loadTickets()
    } catch (err) {
      sound.playLose?.()
      setFeedbackAlert({
        type: 'error',
        text: err.message || 'Failed to submit feedback. Please check your internet connection.',
      })
    } finally {
      setSubmitting(false)
    }
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
        <h1 className="service-header-title">Feedback</h1>
        <div className="service-header-spacer" />
      </header>

      <div className="service-content">
        {/* Navigation Tabs */}
        <div className="service-tabs-bar">
          <button
            type="button"
            className={`service-tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => {
              sound.playTick?.()
              setActiveTab('submit')
            }}
          >
            Submit Feedback
          </button>
          <button
            type="button"
            className={`service-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              sound.playTick?.()
              setActiveTab('history')
            }}
          >
            Feedback History ({tickets.length})
          </button>
        </div>

        {/* TAB 1: SUBMIT FEEDBACK */}
        {activeTab === 'submit' && (
          <div className="service-card">
            <h2 className="service-card-title">Send Us Your Feedback</h2>

            <form onSubmit={handleSubmit}>
              <div className="service-form-group">
                <label className="service-form-label">Feedback Category</label>
                <select
                  className="service-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Deposit/Withdrawal Issue">Deposit / Withdrawal Issue</option>
                  <option value="Game Suggestions">Game Suggestions & Feature Request</option>
                  <option value="Account/Security">Account & Security Question</option>
                  <option value="Bug Report">Technical Bug Report</option>
                  <option value="Other">Other Inquiry</option>
                </select>
              </div>

              <div className="service-form-group">
                <label className="service-form-label">Detailed Description</label>
                <textarea
                  className="service-textarea"
                  placeholder="Please describe your issue or suggestion in detail so our VIP team can assist you effectively..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="service-form-group">
                <label className="service-form-label">Contact Mobile / Telegram (Optional)</label>
                <input
                  type="text"
                  className="service-input"
                  placeholder="e.g. +91 9876543210 or @telegram_handle"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>

              {feedbackAlert && (
                <div className={`service-alert ${feedbackAlert.type}`} style={{ marginBottom: 14 }}>
                  {feedbackAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{feedbackAlert.text}</span>
                </div>
              )}

              <button type="submit" className="service-submit-btn" disabled={submitting || !message.trim()}>
                <Send size={16} />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback Ticket'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: FEEDBACK HISTORY */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingTickets ? (
              <div className="service-card" style={{ textAlign: 'center', color: '#64748b' }}>
                Loading your feedback tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="service-card" style={{ textAlign: 'center', color: '#64748b', padding: '30px 20px' }}>
                <MessageSquare size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: 14, color: '#0f172a' }}>No Feedback Tickets Yet</h3>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Your submitted suggestions and support requests will appear here with live resolution status.
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="service-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{t.category}</span>
                    <span className={`ticket-badge ${(t.status || 'pending').toLowerCase()}`}>
                      {t.status || 'Pending'}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0', fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    {t.message}
                  </p>

                  {t.admin_reply && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8,
                        padding: '8px 10px',
                        marginTop: 4,
                      }}
                    >
                      <strong style={{ fontSize: 11.5, color: '#16a34a', display: 'block', marginBottom: 2 }}>
                        VIP Support Reply:
                      </strong>
                      <span style={{ fontSize: 12.5, color: '#14532d' }}>{t.admin_reply}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                    <Clock size={12} />
                    <span>
                      {new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

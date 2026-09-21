import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Bell, Calendar, Sparkles } from 'lucide-react'
import { sound } from '../../utils/audio'
import { fetchAnnouncements } from '../../api/client'
import './service.css'

export default function AnnouncementPage({ onBack }) {
  const [category, setCategory] = useState('All')
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAnnouncements(category)
      setAnnouncements(data)
    } catch (err) {
      console.warn('[AnnouncementPage] Failed to fetch announcements:', err.message)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    loadData()
  }, [loadData])

  const categories = ['All', 'Important', 'Activity', 'System']

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
        <h1 className="service-header-title">Announcement</h1>
        <div className="service-header-spacer" />
      </header>

      <div className="service-content">
        {/* Category Tabs */}
        <div className="service-tabs-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`service-tab-btn ${category === cat ? 'active' : ''}`}
              onClick={() => {
                sound.playTick?.()
                setCategory(cat)
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Announcements Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div className="service-card" style={{ textAlign: 'center', color: '#64748b' }}>
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="service-card" style={{ textAlign: 'center', color: '#64748b', padding: '30px 20px' }}>
              <Bell size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 14, color: '#0f172a' }}>No Announcements</h3>
              <p style={{ margin: 0, fontSize: 12 }}>
                There are no active notices in this category right now. Check back soon!
              </p>
            </div>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="announcement-card">
                <div className="announcement-header">
                  <span className="announcement-tag">{item.category || 'Notice'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="announcement-date">
                    <Calendar size={12} />
                    <span>
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <h3 className="announcement-title">{item.title}</h3>
                <p className="announcement-body">{item.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

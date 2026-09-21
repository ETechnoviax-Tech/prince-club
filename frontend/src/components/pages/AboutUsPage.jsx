import React from 'react'
import { ChevronLeft, ShieldCheck, Award, Lock, Globe, Server, Check } from 'lucide-react'
import { sound } from '../../utils/audio'
import './service.css'

export default function AboutUsPage({ onBack }) {
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
        <h1 className="service-header-title">About us</h1>
        <div className="service-header-spacer" />
      </header>

      <div className="service-content">
        {/* Brand Banner Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            borderRadius: 16,
            padding: '24px 20px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f84545, #ee3535)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 24,
              fontWeight: 900,
              boxShadow: '0 4px 14px rgba(248, 69, 69, 0.4)',
            }}
          >
            69
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>
            69 CLUB
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8' }}>
            Premier Prediction, Color Trading & Gaming Platform
          </p>
        </div>

        {/* Platform Overview */}
        <div className="service-card">
          <h3 className="service-card-title">Platform Overview</h3>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
            69 Club is an international entertainment gaming destination offering synchronized real-time color lottery rounds, high-speed Aviator crash arenas, and provably fair digital casino games. We deliver seamless mobile-first experiences with instant automated UPI financial settlements.
          </p>
        </div>

        {/* Security & Guarantees */}
        <div className="service-card">
          <h3 className="service-card-title">Security & Fair Play</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>256-Bit SSL Financial Encryption</strong>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Every transaction is cryptographically secured</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>Certified RNG Fairness</strong>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Authoritative live draw seeds with provable parity</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248, 69, 69, 0.1)', color: '#f84545', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>High-Availability 99.9% Cloud Uptime</strong>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Redundant multi-region server infrastructure</div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Version */}
        <div className="service-card" style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          <div>69 Club Online Entertainment Gaming Limited</div>
          <div style={{ marginTop: 4 }}>All rights reserved • Version 2.4.0</div>
        </div>
      </div>
    </div>
  )
}

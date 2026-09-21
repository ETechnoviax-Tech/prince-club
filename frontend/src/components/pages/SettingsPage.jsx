import React, { useState, useEffect } from 'react'
import { ChevronLeft, User, Shield, Lock, Phone, CheckCircle2, AlertCircle, Volume2, VolumeX, Mail, ShieldCheck } from 'lucide-react'
import { sound } from '../../utils/audio'
import { updateProfileSettings, changeSecurityPassword, bindBackupEmail, fetchProfileSettings } from '../../api/client'
import './service.css'

export default function SettingsPage({
  onBack,
  currentUser,
  onUpdateUser,
}) {
  const [nickname, setNickname] = useState(currentUser?.nickname || currentUser?.username || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '/avatar.jpg')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Backup Email state
  const [backupEmail, setBackupEmail] = useState(currentUser?.email || '')
  const [isEmailBound, setIsEmailBound] = useState(Boolean(currentUser?.email))
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)

  // Fetch authoritative profile directly from database on mount (handles hard refresh)
  useEffect(() => {
    fetchProfileSettings()
      .then((res) => {
        if (res?.user) {
          if (res.user.email) {
            setBackupEmail(res.user.email)
            setIsEmailBound(true)
          }
          if (res.user.nickname) setNickname(res.user.nickname)
          if (res.user.phone) setPhone(res.user.phone)
          if (res.user.avatar_url) setAvatarUrl(res.user.avatar_url)
          if (onUpdateUser) onUpdateUser(res.user)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (currentUser?.email) {
      setBackupEmail(currentUser.email)
      setIsEmailBound(true)
    }
  }, [currentUser?.email])

  // UI state
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(sound.soundEnabled ?? true)

  const handleBindEmail = async (e) => {
    e.preventDefault()
    const targetEmail = backupEmail.trim().toLowerCase()
    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address (e.g. name@domain.com).' })
      return
    }

    setSavingEmail(true)
    setEmailMsg(null)
    sound.playBet?.()

    try {
      const res = await bindBackupEmail(targetEmail)
      sound.playWin?.()
      setEmailMsg({ type: 'success', text: res.message || 'Backup recovery email bound successfully!' })
      setIsEmailBound(true)
      if (onUpdateUser && res.user) {
        onUpdateUser(res.user)
      }
    } catch (err) {
      sound.playLose?.()
      setEmailMsg({ type: 'error', text: err.message || 'Failed to bind email address.' })
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)
    sound.playBet?.()

    try {
      const res = await updateProfileSettings({ nickname, phone, avatarUrl })
      sound.playWin?.()
      setProfileMsg({ type: 'success', text: res.message || 'Profile settings updated!' })
      if (onUpdateUser && res.user) {
        onUpdateUser(res.user)
      }
    } catch (err) {
      sound.playLose?.()
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter current password.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSavingPassword(true)
    setPasswordMsg(null)
    sound.playBet?.()

    try {
      const res = await changeSecurityPassword(currentPassword, newPassword)
      sound.playWin?.()
      setPasswordMsg({ type: 'success', text: res.message || 'Security password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      sound.playLose?.()
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    sound.soundEnabled = next
    if (next) sound.playTick?.()
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
        <h1 className="service-header-title">Settings</h1>
        <div className="service-header-spacer" />
      </header>

      <div className="service-content">
        {/* Profile Card */}
        <div className="service-card">
          <h2 className="service-card-title">Profile Information</h2>

          <form onSubmit={handleSaveProfile}>
            <div className="service-form-group">
              <label className="service-form-label">Username / Account UID</label>
              <input
                type="text"
                className="service-input"
                value={currentUser?.username || 'Guest'}
                disabled
                style={{ background: '#f1f5f9', color: '#64748b' }}
              />
            </div>

            <div className="service-form-group">
              <label className="service-form-label">Display Nickname</label>
              <input
                type="text"
                className="service-input"
                placeholder="Enter custom nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="service-form-group">
              <label className="service-form-label">Bound Phone Number</label>
              <input
                type="tel"
                className="service-input"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>

            {profileMsg && (
              <div className={`service-alert ${profileMsg.type}`} style={{ marginBottom: 12 }}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <button type="submit" className="service-submit-btn" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Backup Recovery Email Card */}
        <div className="service-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} color="#f84545" />
              <h2 className="service-card-title" style={{ margin: 0 }}>Backup Recovery Email</h2>
            </div>
            {isEmailBound && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                <ShieldCheck size={13} /> Bound & Active
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
            Bind a unique recovery email address. If you lose access to your phone number, you can use this verified email to receive OTP codes and safely reset your password.
          </p>

          <form onSubmit={handleBindEmail}>
            <div className="service-form-group">
              <label className="service-form-label">Recovery Email Address</label>
              <input
                type="email"
                className="service-input"
                placeholder="Enter your backup email (e.g. name@gmail.com)"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {emailMsg && (
              <div className={`service-alert ${emailMsg.type}`} style={{ marginBottom: 12 }}>
                {emailMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{emailMsg.text}</span>
              </div>
            )}

            <button type="submit" className="service-submit-btn" disabled={savingEmail}>
              {savingEmail ? 'Saving...' : (isEmailBound ? 'Update Backup Email' : 'Bind Backup Email')}
            </button>
          </form>
        </div>

        {/* Security Password Card */}
        <div className="service-card">
          <h2 className="service-card-title">Security Password</h2>

          <form onSubmit={handleChangePassword}>
            <div className="service-form-group">
              <label className="service-form-label">Current Password</label>
              <input
                type="password"
                className="service-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="service-form-group">
              <label className="service-form-label">New Password</label>
              <input
                type="password"
                className="service-input"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="service-form-group">
              <label className="service-form-label">Confirm New Password</label>
              <input
                type="password"
                className="service-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {passwordMsg && (
              <div className={`service-alert ${passwordMsg.type}`} style={{ marginBottom: 12 }}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <button type="submit" className="service-submit-btn" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Sound & Experience Card */}
        <div className="service-card">
          <h2 className="service-card-title">Preferences</h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {soundEnabled ? <Volume2 size={20} color="#f84545" /> : <VolumeX size={20} color="#94a3b8" />}
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Game Sound Effects</strong>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Audio countdowns, win chimes & taps</div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1.5px solid ' + (soundEnabled ? '#f84545' : '#cbd5e1'),
                background: soundEnabled ? 'rgba(248,69,69,0.1)' : '#f8fafc',
                color: soundEnabled ? '#f84545' : '#64748b',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

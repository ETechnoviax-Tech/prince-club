import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  RefreshCw,
  X,
  Activity,
  TrendingUp,
  Users,
  CheckCircle,
  WalletCards,
} from 'lucide-react'
import {
  verifyAdminAccess,
  fetchAdminMatrix,
  fetchAdminBetsLedger,
  fetchAdminUsers,
  adminUpdateUserBalance,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminDeleteUser,
} from '../../api/client.js'

import './admin.css'
import AdminGate from './AdminGate.jsx'
import AdminMatrixView from './AdminMatrixView.jsx'
import AdminBetsView from './AdminBetsView.jsx'
import AdminUsersView from './AdminUsersView.jsx'
import AdminBalanceModal from './AdminBalanceModal.jsx'
import AdminPaymentsView from './AdminPaymentsView.jsx'

export function AdminDashboard({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [adminKey, setAdminKey] = useState(
    () => localStorage.getItem('club69_admin_key') || ''
  )
  const [isVerified, setIsVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState(null)
  const [activeTab, setActiveTab] = useState('matrix') // 'matrix' | 'bets' | 'users' | 'payments'

  // Data States
  const [matrixData, setMatrixData] = useState(null)
  const [betsList, setBetsList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchUser, setSearchUser] = useState('')

  // Balance Adjustment Modal State
  const [selectedUserForBalance, setSelectedUserForBalance] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustAction, setAdjustAction] = useState('credit')
  const [adjustReason, setAdjustReason] = useState('Admin adjustment')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [paymentsRefreshToken, setPaymentsRefreshToken] = useState(0)

  // 1. Handshake verification
  const handleVerifyAdmin = useCallback(async () => {
    if (!adminKey.trim()) {
      setVerifyError('Please enter the Admin Master Secret Key')
      return
    }
    setVerifying(true)
    setVerifyError(null)
    try {
      const res = await verifyAdminAccess(adminKey.trim())
      if (res.success) {
        setIsVerified(true)
        localStorage.setItem('club69_admin_key', adminKey.trim())
      }
    } catch (err) {
      setVerifyError(err.message || 'Dual verification failed')
      setIsVerified(false)
    } finally {
      setVerifying(false)
    }
  }, [adminKey])

  // 2. Load Platform & Risk Matrix
  const loadMatrix = useCallback(async () => {
    if (!isVerified || !adminKey) return
    setLoading(true)
    try {
      const matrix = await fetchAdminMatrix(adminKey)
      setMatrixData(matrix)
    } catch (err) {
      console.error('[Admin Matrix Error]:', err)
    } finally {
      setLoading(false)
    }
  }, [isVerified, adminKey])

  // 3. Load Bets Ledger
  const loadBets = useCallback(async () => {
    if (!isVerified || !adminKey) return
    setLoading(true)
    try {
      const res = await fetchAdminBetsLedger(adminKey, { limit: 100 })
      setBetsList(res.bets || [])
    } catch (err) {
      console.error('[Admin Bets Error]:', err)
    } finally {
      setLoading(false)
    }
  }, [isVerified, adminKey])

  // 4. Load Users
  const loadUsers = useCallback(async () => {
    if (!isVerified || !adminKey) return
    setLoading(true)
    try {
      const users = await fetchAdminUsers(adminKey, searchUser)
      setUsersList(users || [])
    } catch (err) {
      console.error('[Admin Users Error]:', err)
    } finally {
      setLoading(false)
    }
  }, [isVerified, adminKey, searchUser])

  // Auto-verify on open if cached key exists
  useEffect(() => {
    if (isOpen && adminKey.trim() && !isVerified) {
      handleVerifyAdmin()
    }
  }, [isOpen, adminKey, isVerified, handleVerifyAdmin])

  // Load data according to active tab
  useEffect(() => {
    if (!isOpen || !isVerified) return
    if (activeTab === 'matrix') loadMatrix()
    else if (activeTab === 'bets') loadBets()
    else if (activeTab === 'users') loadUsers()
  }, [isOpen, isVerified, activeTab, loadMatrix, loadBets, loadUsers])

  // Refresh handler
  const handleRefreshCurrent = () => {
    if (activeTab === 'matrix') loadMatrix()
    else if (activeTab === 'bets') loadBets()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'payments') setPaymentsRefreshToken((value) => value + 1)
  }

  // Confirm balance adjustment
  const handleConfirmBalance = async () => {
    if (!selectedUserForBalance || !adjustAmount || Number(adjustAmount) <= 0) return
    setAdjustLoading(true)
    try {
      await adminUpdateUserBalance(
        adminKey,
        selectedUserForBalance.id,
        adjustAmount,
        adjustAction,
        adjustReason
      )
      setSelectedUserForBalance(null)
      setAdjustAmount('')
      loadUsers()
      if (onUserUpdated) onUserUpdated()
    } catch (err) {
      alert(`Balance adjustment failed: ${err.message}`)
    } finally {
      setAdjustLoading(false)
    }
  }

  // Toggle user role (user <-> admin)
  const handleToggleRole = async (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    const confirmMsg = `Are you sure you want to change role of ${user.username} to ${nextRole.toUpperCase()}?`
    if (!window.confirm(confirmMsg)) return

    try {
      await adminUpdateUserRole(adminKey, user.id, nextRole)
      loadUsers()
      if (onUserUpdated) onUserUpdated()
    } catch (err) {
      alert(`Failed to update role: ${err.message}`)
    }
  }

  // Toggle user status (active <-> suspended)
  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended'
    try {
      await adminUpdateUserStatus(adminKey, user.id, nextStatus)
      loadUsers()
    } catch (err) {
      alert(`Failed to update user status: ${err.message}`)
    }
  }

  // Delete user
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanently delete account for ${user.username}? This cannot be undone.`)) {
      return
    }
    try {
      await adminDeleteUser(adminKey, user.id)
      loadUsers()
      if (onUserUpdated) onUserUpdated()
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="admin-modal-overlay admin-page-shell">
      <div className="admin-dialog-window admin-page-window">
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-header-title-box">
            <div className="admin-shield-badge">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>Admin Management Console</h3>
              <p>Dual-Verified Security • Live Risk & Users</p>
            </div>
          </div>

          <div className="admin-header-actions">
            {isVerified && (
              <button
                type="button"
                className={`admin-btn-icon ${loading ? 'spinning' : ''}`}
                onClick={handleRefreshCurrent}
                title="Refresh current view"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <button
              type="button"
              className="admin-btn-close"
              onClick={onClose}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="admin-modal-body-scroll admin-page-body">
          {!isVerified ? (
            /* Security Gate View */
            <AdminGate
              adminKey={adminKey}
              setAdminKey={setAdminKey}
              onVerify={handleVerifyAdmin}
              verifying={verifying}
              verifyError={verifyError}
              currentUser={currentUser}
            />
          ) : (
            /* Authenticated Sub-Pages */
            <>
              {/* Dual-Verified Status Bar */}
              <div className="admin-status-bar">
                <span className="status-chip success">
                  <CheckCircle size={13} />
                  <span>DB Role: <strong>ADMIN</strong></span>
                </span>
                <span className="status-chip success">
                  <CheckCircle size={13} />
                  <span>Backend Key: <strong>VERIFIED</strong></span>
                </span>
                <span className="status-chip" style={{ marginLeft: 'auto' }}>
                  Operator: <strong>{currentUser?.username || 'Admin'}</strong>
                </span>
              </div>

              {/* Sub-Pages Navigation Tabs */}
              <div className="admin-nav-tabs-bar">
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
                  onClick={() => setActiveTab('matrix')}
                >
                  <Activity size={15} />
                  <span>Risk Matrix</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'bets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bets')}
                >
                  <TrendingUp size={15} />
                  <span>Bets Ledger</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users size={15} />
                  <span>Users (CRUD)</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('payments')}
                >
                  <WalletCards size={15} />
                  <span>Payments</span>
                </button>
              </div>

              {/* Modular Sub-Pages Render */}
              {activeTab === 'matrix' && (
                <AdminMatrixView
                  matrixData={matrixData}
                  loading={loading}
                  onRefresh={loadMatrix}
                />
              )}

              {activeTab === 'bets' && (
                <AdminBetsView
                  betsList={betsList}
                  loading={loading}
                />
              )}

              {activeTab === 'users' && (
                <AdminUsersView
                  usersList={usersList}
                  searchUser={searchUser}
                  setSearchUser={setSearchUser}
                  onOpenBalanceModal={(u) => {
                    setSelectedUserForBalance(u)
                    setAdjustAmount('')
                    setAdjustAction('credit')
                    setAdjustReason('Admin balance update')
                  }}
                  onToggleRole={handleToggleRole}
                  onToggleStatus={handleToggleStatus}
                  onDeleteUser={handleDeleteUser}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'payments' && <AdminPaymentsView adminKey={adminKey} refreshToken={paymentsRefreshToken} />}
            </>
          )}
        </div>

        {/* Balance Adjustment Sub-Modal */}
        {selectedUserForBalance && (
          <AdminBalanceModal
            user={selectedUserForBalance}
            onClose={() => setSelectedUserForBalance(null)}
            adjustAmount={adjustAmount}
            setAdjustAmount={setAdjustAmount}
            adjustAction={adjustAction}
            setAdjustAction={setAdjustAction}
            adjustReason={adjustReason}
            setAdjustReason={setAdjustReason}
            adjustLoading={adjustLoading}
            onConfirm={handleConfirmBalance}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

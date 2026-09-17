import React from 'react'
import {
  Users,
  Search,
  Coins,
  Shield,
  UserCheck,
  Ban,
  Trash2,
} from 'lucide-react'

export function AdminUsersView({
  usersList,
  searchUser,
  setSearchUser,
  onOpenBalanceModal,
  onToggleRole,
  onToggleStatus,
  onDeleteUser,
  currentUser,
}) {
  return (
    <div className="admin-subpage-container">
      {/* Search Input */}
      <div className="admin-search-box">
        <Search size={16} />
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search by phone, email, username, or UID..."
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
          Registered Accounts ({usersList.length})
        </span>
      </div>

      {/* Users Cards List (Mobile-Optimized) */}
      {usersList.length === 0 ? (
        <div className="admin-empty-box">
          <Users size={32} />
          <p>No user accounts matched your search.</p>
        </div>
      ) : (
        <div className="admin-users-cards-list">
          {usersList.map((u) => {
            const isSelf = u.id === currentUser?.id || u.username === currentUser?.username
            const isAdmin = u.role === 'admin' || u.isAdmin === true
            const isSuspended = u.status === 'suspended'
            const initial = String(u.username || 'U').charAt(0).toUpperCase()

            return (
              <div key={u.id} className="admin-user-card-item">
                <div className="user-card-top-row">
                  <div className="user-avatar-meta">
                    <div className={`user-avatar-circle ${isAdmin ? 'is-admin' : ''}`}>
                      {initial}
                    </div>
                    <div className="user-text-info">
                      <span className="user-name-title">
                        {u.username} {isSelf && <span style={{ color: '#ef4444', fontSize: '10px' }}>(You)</span>}
                      </span>
                      <span className="user-email-sub">{u.email || 'No email attached'}</span>
                    </div>
                  </div>

                  <div className="user-pill-badges">
                    <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                      {isAdmin ? 'ADMIN' : 'USER'}
                    </span>
                    <span className={`status-badge ${isSuspended ? 'suspended' : 'active'}`}>
                      {isSuspended ? 'FROZEN' : 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Balance Row */}
                <div className="user-balance-strip">
                  <div className="balance-text-col">
                    <span>Wallet Balance</span>
                    <strong>₹{Number(u.balance || 0).toFixed(2)}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn-quick-adjust"
                    onClick={() => onOpenBalanceModal(u)}
                  >
                    <Coins size={14} style={{ color: '#f59e0b' }} />
                    <span>Adjust (±)</span>
                  </button>
                </div>

                {/* Action Buttons Row */}
                <div className="user-actions-row">
                  <button
                    type="button"
                    className="btn-user-action"
                    onClick={() => onToggleRole(u)}
                    title={isAdmin ? 'Demote to regular user' : 'Promote to administrator'}
                  >
                    <Shield size={13} style={{ color: isAdmin ? '#ef4444' : '#64748b' }} />
                    <span>{isAdmin ? 'Make User' : 'Make Admin'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-user-action"
                    onClick={() => onToggleStatus(u)}
                    title={isSuspended ? 'Unfreeze account' : 'Suspend account'}
                  >
                    {isSuspended ? (
                      <>
                        <UserCheck size={13} style={{ color: '#16a34a' }} />
                        <span>Unfreeze</span>
                      </>
                    ) : (
                      <>
                        <Ban size={13} style={{ color: '#eab308' }} />
                        <span>Freeze</span>
                      </>
                    )}
                  </button>

                  {!isSelf && (
                    <button
                      type="button"
                      className="btn-user-action danger"
                      onClick={() => onDeleteUser(u)}
                      title="Permanently remove account"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminUsersView

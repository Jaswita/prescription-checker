'use client';

// ============================================
// ADMIN DASHBOARD
// User management and security logs
// LAB MARK: Admin Functions, Audit Trail
// ============================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, logsRes, analyticsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/logs'),
        api.get('/admin/analytics')
      ])
      setUsers(usersRes.data.users)
      setLogs(logsRes.data.logs)
      setAnalytics(analyticsRes.data)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post('/admin/users', newUser)
      setSuccess('User created successfully!')
      setShowCreateForm(false)
      setNewUser({ name: '', email: '', password: '', role: 'patient' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user')
    }
  }

  const handleToggleLock = async (userId, currentLockStatus) => {
    try {
      await api.post('/admin/lock-user', { userId, lock: !currentLockStatus })
      setSuccess(`User ${!currentLockStatus ? 'locked' : 'unlocked'} successfully`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.post('/admin/role', { userId, role: newRole })
      setSuccess('User role updated successfully')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role')
    }
  }

  const getRoleBadge = (role) => {
    const colors = {
      admin: { bg: 'var(--error-light)', color: 'var(--error)' },
      doctor: { bg: 'var(--primary-yellow-light)', color: 'var(--primary-yellow-dark)' },
      pharmacy: { bg: 'var(--primary-pink-light)', color: 'var(--primary-pink-dark)' },
      patient: { bg: 'var(--info-light)', color: 'var(--info)' }
    }
    const style = colors[role] || { bg: 'var(--gray-100)', color: 'var(--gray-600)' }
    return (
      <span className="badge" style={{ background: style.bg, color: style.color }}>
        {role}
      </span>
    )
  }

  const getStatValue = (statsArray, key) => {
    const stat = statsArray?.find(s => s._id === key)
    return stat?.count || 0
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <a href="/admin" className="nav-logo">
            <div className="nav-logo-icon">Rx</div>
            <span>SecurePrescription</span>
          </a>
          <div className="nav-user">
            <div className="nav-user-info">
              <div className="nav-user-name">{user?.name}</div>
              <div className="nav-user-role">{user?.role}</div>
            </div>
            <button className="btn btn-outline-pink btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'overview' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button 
            className={`btn ${activeTab === 'logs' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('logs')}
          >
            Security Logs
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
              <>
                <div className="dashboard-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-yellow">
                      <span>U</span>
                    </div>
                    <div className="stat-content">
                      <h3>{users.length}</h3>
                      <p>Total Users</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-pink">
                      <span>D</span>
                    </div>
                    <div className="stat-content">
                      <h3>{getStatValue(analytics.users, 'doctor')}</h3>
                      <p>Doctors</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                      <span>P</span>
                    </div>
                    <div className="stat-content">
                      <h3>{getStatValue(analytics.users, 'pharmacy')}</h3>
                      <p>Pharmacies</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                      <span>Rx</span>
                    </div>
                    <div className="stat-content">
                      <h3>
                        {analytics.prescriptions?.reduce((acc, p) => acc + p.count, 0) || 0}
                      </h3>
                      <p>Total Prescriptions</p>
                    </div>
                  </div>
                </div>

                {/* Prescription Stats */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div className="card-header">
                    <h2 className="card-title">Prescription Statistics</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <h3 style={{ color: 'var(--success)' }}>{getStatValue(analytics.prescriptions, 'ACTIVE')}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Active</p>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <h3 style={{ color: 'var(--gray-700)' }}>{getStatValue(analytics.prescriptions, 'USED')}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Used</p>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--error-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <h3 style={{ color: 'var(--error)' }}>{getStatValue(analytics.prescriptions, 'EXPIRED')}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Expired</p>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <h3 style={{ color: 'var(--warning)' }}>
                        {analytics.controlledSubstances?.reduce((acc, p) => acc + p.count, 0) || 0}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Controlled</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Recent Activity</h2>
                  </div>
                  {analytics.recentActivity?.length === 0 ? (
                    <div className="empty-state">
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                      {analytics.recentActivity?.slice(0, 5).map((item, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.813rem' }}>
                              {item.prescriptionId}
                            </span>
                            <span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--gray-500)' }}>
                              {item.drugName}
                            </span>
                          </div>
                          <span className={`badge badge-${item.status?.toLowerCase()}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">User Management</h2>
                  <button 
                    className="btn btn-pink btn-sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    {showCreateForm ? 'Cancel' : 'Create User'}
                  </button>
                </div>

                {/* Create User Form */}
                {showCreateForm && (
                  <div style={{ 
                    marginBottom: 'var(--spacing-lg)', 
                    padding: 'var(--spacing-lg)', 
                    background: 'var(--gray-50)', 
                    borderRadius: 'var(--radius-md)' 
                  }}>
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create New User</h3>
                    <form onSubmit={handleCreateUser}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Email</label>
                          <input
                            type="email"
                            className="form-input"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Password</label>
                          <input
                            type="password"
                            className="form-input"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Role</label>
                          <select
                            className="form-select"
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                          >
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-yellow" style={{ marginTop: 'var(--spacing-md)' }}>
                        Create User
                      </button>
                    </form>
                  </div>
                )}

                {/* Users Table */}
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Failed Attempts</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              className="form-select"
                              style={{ padding: '4px 8px', fontSize: '0.813rem' }}
                              disabled={u._id === user.id}
                            >
                              <option value="patient">Patient</option>
                              <option value="doctor">Doctor</option>
                              <option value="pharmacy">Pharmacy</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            {u.isLocked ? (
                              <span className="badge badge-invalid">Locked</span>
                            ) : (
                              <span className="badge badge-valid">Active</span>
                            )}
                          </td>
                          <td>{u.failedLoginAttempts || 0}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${u.isLocked ? 'btn-outline-yellow' : 'btn-outline-pink'}`}
                              onClick={() => handleToggleLock(u._id, u.isLocked)}
                              disabled={u._id === user.id}
                            >
                              {u.isLocked ? 'Unlock' : 'Lock'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Security Logs Tab */}
            {activeTab === 'logs' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Security Logs</h2>
                  <button className="btn btn-outline-yellow btn-sm" onClick={fetchData}>
                    Refresh
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">L</div>
                    <p>No security logs yet</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>Prescription ID</th>
                          <th>Performed By</th>
                          <th>Details</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, idx) => (
                          <tr key={idx}>
                            <td style={{ fontSize: '0.813rem' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td>
                              <span className="badge" style={{ 
                                background: log.action === 'CREATED' ? 'var(--success-light)' : 
                                           log.action === 'VERIFIED' ? 'var(--info-light)' : 
                                           log.action === 'DISPENSED' ? 'var(--primary-pink-light)' : 
                                           'var(--gray-100)',
                                color: log.action === 'CREATED' ? 'var(--success)' : 
                                       log.action === 'VERIFIED' ? 'var(--info)' : 
                                       log.action === 'DISPENSED' ? 'var(--primary-pink-dark)' : 
                                       'var(--gray-600)'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {log.prescriptionId}
                            </td>
                            <td>{log.performedByRole}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.details}
                            </td>
                            <td>
                              {log.isControlledSubstance && (
                                <span className="badge badge-pending">Controlled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard

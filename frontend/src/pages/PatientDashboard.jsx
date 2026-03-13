'use client';

// ============================================
// PATIENT DASHBOARD
// View and verify prescriptions
// LAB MARK: Patient View, QR Display
// ============================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PatientDashboard = () => {
  const { user, logout } = useAuth()
  
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPrescription, setSelectedPrescription] = useState(null)

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/prescriptions/my')
      setPrescriptions(response.data.prescriptions)
    } catch (err) {
      setError('Failed to load prescriptions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status, expiryDate) => {
    const isExpired = new Date(expiryDate) < new Date()
    if (isExpired && status === 'ACTIVE') {
      return { class: 'badge-expired', text: 'EXPIRED' }
    }
    const badges = {
      ACTIVE: { class: 'badge-active', text: 'ACTIVE' },
      USED: { class: 'badge-used', text: 'USED' },
      EXPIRED: { class: 'badge-expired', text: 'EXPIRED' }
    }
    return badges[status] || { class: 'badge-pending', text: status }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const daysUntilExpiry = (expiryDate) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <a href="/patient" className="nav-logo">
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
        {/* Welcome Card */}
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)', background: 'linear-gradient(135deg, var(--primary-yellow-light), var(--primary-pink-light))' }}>
          <h2 style={{ color: 'var(--gray-900)', marginBottom: 'var(--spacing-sm)' }}>
            Welcome, {user?.name}
          </h2>
          <p style={{ color: 'var(--gray-600)' }}>
            View and manage your prescriptions securely. Show the QR code at any pharmacy for verification.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-yellow">
              <span>Rx</span>
            </div>
            <div className="stat-content">
              <h3>{prescriptions.length}</h3>
              <p>Total Prescriptions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-pink">
              <span>A</span>
            </div>
            <div className="stat-content">
              <h3>{prescriptions.filter(p => p.status === 'ACTIVE').length}</h3>
              <p>Active Prescriptions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
              <span>U</span>
            </div>
            <div className="stat-content">
              <h3>{prescriptions.filter(p => p.status === 'USED').length}</h3>
              <p>Used Prescriptions</p>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Prescriptions List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Prescriptions</h2>
            <button className="btn btn-outline-yellow btn-sm" onClick={fetchPrescriptions}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">Rx</div>
              <p>No prescriptions yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                Your prescriptions will appear here once a doctor creates one for you.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {prescriptions.map(rx => {
                const status = getStatusBadge(rx.status, rx.expiryDate)
                const days = daysUntilExpiry(rx.expiryDate)
                
                return (
                  <div 
                    key={rx._id}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: selectedPrescription?._id === rx._id ? 'var(--gray-50)' : 'transparent'
                    }}
                    onClick={() => setSelectedPrescription(selectedPrescription?._id === rx._id ? null : rx)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 'var(--spacing-xs)' }}>
                          {rx.drugName}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                          {rx.dosage}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 'var(--spacing-xs)' }}>
                          Prescribed by Dr. {rx.doctorId?.name || 'Unknown'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${status.class}`}>{status.text}</span>
                        {rx.status === 'ACTIVE' && days > 0 && days <= 7 && (
                          <p style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--warning)', 
                            marginTop: 'var(--spacing-xs)' 
                          }}>
                            Expires in {days} day{days > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedPrescription?._id === rx._id && (
                      <div style={{ 
                        marginTop: 'var(--spacing-md)', 
                        paddingTop: 'var(--spacing-md)', 
                        borderTop: '1px solid var(--gray-200)' 
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Prescription ID</p>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.813rem' }}>{rx.prescriptionId}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Created On</p>
                            <p>{formatDate(rx.createdAt)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Valid Until</p>
                            <p>{formatDate(rx.expiryDate)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Type</p>
                            <p>
                              {rx.isControlledSubstance ? (
                                <span className="badge badge-pending">Controlled Substance</span>
                              ) : (
                                <span>Standard Prescription</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {rx.qrCode && rx.status === 'ACTIVE' && (
                          <div style={{ 
                            marginTop: 'var(--spacing-lg)', 
                            textAlign: 'center',
                            padding: 'var(--spacing-md)',
                            background: 'var(--white)',
                            borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--gray-300)'
                          }}>
                            <p style={{ 
                              fontSize: '0.875rem', 
                              color: 'var(--gray-600)', 
                              marginBottom: 'var(--spacing-md)' 
                            }}>
                              Show this QR code at the pharmacy
                            </p>
                            <img 
                              src={rx.qrCode || "/placeholder.svg"} 
                              alt="Prescription QR Code"
                              style={{ maxWidth: '200px', margin: '0 auto' }}
                            />
                            <p style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--gray-400)', 
                              marginTop: 'var(--spacing-md)' 
                            }}>
                              The pharmacist will scan this to verify your prescription
                            </p>
                          </div>
                        )}

                        {rx.status === 'USED' && (
                          <div style={{ 
                            marginTop: 'var(--spacing-md)', 
                            padding: 'var(--spacing-md)',
                            background: 'var(--gray-100)',
                            borderRadius: 'var(--radius-md)'
                          }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              <strong>Dispensed:</strong> {rx.dispensedAt ? formatDate(rx.dispensedAt) : 'Date unknown'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--gray-900)' }}>
            Your Prescription Security
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--primary-yellow-light)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <p style={{ fontWeight: 600, color: 'var(--primary-yellow-dark)' }}>AES-256 Encrypted</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                Your prescription data is encrypted with military-grade encryption
              </p>
            </div>
            <div style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--primary-pink-light)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <p style={{ fontWeight: 600, color: 'var(--primary-pink-dark)' }}>Digitally Signed</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                Each prescription is signed by your doctor's unique digital key
              </p>
            </div>
            <div style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--success-light)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <p style={{ fontWeight: 600, color: 'var(--success)' }}>Tamper-Proof</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                Any modification attempts are detected and blocked
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PatientDashboard

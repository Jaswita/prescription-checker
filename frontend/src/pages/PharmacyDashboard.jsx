'use client';

// ============================================
// PHARMACY DASHBOARD
// Verify and dispense prescriptions
// LAB MARK: QR Scanning, Signature Verification
// ============================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import QRScanner from '../components/QRScanner'

const PharmacyDashboard = () => {
  const { user, logout } = useAuth()
  
  const [dispensedPrescriptions, setDispensedPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('verify')
  
  // Verification result
  const [verificationResult, setVerificationResult] = useState(null)
  const [verifiedPrescription, setVerifiedPrescription] = useState(null)

  useEffect(() => {
    fetchDispensedPrescriptions()
  }, [])

  const fetchDispensedPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions/my')
      setDispensedPrescriptions(response.data.prescriptions)
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err)
    }
  }

  const handleScan = async (prescriptionId) => {
    setError('')
    setSuccess('')
    setLoading(true)
    setVerificationResult(null)
    setVerifiedPrescription(null)

    try {
      const response = await api.post('/prescriptions/verify', { prescriptionId })
      setVerificationResult({
        status: 'VALID',
        ...response.data.verification
      })
      setVerifiedPrescription(response.data.prescription)
      setSuccess('Prescription verified successfully!')
    } catch (err) {
      const errorData = err.response?.data
      setVerificationResult({
        status: errorData?.verificationStatus || 'INVALID',
        error: errorData?.error || 'Verification failed'
      })
      setError(errorData?.error || 'Failed to verify prescription')
    } finally {
      setLoading(false)
    }
  }

  const handleDispense = async () => {
    if (!verifiedPrescription) return
    
    setLoading(true)
    setError('')

    try {
      await api.post('/prescriptions/dispense', { 
        prescriptionId: verifiedPrescription.prescriptionId 
      })
      setSuccess('Medicine dispensed successfully!')
      setVerificationResult(null)
      setVerifiedPrescription(null)
      fetchDispensedPrescriptions()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispense prescription')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      VALID: 'badge-valid',
      INVALID: 'badge-invalid',
      TAMPERED: 'badge-invalid',
      EXPIRED: 'badge-expired',
      ALREADY_USED: 'badge-used',
      NOT_FOUND: 'badge-invalid'
    }
    return `badge ${badges[status] || 'badge-pending'}`
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <a href="/pharmacy" className="nav-logo">
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
        {/* Stats Cards */}
        <div className="dashboard-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-yellow">
              <span>D</span>
            </div>
            <div className="stat-content">
              <h3>{dispensedPrescriptions.length}</h3>
              <p>Prescriptions Dispensed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-pink">
              <span>C</span>
            </div>
            <div className="stat-content">
              <h3>{dispensedPrescriptions.filter(p => p.isControlledSubstance).length}</h3>
              <p>Controlled Substances</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
          <button 
            className={`btn ${activeTab === 'verify' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('verify')}
          >
            Verify & Dispense
          </button>
          <button 
            className={`btn ${activeTab === 'history' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('history')}
          >
            Dispensing History
          </button>
        </div>

        {/* Verify & Dispense */}
        {activeTab === 'verify' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Verify Prescription</h2>
              <span className="badge badge-valid">Signature Verification</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: verificationResult ? '1fr 1fr' : '1fr', gap: 'var(--spacing-xl)' }}>
              {/* QR Scanner */}
              <div>
                <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--gray-600)' }}>
                  Scan the prescription QR code or enter the prescription ID manually.
                </p>
                
                <QRScanner 
                  onScan={handleScan}
                  onError={(err) => setError(err)}
                />

                {loading && (
                  <div className="loading-container" style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="spinner"></div>
                    <p>Verifying prescription...</p>
                  </div>
                )}
              </div>

              {/* Verification Result */}
              {verificationResult && (
                <div>
                  <div className={`verification-status ${verificationResult.status === 'VALID' ? 'verification-valid' : 'verification-invalid'}`}>
                    <span className="verification-icon">
                      {verificationResult.status === 'VALID' ? 'V' : 'X'}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600 }}>
                        {verificationResult.status === 'VALID' ? 'Prescription Valid' : 'Verification Failed'}
                      </p>
                      <p style={{ fontSize: '0.875rem' }}>
                        {verificationResult.status === 'VALID' 
                          ? 'Digital signature and hash verified successfully'
                          : verificationResult.error
                        }
                      </p>
                    </div>
                  </div>

                  {verifiedPrescription && (
                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--gray-900)' }}>
                        Prescription Details
                      </h4>
                      
                      <div style={{ 
                        background: 'var(--gray-50)', 
                        padding: 'var(--spacing-md)', 
                        borderRadius: 'var(--radius-md)' 
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Prescription ID</p>
                            <p style={{ fontFamily: 'monospace' }}>{verifiedPrescription.prescriptionId}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Status</p>
                            <span className={getStatusBadge(verifiedPrescription.status)}>
                              {verifiedPrescription.status}
                            </span>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Doctor</p>
                            <p>{verifiedPrescription.doctor}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Patient</p>
                            <p>{verifiedPrescription.patient}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Drug Name</p>
                            <p style={{ fontWeight: 600 }}>{verifiedPrescription.drugName}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Dosage</p>
                            <p>{verifiedPrescription.dosage}</p>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Instructions</p>
                            <p>{verifiedPrescription.instructions || 'No additional instructions'}</p>
                          </div>
                        </div>

                        {verifiedPrescription.isControlledSubstance && (
                          <div style={{ 
                            marginTop: 'var(--spacing-md)', 
                            padding: 'var(--spacing-sm)', 
                            background: 'var(--warning-light)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--warning)'
                          }}>
                            <strong>Controlled Substance</strong> - This dispensing will be logged for regulatory compliance.
                          </div>
                        )}
                      </div>

                      {verifiedPrescription.status === 'ACTIVE' && (
                        <button 
                          className="btn btn-pink btn-lg" 
                          style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                          onClick={handleDispense}
                          disabled={loading}
                        >
                          {loading ? <span className="spinner"></span> : 'Dispense Medicine'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Verification Details */}
                  {verificationResult.status === 'VALID' && (
                    <div style={{ 
                      marginTop: 'var(--spacing-lg)', 
                      padding: 'var(--spacing-md)', 
                      background: 'var(--success-light)', 
                      borderRadius: 'var(--radius-md)' 
                    }}>
                      <h4 style={{ color: 'var(--success)', marginBottom: 'var(--spacing-sm)' }}>
                        Security Verification
                      </h4>
                      <ul style={{ fontSize: '0.875rem', color: 'var(--gray-700)', listStyle: 'none' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                          <span style={{ color: 'var(--success)' }}>V</span>
                          Hash Match: {verificationResult.hashMatch ? 'Passed' : 'Failed'}
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                          <span style={{ color: 'var(--success)' }}>V</span>
                          Signature Valid: {verificationResult.signatureValid ? 'Passed' : 'Failed'}
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <span style={{ color: 'var(--success)' }}>V</span>
                          Integrity Verified: {verificationResult.integrityVerified ? 'Passed' : 'Failed'}
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dispensing History */}
        {activeTab === 'history' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Dispensing History</h2>
              <button className="btn btn-outline-yellow btn-sm" onClick={fetchDispensedPrescriptions}>
                Refresh
              </button>
            </div>

            {dispensedPrescriptions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">D</div>
                <p>No prescriptions dispensed yet</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Prescription ID</th>
                      <th>Patient</th>
                      <th>Drug</th>
                      <th>Dosage</th>
                      <th>Type</th>
                      <th>Dispensed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispensedPrescriptions.map(rx => (
                      <tr key={rx._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.813rem' }}>
                          {rx.prescriptionId}
                        </td>
                        <td>{rx.patientId?.name || 'Unknown'}</td>
                        <td>{rx.drugName}</td>
                        <td>{rx.dosage}</td>
                        <td>
                          {rx.isControlledSubstance ? (
                            <span className="badge badge-pending">Controlled</span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>Standard</span>
                          )}
                        </td>
                        <td>{rx.dispensedAt ? new Date(rx.dispensedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default PharmacyDashboard

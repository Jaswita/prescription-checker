'use client';

// ============================================
// DOCTOR DASHBOARD
// Create and sign prescriptions
// LAB MARK: Digital Signature, QR Generation
// ============================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const DoctorDashboard = () => {
  const { user, logout } = useAuth()
  
  const [patients, setPatients] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('create')
  
  // Prescription form
  const [form, setForm] = useState({
    patientId: '',
    drugName: '',
    dosage: '',
    instructions: '',
    isControlledSubstance: false,
    expiryDays: 30
  })
  
  // Created prescription with QR
  const [createdPrescription, setCreatedPrescription] = useState(null)

  useEffect(() => {
    fetchPatients()
    fetchPrescriptions()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await api.get('/prescriptions/patients')
      setPatients(response.data.patients)
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    }
  }

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions/my')
      setPrescriptions(response.data.prescriptions)
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    setCreatedPrescription(null)

    try {
      const response = await api.post('/prescriptions/create', form)
      setSuccess('Prescription created and digitally signed successfully!')
      setCreatedPrescription(response.data.prescription)
      setForm({
        patientId: '',
        drugName: '',
        dosage: '',
        instructions: '',
        isControlledSubstance: false,
        expiryDays: 30
      })
      fetchPrescriptions()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create prescription')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: 'badge-active',
      USED: 'badge-used',
      EXPIRED: 'badge-expired'
    }
    return `badge ${badges[status] || 'badge-pending'}`
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <a href="/doctor" className="nav-logo">
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
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <span>C</span>
            </div>
            <div className="stat-content">
              <h3>{prescriptions.filter(p => p.isControlledSubstance).length}</h3>
              <p>Controlled Substances</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
          <button 
            className={`btn ${activeTab === 'create' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('create')}
          >
            Create Prescription
          </button>
          <button 
            className={`btn ${activeTab === 'list' ? 'btn-yellow' : 'btn-ghost'}`}
            onClick={() => setActiveTab('list')}
          >
            My Prescriptions
          </button>
        </div>

        {/* Create Prescription Form */}
        {activeTab === 'create' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Create New Prescription</h2>
              <span className="badge badge-valid">Digitally Signed</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: createdPrescription ? '1fr 1fr' : '1fr', gap: 'var(--spacing-xl)' }}>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Select Patient</label>
                  <select
                    className="form-select"
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    required
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map(patient => (
                      <option key={patient._id} value={patient._id}>
                        {patient.name} ({patient.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Drug Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Amoxicillin"
                    value={form.drugName}
                    onChange={(e) => setForm({ ...form, drugName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dosage</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., 500mg 3x daily"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Instructions</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Additional instructions for the patient..."
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Validity (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={365}
                    value={form.expiryDays}
                    onChange={(e) => setForm({ ...form, expiryDays: parseInt(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={form.isControlledSubstance}
                      onChange={(e) => setForm({ ...form, isControlledSubstance: e.target.checked })}
                    />
                    <span>Controlled Substance</span>
                  </label>
                  {form.isControlledSubstance && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 'var(--spacing-xs)' }}>
                      This prescription will be tracked and logged for regulatory compliance.
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-pink btn-lg" 
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? <span className="spinner"></span> : 'Sign & Create Prescription'}
                </button>
              </form>

              {/* QR Code Display */}
              {createdPrescription && (
                <div className="qr-container">
                  <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--gray-900)' }}>
                    Prescription Created!
                  </h3>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                    ID: {createdPrescription.prescriptionId}
                  </p>
                  {createdPrescription.qrCode && (
                    <img 
                      src={createdPrescription.qrCode || "/placeholder.svg"} 
                      alt="Prescription QR Code"
                      className="qr-code"
                    />
                  )}
                  <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <span className={createdPrescription.isControlledSubstance ? 'badge badge-pending' : 'badge badge-active'}>
                      {createdPrescription.isControlledSubstance ? 'Controlled' : 'Standard'}
                    </span>
                  </div>
                  <p style={{ marginTop: 'var(--spacing-md)', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Scan this QR code at pharmacy to verify
                  </p>
                </div>
              )}
            </div>

            {/* Security Info */}
            <div style={{ 
              marginTop: 'var(--spacing-xl)', 
              padding: 'var(--spacing-md)', 
              background: 'var(--primary-yellow-light)', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: 'var(--primary-yellow)', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                L
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Digital Signature Applied</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                  Your RSA private key signs a SHA-256 hash of the prescription. AES-256 encryption protects patient data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Prescriptions List */}
        {activeTab === 'list' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Issued Prescriptions</h2>
              <button className="btn btn-outline-yellow btn-sm" onClick={fetchPrescriptions}>
                Refresh
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">Rx</div>
                <p>No prescriptions issued yet</p>
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
                      <th>Status</th>
                      <th>Type</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(rx => (
                      <tr key={rx._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.813rem' }}>
                          {rx.prescriptionId}
                        </td>
                        <td>{rx.patientId?.name || 'Unknown'}</td>
                        <td>{rx.drugName}</td>
                        <td>{rx.dosage}</td>
                        <td>
                          <span className={getStatusBadge(rx.status)}>{rx.status}</span>
                        </td>
                        <td>
                          {rx.isControlledSubstance ? (
                            <span className="badge badge-pending">Controlled</span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>Standard</span>
                          )}
                        </td>
                        <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
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

export default DoctorDashboard

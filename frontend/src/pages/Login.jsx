'use client';

// ============================================
// LOGIN PAGE
// Single Factor + Multi-Factor Authentication
// LAB MARK: Authentication UI
// ============================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [step, setStep] = useState('login') // login | otp | register
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Register form
  const [name, setName] = useState('')
  const [role, setRole] = useState('patient')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // OTP
  const [userId, setUserId] = useState('')
  const [otp, setOtp] = useState('')
  
  // Password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: '', class: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    
    if (score <= 1) return { level: 1, text: 'Weak', class: 'strength-weak' }
    if (score <= 2) return { level: 2, text: 'Medium', class: 'strength-medium' }
    return { level: 3, text: 'Strong', class: 'strength-strong' }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data.requiresOTP) {
        setUserId(response.data.userId)
        setStep('otp')
        setSuccess('OTP sent to your email. Please check your inbox.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const response = await api.post('/auth/verify-otp', { userId, otp })
      login(response.data.user, response.data.token)
      
      // Redirect based on role
      const roleRoutes = {
        doctor: '/doctor',
        pharmacy: '/pharmacy',
        patient: '/patient',
        admin: '/admin'
      }
      navigate(roleRoutes[response.data.user.role] || '/login')
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (getPasswordStrength(password).level < 2) {
      setError('Please use a stronger password')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await api.post('/auth/register', { name, email, password, role })
      if (response.data.requiresOTP) {
        setUserId(response.data.userId)
        setStep('otp')
        setSuccess('Registration successful! Please verify your email with the OTP sent.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setLoading(true)
    
    try {
      await api.post('/auth/resend-otp', { userId })
      setSuccess('New OTP sent to your email.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(step === 'register' ? password : '')

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">Rx</div>
          <h1 className="login-title">
            {step === 'login' && 'Welcome Back'}
            {step === 'register' && 'Create Account'}
            {step === 'otp' && 'Verify Email'}
          </h1>
          <p className="login-subtitle">
            {step === 'login' && 'Sign in to your secure prescription account'}
            {step === 'register' && 'Join our secure prescription system'}
            {step === 'otp' && 'Enter the verification code sent to your email'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* LOGIN FORM */}
        {step === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-yellow" 
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : 'Sign In'}
            </button>
            
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => { setStep('register'); setError(''); setSuccess('') }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-pink)', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Register
              </button>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {password && (
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div className={`password-strength-fill ${passwordStrength.class}`}></div>
                  </div>
                  <p className="password-strength-text" style={{ 
                    color: passwordStrength.level === 1 ? 'var(--error)' : 
                           passwordStrength.level === 2 ? 'var(--warning)' : 'var(--success)'
                  }}>
                    Password Strength: {passwordStrength.text}
                  </p>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-pink" 
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : 'Create Account'}
            </button>
            
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => { setStep('login'); setError(''); setSuccess('') }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-yellow-dark)', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' }}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-yellow" 
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading || otp.length !== 6}
            >
              {loading ? <span className="spinner"></span> : 'Verify & Login'}
            </button>
            
            <div style={{ textAlign: 'center' }}>
              <button 
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-pink)', 
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Resend OTP
              </button>
              <span style={{ color: 'var(--gray-400)', margin: '0 var(--spacing-sm)' }}>|</span>
              <button 
                type="button"
                onClick={() => { setStep('login'); setOtp(''); setError(''); setSuccess('') }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--gray-500)', 
                  cursor: 'pointer'
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Security Info */}
        <div style={{ 
          marginTop: 'var(--spacing-xl)', 
          padding: 'var(--spacing-md)', 
          background: 'var(--gray-50)', 
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--gray-500)'
        }}>
          <p><strong>Security Features:</strong></p>
          <ul style={{ marginLeft: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
            <li>AES-256 Encryption</li>
            <li>RSA Key Exchange</li>
            <li>Multi-Factor Authentication</li>
            <li>Account Lockout Protection</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Login

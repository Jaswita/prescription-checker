'use client';

// ============================================
// PROTECTED ROUTE COMPONENT
// Role-based route protection
// LAB MARK: Access Control on Frontend
// ============================================

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const roleRoutes = {
      doctor: '/doctor',
      pharmacy: '/pharmacy',
      patient: '/patient',
      admin: '/admin'
    }
    return <Navigate to={roleRoutes[user?.role] || '/login'} replace />
  }

  return children
}

export default ProtectedRoute

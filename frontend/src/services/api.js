// ============================================
// API SERVICE
// Axios instance with interceptors
// LAB MARK: Secure API Communication
// ============================================

import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - Add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect
          localStorage.removeItem('token')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          // Forbidden - insufficient permissions
          console.error('Access denied:', error.response.data.error)
          break
        case 429:
          // Rate limited
          console.error('Too many requests. Please try again later.')
          break
        default:
          break
      }
    }
    return Promise.reject(error)
  }
)

export default api

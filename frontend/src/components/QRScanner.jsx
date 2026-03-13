'use client';

// ============================================
// QR SCANNER COMPONENT
// Camera-based QR scanning with fallback
// LAB MARK: QR Code Decoding
// ============================================

import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

const QRScanner = ({ onScan, onError }) => {
  const [manualId, setManualId] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    if (scanning && !scannerRef.current) {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      )

      scanner.render(
        (decodedText) => {
          // Successfully scanned
          try {
            const data = JSON.parse(decodedText)
            if (data.prescriptionId) {
              onScan(data.prescriptionId)
              scanner.clear()
              setScanning(false)
            }
          } catch (e) {
            // If not JSON, use as-is
            onScan(decodedText)
            scanner.clear()
            setScanning(false)
          }
        },
        (error) => {
          // Scan error - usually just means no QR detected yet
          console.log('QR Scan:', error)
        }
      )

      scannerRef.current = scanner
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanning, onScan])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualId.trim()) {
      onScan(manualId.trim())
      setManualId('')
    }
  }

  const toggleScanner = () => {
    if (scanning && scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
    }
    setScanning(!scanning)
  }

  return (
    <div className="qr-scanner">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button 
          type="button"
          className={`btn ${scanning ? 'btn-pink' : 'btn-yellow'}`}
          onClick={toggleScanner}
        >
          {scanning ? 'Stop Camera' : 'Start Camera Scan'}
        </button>
      </div>

      {scanning && (
        <div 
          id="qr-reader" 
          style={{ 
            width: '100%', 
            maxWidth: '400px',
            margin: '0 auto var(--spacing-lg)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}
        ></div>
      )}

      <div style={{ 
        padding: 'var(--spacing-md)', 
        background: 'var(--gray-100)', 
        borderRadius: 'var(--radius-md)',
        textAlign: 'center'
      }}>
        <p style={{ 
          color: 'var(--gray-500)', 
          fontSize: '0.875rem',
          marginBottom: 'var(--spacing-md)'
        }}>
          Or enter prescription ID manually:
        </p>
        
        <form onSubmit={handleManualSubmit} style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)' 
        }}>
          <input
            type="text"
            className="form-input"
            placeholder="RX-1234567890-ABCD"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-outline-yellow">
            Verify
          </button>
        </form>
      </div>
    </div>
  )
}

export default QRScanner

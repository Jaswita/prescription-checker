
````markdown
# Secure Prescription Verification & Tracking System

A robust, enterprise-grade system for secure prescription management, verification, and controlled substance tracking. Built with high-security standards, audit compliance, and a modern full-stack architecture.

---

## Key Features

### Prescription Lifecycle Management
- **Secure Creation**: Doctors can issue encrypted prescriptions using AES-256 and RSA signatures.
- **Real-time Verification**: Pharmacies can instantly verify prescription authenticity via QR codes.
- **Secure Dispensing**: Integrated tracking for medicine dispensing with automatic inventory updates.
- **Controlled Substance Tracking**: Special protocols for high-risk medications to prevent abuse.

### Advanced Security Suite
- **Multi-Layer Encryption**: Dual encryption using AES for data and RSA for digital signatures.
- **Two-Factor Authentication (2FA)**: OTP-based secure login via Email (Nodemailer).
- **Brute Force Protection**: Account lockout after multiple failed attempts and rate limiting.
- **Session Management**: Secure JWT-based authentication with auto-logout features.

### Comprehensive Audit Logging
- **18 Event Types Tracked**: Full coverage from logins to prescription dispensing.
- **Dual Storage Strategy**:
  - **Database**: Indexed MongoDB records for fast admin queries.
  - **Flat Files**: Human-readable `.log` files for forensic evidence.
- **Immutable Records**: Logs are protected against deletion and modification.

### Admin & Pharmacy Dashboards
- **Security Monitoring**: Track failed access attempts and account lockouts.
- **Analytics & Reporting**: Visual statistics on system activity.
- **Data Export**: CSV export functionality for regulatory compliance and audits.

---

## Technology Stack

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) & [Vite](https://vitejs.dev/)
- **UI Library**: [React 19](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Radix UI](https://www.radix-ui.com/) components
- **Icons & Visualization**: [Lucide React](https://lucide.dev/) & [Recharts](https://recharts.org/)
- **State & Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
- **Security**: [Helmet](https://helmetjs.github.io/), [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)

### Utilities
- **Scanning**: [Html5-Qrcode](https://github.com/mebjas/html5-qrcode)
- **Email**: [Nodemailer](https://nodemailer.com/)
- **QR Generation**: [qrcode](https://github.com/soldair/node-qrcode)

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Atlas or Local)

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd secure-prescription-system
````

2. **Install dependencies**

```bash
npm install
```

3. **Environment Configuration**

Copy `.env.example` to `.env` in the backend folder and configure required variables.

4. **Run Development Server**

```bash
npm run dev
```

---

## Documentation

For detailed technical guides, implementation details, and workflow diagrams, refer to the **docs/** folder:

* **Implementation Overview** – `docs/IMPLEMENTATION_COMPLETE.md`
* **Audit System Quick Reference** – `docs/QUICK_REFERENCE.md`
* **Visual Flow Diagrams** – `docs/AUDIT_LOGGING_DIAGRAMS.md`
* **Complete Documentation Index** – `docs/README_DOCUMENTATION.md`

---

## Status

**Production Ready • Secure • Audit Compliant**


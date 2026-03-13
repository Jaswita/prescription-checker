# Event Flow Diagrams & Implementation Reference

## 1. LOGIN FLOW WITH AUDIT LOGGING

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LOGIN FLOW                              │
└─────────────────────────────────────────────────────────────────┘

User Input
    │
    ▼
┌──────────────────────────────────────┐
│  POST /auth/login                    │
│  - Email & Password                  │
└──────────────┬───────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Validate Email   │
        │ & Password       │
        └────┬───────┬─────┘
             │       │
         VALID    INVALID
             │       │
             │       ▼
             │   ┌─────────────────────────────────────┐
             │   │ LOG: LOGIN_FAILED                   │
             │   │ - User Email                        │
             │   │ - Reason: Invalid credentials       │
             │   │ - IP Address                        │
             │   │ - Attempt Count                     │
             │   │ - Status: FAILURE                   │
             │   └─────────────────────────────────────┘
             │       │
             │       ▼
             │   ┌──────────────────────┐
             │   │ Return 401 Error     │
             │   └──────────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Check Account Lock           │
│ (after 3 failed attempts)    │
└────┬────────────────┬────────┘
     │                │
    LOCKED         NOT LOCKED
     │                │
     ▼                ▼
┌─────────────┐  ┌─────────────────────────────────┐
│ ACCOUNT     │  │ LOG: OTP_SENT                   │
│ LOCKED      │  │ - User Email                    │
│ EVENT       │  │ - OTP generated                 │
│ STATUS:     │  │ - Destination                   │
│ FAILURE     │  │ - IP Address                    │
└─────────────┘  │ - Status: SUCCESS               │
                 └──────────┬──────────────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │ Send OTP via Email      │
                 └────────┬────────────────┘
                          │
                          ▼
                 ┌─────────────────────────────────────┐
                 │  Wait for OTP Verification          │
                 │  POST /auth/verify-otp              │
                 │  - User ID & OTP Code               │
                 └────────┬─────────────────┬──────────┘
                          │                 │
                       VALID             INVALID/EXPIRED
                          │                 │
                          ▼                 ▼
                 ┌──────────────────┐  ┌──────────────────────┐
                 │ LOG:             │  │ LOG: OTP_FAILED      │
                 │ OTP_SUCCESS      │  │ - Reason: Invalid    │
                 │                  │  │ - Status: FAILURE    │
                 │ + LOGIN_SUCCESS  │  │ - IP Address         │
                 │ - Status:        │  └──────────┬───────────┘
                 │   SUCCESS        │             │
                 └────────┬─────────┘             ▼
                          │            ┌──────────────────────┐
                          │            │ Return 400 Error     │
                          │            │ Optionally resend    │
                          │            │ OTP                  │
                          │            └──────────────────────┘
                          │
                          ▼
                 ┌─────────────────────────┐
                 │ Generate JWT Token      │
                 │ Return token to client  │
                 └─────────────────────────┘
```

**Database Audit Logs Created:**
- `LOGIN_FAILED` (on invalid password)
- `OTP_SENT` (when OTP generated)
- `OTP_FAILED` (on invalid/expired OTP)
- `OTP_SUCCESS` (on valid OTP)
- `LOGIN_SUCCESS` (on successful verification)

---

## 2. PRESCRIPTION CREATION & VERIFICATION FLOW

```
┌────────────────────────────────────────────────────────────────┐
│         PRESCRIPTION LIFECYCLE WITH AUDIT LOGS                 │
└────────────────────────────────────────────────────────────────┘

DOCTOR CREATES PRESCRIPTION
    │
    ▼
┌────────────────────────────────────────────┐
│ POST /prescriptions                        │
│ - Patient ID, Drug, Dosage, Instructions  │
│ - Doctor authentication required           │
└─────────┬──────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────┐
    │ ENCRYPT prescription data           │
    │ - AES encryption with IV            │
    │ - RSA key wrapping                  │
    │ - SHA-256 hash                      │
    │ - Digital signature                 │
    │ - Generate QR code                  │
    └─────────┬───────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────┐
    │ LOG: PRESCRIPTION_CREATED            │
    │ - Doctor ID & Email                  │
    │ - Patient ID                         │
    │ - Prescription ID (RX-XXXXX)         │
    │ - Drug Name & Dosage                 │
    │ - Controlled Substance: Yes/No       │
    │ - Creation Timestamp                 │
    │ - Status: SUCCESS                    │
    └─────────┬────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────┐
    │ Store in Database                    │
    │ - Encrypted data in Prescription     │
    │ - Audit log in AuditLog collection   │
    └─────────┬────────────────────────────┘
              │
              ▼
PRESCRIPTION SENT TO PHARMACY (QR Code)
    │
    ▼
PHARMACY RECEIVES & VERIFIES
    │
    ▼
┌────────────────────────────────────────────┐
│ POST /prescriptions/verify/:id             │
│ - Pharmacy authentication required         │
│ - QR code scan or manual entry             │
└─────────┬──────────────────────────────────┘
          │
          ▼
    ┌──────────────────────────────────────┐
    │ VERIFY prescription                  │
    │ - Validate digital signature         │
    │ - Verify hash integrity              │
    │ - Check expiry date                  │
    │ - If controlled: verify extra checks │
    └──────┬──────────────────┬────────────┘
           │                  │
        VALID            INVALID/EXPIRED
           │                  │
           ▼                  ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ LOG:            │  │ LOG:            │
    │ PRESCRIPTION_   │  │ PRESCRIPTION_   │
    │ VERIFIED        │  │ VERIFIED        │
    │                 │  │ (FAILED)        │
    │ - Pharmacy ID   │  │                 │
    │ - Prescription  │  │ - Reason: why   │
    │ - Signature:    │  │ - Status:       │
    │   VALID         │  │   FAILURE       │
    │ - Status:       │  └─────────────────┘
    │   SUCCESS       │
    └────────┬────────┘
             │
             ▼
PHARMACY DISPENSES MEDICATION
    │
    ▼
┌────────────────────────────────────────────┐
│ POST /prescriptions/dispense/:id           │
│ - Quantity, Pharmacy ID, Timestamp         │
└─────────┬──────────────────────────────────┘
          │
          ▼
    ┌──────────────────────────────────────┐
    │ LOG: PRESCRIPTION_DISPENSED          │
    │ - Pharmacy ID & Email                │
    │ - Prescription ID                    │
    │ - Drug Name, Dosage, Quantity        │
    │ - Controlled Substance: Yes/No       │
    │ - Dispensed to Patient               │
    │ - Dispensed Timestamp                │
    │ - Status: SUCCESS                    │
    └─────────┬────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────┐
    │ Update Prescription Status: USED      │
    │ - In Prescription collection          │
    │ - Create Audit Log                    │
    └──────────────────────────────────────┘
              │
              ▼
        PRESCRIPTION COMPLETE
```

**Audit Logs Created:**
1. `PRESCRIPTION_CREATED` - By doctor, with full details
2. `PRESCRIPTION_VERIFIED` - By pharmacy, with validation status
3. `PRESCRIPTION_DISPENSED` - By pharmacy, with dispensing details

---

## 3. FAILED ACCESS ATTEMPT FLOW

```
┌─────────────────────────────────────────────────────────────┐
│      ROLE-BASED ACCESS CONTROL (RBAC) WITH AUDIT LOGS       │
└─────────────────────────────────────────────────────────────┘

User Request
    │
    ▼
┌──────────────────────────────────────┐
│ GET /admin/users                     │
│ (protected route)                    │
└──────────────┬───────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Extract JWT      │
        │ From Request     │
        └────┬───────┬─────┘
             │       │
          VALID   INVALID
             │       │
             │       ▼
             │   ┌──────────────────┐
             │   │ Reject request   │
             │   │ 401 Unauthorized │
             │   └──────────────────┘
             │
             ▼
        ┌──────────────────────────┐
        │ Check User Role          │
        │ (from JWT payload)       │
        └────┬──────┬──────┬───────┘
             │      │      │
          ADMIN  DOCTOR PATIENT
             │      │      │
             │      │      ▼
             │      │   ┌──────────────────────────┐
             │      │   │ ROLE MISMATCH DETECTED   │
             │      │   │                          │
             │      │   │ LOG: ACCESS_DENIED       │
             │      │   │ - User ID & Email        │
             │      │   │ - User Role: PATIENT     │
             │      │   │ - Required Role: ADMIN   │
             │      │   │ - Resource: /admin/users │
             │      │   │ - Reason: Insufficient   │
             │      │   │           permissions    │
             │      │   │ - IP Address             │
             │      │   │ - Timestamp              │
             │      │   │ - Status: FAILURE        │
             │      │   └────┬────────────────────┘
             │      │        │
             │      │        ▼
             │      │   ┌──────────────────────────┐
             │      │   │ LOG: FAILED_ACCESS_      │
             │      │   │ ATTEMPT                  │
             │      │   │ - Endpoint: /admin/users │
             │      │   │ - Method: GET            │
             │      │   │ - Status Code: 403       │
             │      │   │ - User: patient@test.com │
             │      │   │ - IP: 192.168.1.108      │
             │      │   └────┬────────────────────┘
             │      │        │
             │      │        ▼
             │      │   ┌──────────────────┐
             │      │   │ Return 403       │
             │      │   │ Forbidden        │
             │      │   └──────────────────┘
             │      │
             │      ▼
             │   ┌──────────────────────────┐
             │   │ DOCTOR tries to access   │
             │   │ /admin/audit-logs        │
             │   │                          │
             │   │ LOG: ACCESS_DENIED       │
             │   │ - User Role: DOCTOR      │
             │   │ - Required: ADMIN        │
             │   │ - Return 403             │
             │   └──────────────────────────┘
             │
             ▼
        ┌──────────────────────────┐
        │ ADMIN ACCESS ALLOWED      │
        │ Grant access to resource  │
        │ Continue request          │
        └──────────────────────────┘
```

**Audit Logs Created:**
- `ACCESS_DENIED` - When user doesn't have required role
- `FAILED_ACCESS_ATTEMPT` - When unauthorized endpoint access attempted

---

## 4. AUDIT LOG QUERY EXAMPLES

```
┌─────────────────────────────────────────────────────────────┐
│           ADMIN AUDIT LOG QUERIES                           │
└─────────────────────────────────────────────────────────────┘

QUERY 1: Get All Login Events
┌─────────────────────────────────────┐
│ GET /admin/audit-logs?eventType=    │
│     LOGIN_SUCCESS&limit=50           │
└─────────────────────────────────────┘
         │
         ▼
    Returns: 50 successful logins
    With: User details, IP, timestamp

QUERY 2: Security Monitoring - Failed Logins
┌─────────────────────────────────────┐
│ GET /admin/security/failed-logins   │
│     ?limit=20                        │
└─────────────────────────────────────┘
         │
         ▼
    Returns: Failed login attempts
    Shows: Email, IP, attempt count
    Used for: Detecting attacks

QUERY 3: Prescription Activity
┌─────────────────────────────────────┐
│ GET /admin/prescriptions/activity   │
│     ?userRole=pharmacy&limit=30      │
└─────────────────────────────────────┘
         │
         ▼
    Returns: Prescription events by pharmacies
    Shows: Verification, dispensing, cancellation

QUERY 4: Summary Statistics
┌─────────────────────────────────────┐
│ GET /admin/audit-logs/summary       │
│     ?startDate=2025-01-20            │
│     &endDate=2025-01-28              │
└─────────────────────────────────────┘
         │
         ▼
    Returns:
    - By Event Type: [LOGIN_SUCCESS: 45, ...]
    - By Status: [SUCCESS: 250, FAILURE: 15]
    - By Role: [doctor: 80, pharmacy: 60, ...]

QUERY 5: Export to CSV
┌─────────────────────────────────────┐
│ GET /admin/audit-logs/export        │
│     ?eventType=LOGIN_FAILED          │
│     &userRole=doctor                 │
└─────────────────────────────────────┘
         │
         ▼
    Downloads CSV file with:
    - Timestamp, Event, User, Status, IP, Reason
    - Ready for Excel/BI analysis
```

---

## 5. EVENT TYPE MATRIX

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT GETS LOGGED                         │
├─────────────────────────────────────────────────────────────┤

AUTHENTICATION EVENTS (Who logged in?)
├─ LOGIN_SUCCESS       ✓ Email, IP, Role, Timestamp
├─ LOGIN_FAILED        ✓ Email, Reason, IP, Attempt count
├─ OTP_SENT            ✓ Email, Destination
├─ OTP_SUCCESS         ✓ Email, Verification time
├─ OTP_FAILED          ✓ Email, Reason (invalid/expired)
├─ REGISTER            ✓ Email, Role, Registration time
├─ LOGOUT              ✓ Email, Session duration
└─ PASSWORD_CHANGED    ✓ Email, Change timestamp

PRESCRIPTION EVENTS (What prescriptions were managed?)
├─ PRESCRIPTION_CREATED      ✓ Rx ID, Doctor, Patient, Drug
├─ PRESCRIPTION_VERIFIED     ✓ Rx ID, Pharmacy, Signature status
├─ PRESCRIPTION_DISPENSED    ✓ Rx ID, Pharmacy, Patient, Drug
└─ PRESCRIPTION_CANCELLED    ✓ Rx ID, Doctor, Reason

SECURITY EVENTS (Was access allowed?)
├─ ACCOUNT_LOCKED          ✓ Email, Reason (failed attempts)
├─ ACCOUNT_UNLOCKED        ✓ Email, Unlocked by admin
├─ ACCESS_DENIED           ✓ User, Resource, Required role
└─ FAILED_ACCESS_ATTEMPT   ✓ User, Endpoint, Method, IP

ADMIN EVENTS (What did admins do?)
└─ ADMIN_ACTION            ✓ Admin ID, Action, Records affected

```

---

## 6. Data Flow Summary

```
┌──────────────────────────────────────────────────────┐
│            EVENT LOGGING ARCHITECTURE                │
└──────────────────────────────────────────────────────┘

USER ACTION
    │
    ▼
┌──────────────────────────┐
│  Controller              │
│  (auth, admin, etc.)     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  createAuditLog() Helper Function        │
│  ├─ Event Type                           │
│  ├─ User Context (ID, Role, Email)       │
│  ├─ IP & User Agent                      │
│  ├─ Action Description                   │
│  ├─ Status (SUCCESS/FAILURE)              │
│  ├─ Resource (Prescription ID, etc.)      │
│  └─ Metadata (Context-specific data)      │
└────────┬─────────────────────────────────┘
         │
    ┌────┴─────────────────┐
    │                      │
    ▼                      ▼
┌─────────────┐    ┌──────────────────┐
│ File Logs   │    │ Database Logs     │
│             │    │                   │
│ - activity  │    │ - AuditLog        │
│   .log      │    │   collection      │
│ - auth      │    │                   │
│   .log      │    │ Indexed by:       │
│ - rx.log    │    │ - timestamp       │
│ - access    │    │ - userId          │
│   .log      │    │ - eventType       │
│             │    │ - userRole        │
│ Human       │    │                   │
│ readable    │    │ Queryable         │
│ format      │    │ & exportable      │
└─────────────┘    └──────────────────┘
    │                      │
    └────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  View & Query Logs       │
│  ├─ Admin Dashboard      │
│  ├─ API Queries          │
│  ├─ CSV Export           │
│  ├─ Analytics            │
│  └─ Security Monitoring  │
└──────────────────────────┘
```

---

## 7. Complete Event Tracking Example

```
SCENARIO: Doctor Creates Prescription, Pharmacy Dispenses

TIMELINE:

10:15:32 - LOGIN_SUCCESS
           ├─ eventType: LOGIN_SUCCESS
           ├─ userId: doctor1_id
           ├─ userRole: doctor
           ├─ userEmail: doctor1@test.com
           ├─ action: Doctor login successful
           ├─ ipAddress: 192.168.1.110
           └─ status: SUCCESS

10:20:10 - PRESCRIPTION_CREATED
           ├─ eventType: PRESCRIPTION_CREATED
           ├─ userId: doctor1_id
           ├─ userRole: doctor
           ├─ resourceId: RX-10001
           ├─ action: Prescription created
           ├─ metadata:
           │  ├─ drugName: Amoxicillin 500mg
           │  ├─ dosage: 500mg
           │  ├─ patientId: patient1_id
           │  └─ isControlledSubstance: false
           └─ status: SUCCESS

10:30:15 - PRESCRIPTION_VERIFIED
           ├─ eventType: PRESCRIPTION_VERIFIED
           ├─ userId: pharmacy1_id
           ├─ userRole: pharmacy
           ├─ userEmail: pharmacy1@test.com
           ├─ resourceId: RX-10001
           ├─ action: Prescription verified
           ├─ metadata:
           │  ├─ signatureValid: true
           │  ├─ hashMatched: true
           │  └─ integrityCheck: PASSED
           └─ status: SUCCESS

10:35:20 - PRESCRIPTION_DISPENSED
           ├─ eventType: PRESCRIPTION_DISPENSED
           ├─ userId: pharmacy1_id
           ├─ userRole: pharmacy
           ├─ resourceId: RX-10001
           ├─ action: Prescription dispensed
           ├─ metadata:
           │  ├─ drugName: Amoxicillin 500mg
           │  ├─ quantity: 30
           │  ├─ dispensedTo: patient1@test.com
           │  └─ isControlledSubstance: false
           └─ status: SUCCESS

10:45:00 - LOGOUT
           ├─ eventType: LOGOUT
           ├─ userId: doctor1_id
           ├─ userRole: doctor
           ├─ userEmail: doctor1@test.com
           ├─ action: User logout
           ├─ metadata:
           │  └─ sessionDuration: 30 minutes
           └─ status: SUCCESS

COMPLETE AUDIT TRAIL: 5 events, 30 minutes, 2 actions, 100% success
```

This comprehensive audit trail enables:
✅ Non-repudiation (doctor can't deny creating Rx)
✅ Accountability (know exactly who did what)
✅ Forensic analysis (if prescription is questioned)
✅ Compliance (HIPAA audit trail complete)
✅ Security (detect unauthorized access)

/*
 * Seed script for SecureRx
 * Creates multiple doctors, pharmacies, patients, admin and demo prescriptions.
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const connectDB = require("./config/db");
const User = require("./models/User");
const Prescription = require("./models/Prescription");
const AuditLog = require("./models/AuditLog");
const { generateAESKey, encrypt } = require("./crypto/aes");
const { encryptWithPublicKey, generateKeyPair } = require("./crypto/rsa");
const { createHash, createSignedHash } = require("./crypto/signature");

dotenv.config();

async function seed() {
  try {
    await connectDB();

    // Clear collections
    await User.deleteMany({});
    await Prescription.deleteMany({});
    await AuditLog.deleteMany({});
    console.log("🧹 Cleared users, prescriptions, and audit logs");

    // Helper to create users with RSA keys
    async function createUser({ name, email, password, role }) {
      const keys = generateKeyPair();
      return User.create({
        name,
        email,
        password,
        role,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        isVerified: true,
      });
    }

    // ------------------------
    // USERS
    // ------------------------
    const admin = await createUser({
      name: "System Admin",
      email: "admin@securerx.test",
      password: "Admin@123",
      role: "admin",
    });

    const doctors = await Promise.all([
      createUser({
        name: "Dr. Alice Carter",
        email: "doctor1@securerx.test",
        password: "Doctor@123",
        role: "doctor",
      }),
      createUser({
        name: "Dr. Brian Lee",
        email: "doctor2@securerx.test",
        password: "Doctor@123",
        role: "doctor",
      }),
      createUser({
        name: "Dr. Neha Sharma",
        email: "doctor3@securerx.test",
        password: "Doctor@123",
        role: "doctor",
      }),
      createUser({
        name: "Dr. Ravi Kumar",
        email: "doctor4@securerx.test",
        password: "Doctor@123",
        role: "doctor",
      }),
      createUser({
        name: "Dr. Emily Wong",
        email: "doctor5@securerx.test",
        password: "Doctor@123",
        role: "doctor",
      }),
    ]);

    const pharmacies = await Promise.all([
      createUser({
        name: "PharmaOne Main",
        email: "pharmacy1@securerx.test",
        password: "Pharmacy@123",
        role: "pharmacy",
      }),
      createUser({
        name: "City Meds",
        email: "pharmacy2@securerx.test",
        password: "Pharmacy@123",
        role: "pharmacy",
      }),
      createUser({
        name: "HealthPlus Drugs",
        email: "pharmacy3@securerx.test",
        password: "Pharmacy@123",
        role: "pharmacy",
      }),
      createUser({
        name: "Care Pharmacy",
        email: "pharmacy4@securerx.test",
        password: "Pharmacy@123",
        role: "pharmacy",
      }),
      createUser({
        name: "Metro Pharmacy",
        email: "pharmacy5@securerx.test",
        password: "Pharmacy@123",
        role: "pharmacy",
      }),
    ]);

    const patients = await Promise.all([
      createUser({
        name: "John Doe",
        email: "patient1@securerx.test",
        password: "Patient@123",
        role: "patient",
      }),
      createUser({
        name: "Aisha Khan",
        email: "patient2@securerx.test",
        password: "Patient@123",
        role: "patient",
      }),
      createUser({
        name: "Rohit Mehta",
        email: "patient3@securerx.test",
        password: "Patient@123",
        role: "patient",
      }),
      createUser({
        name: "Sarah Brown",
        email: "patient4@securerx.test",
        password: "Patient@123",
        role: "patient",
      }),
      createUser({
        name: "Kiran Patel",
        email: "patient5@securerx.test",
        password: "Patient@123",
        role: "patient",
      }),
    ]);

    console.log("👥 Users created");

    // ------------------------
    // PRESCRIPTION BUILDER
    // ------------------------
    async function buildPrescription({
      prescriptionId,
      doctorUser,
      patientUser,
      drugName,
      dosage,
      instructions,
      daysValid = 30,
      isControlledSubstance = false,
    }) {
      const plainPayload = JSON.stringify({
        prescriptionId,
        patient: {
          id: patientUser._id.toString(),
          name: patientUser.name,
          email: patientUser.email,
        },
        doctor: {
          id: doctorUser._id.toString(),
          name: doctorUser.name,
          email: doctorUser.email,
        },
        medication: {
          drugName,
          dosage,
          instructions,
          isControlledSubstance,
        },
        issuedAt: new Date().toISOString(),
      });

      // AES encrypt
      const aesKey = generateAESKey();
      const { iv, encryptedData } = encrypt(plainPayload, aesKey);

      // RSA wrap AES key
      const aesKeyEncrypted = encryptWithPublicKey(
        aesKey.toString("base64"),
        doctorUser.publicKey
      );

      // Hash + sign
      const hash = createHash(plainPayload);
      const { signature: digitalSignature } = createSignedHash(
        plainPayload,
        doctorUser.privateKey
      );

      // QR Code
      const qrPayload = JSON.stringify({
        prescriptionId,
        patientId: patientUser._id.toString(),
      });

      const qrCode = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "M",
        width: 220,
      });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysValid);

      return {
        prescriptionId,
        doctorId: doctorUser._id,
        patientId: patientUser._id,
        encryptedData,
        iv,
        aesKeyEncrypted,
        hash,
        digitalSignature,
        qrCode,
        drugName,
        dosage,
        expiryDate,
        isControlledSubstance,
        status: "ACTIVE",
      };
    }

    // ------------------------
    // PRESCRIPTIONS
    // ------------------------
    const meds = [
      { name: "Amoxicillin 500mg", controlled: false },
      { name: "Paracetamol 650mg", controlled: false },
      { name: "Metformin 500mg", controlled: false },
      { name: "Oxycodone 5mg", controlled: true },
      { name: "Morphine 10mg", controlled: true },
      { name: "Diazepam 5mg", controlled: true },
      { name: "Atorvastatin 10mg", controlled: false },
      { name: "Ibuprofen 400mg", controlled: false },
      { name: "Tramadol 50mg", controlled: true },
      { name: "Ciprofloxacin 500mg", controlled: false },
    ];

    const prescriptions = [];

    let rxCount = 10001;

    for (let i = 0; i < meds.length; i++) {
      const doctor = doctors[i % doctors.length];
      const patient = patients[i % patients.length];

      const rx = await buildPrescription({
        prescriptionId: `RX-${rxCount++}`,
        doctorUser: doctor,
        patientUser: patient,
        drugName: meds[i].name,
        dosage: "As prescribed by doctor",
        instructions: meds[i].controlled
          ? "Monitor usage carefully. No refills without approval."
          : "Take after meals",
        daysValid: meds[i].controlled ? 15 : 30,
        isControlledSubstance: meds[i].controlled,
      });

      prescriptions.push(rx);
    }

    await Prescription.insertMany(prescriptions);

    console.log("💊 Prescriptions created:", prescriptions.length);

    // ------------------------
    // AUDIT LOGS (Comprehensive)
    // ------------------------
    const auditLogs = [
      // Registration Events
      {
        eventType: 'REGISTER',
        userId: admin._id,
        userRole: 'admin',
        userEmail: 'admin@securerx.test',
        action: 'System admin registration',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },

      // LOGIN_SUCCESS Events
      ...doctors.map((doctor, index) => ({
        eventType: 'LOGIN_SUCCESS',
        userId: doctor._id,
        userRole: 'doctor',
        userEmail: doctor.email,
        action: `Doctor login successful`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (5000 - index * 500)),
        ipAddress: `192.168.1.${110 + index}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })),

      ...pharmacies.map((pharmacy, index) => ({
        eventType: 'LOGIN_SUCCESS',
        userId: pharmacy._id,
        userRole: 'pharmacy',
        userEmail: pharmacy.email,
        action: `Pharmacy login successful`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (5000 - index * 600)),
        ipAddress: `192.168.1.${105 + index}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })),

      ...patients.map((patient, index) => ({
        eventType: 'LOGIN_SUCCESS',
        userId: patient._id,
        userRole: 'patient',
        userEmail: patient.email,
        action: `Patient login successful`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (5000 - index * 700)),
        ipAddress: `192.168.1.${107 + index}`,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      })),

      // OTP_SENT Events
      ...doctors.slice(0, 3).map((doctor, index) => ({
        eventType: 'OTP_SENT',
        userId: doctor._id,
        userRole: 'doctor',
        userEmail: doctor.email,
        action: 'OTP sent for MFA verification',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (4500 - index * 500)),
        ipAddress: `192.168.1.${110 + index}`,
        userAgent: 'Mozilla/5.0'
      })),

      // OTP_SUCCESS Events
      ...doctors.slice(0, 3).map((doctor, index) => ({
        eventType: 'OTP_SUCCESS',
        userId: doctor._id,
        userRole: 'doctor',
        userEmail: doctor.email,
        action: 'OTP verified successfully',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (4000 - index * 500)),
        ipAddress: `192.168.1.${110 + index}`,
        userAgent: 'Mozilla/5.0'
      })),

      // OTP_FAILED Events
      {
        eventType: 'OTP_FAILED',
        userId: patients[0]._id,
        userRole: 'patient',
        userEmail: patients[0].email,
        action: 'Failed OTP verification',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 3000),
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0',
        reason: 'Invalid OTP provided'
      },

      {
        eventType: 'OTP_FAILED',
        userId: patients[0]._id,
        userRole: 'patient',
        userEmail: patients[0].email,
        action: 'Failed OTP verification - OTP expired',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 2500),
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0',
        reason: 'OTP expired',
        metadata: { otpExpiry: new Date(Date.now() - 1000) }
      },

      // LOGIN_FAILED Events
      {
        eventType: 'LOGIN_FAILED',
        userId: doctors[1]._id,
        userRole: 'doctor',
        userEmail: doctors[1].email,
        action: 'Failed login attempt',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 3500),
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0',
        reason: 'Invalid password',
        metadata: { attemptsLeft: 2 }
      },

      {
        eventType: 'LOGIN_FAILED',
        userId: doctors[1]._id,
        userRole: 'doctor',
        userEmail: doctors[1].email,
        action: 'Failed login attempt',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 3000),
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0',
        reason: 'Invalid password',
        metadata: { attemptsLeft: 1 }
      },

      {
        eventType: 'LOGIN_FAILED',
        userId: doctors[1]._id,
        userRole: 'doctor',
        userEmail: doctors[1].email,
        action: 'Failed login attempt',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 2500),
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0',
        reason: 'Invalid password',
        metadata: { attemptsLeft: 0 }
      },

      // ACCOUNT_LOCKED Event
      {
        eventType: 'ACCOUNT_LOCKED',
        userId: doctors[1]._id,
        userRole: 'doctor',
        userEmail: doctors[1].email,
        action: 'Account locked due to failed login attempts',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 2000),
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0',
        reason: 'Too many failed login attempts (3/3)',
        metadata: { lockDurationMinutes: 15 }
      },

      // PRESCRIPTION_CREATED Events
      ...prescriptions.map((rx, index) => ({
        eventType: 'PRESCRIPTION_CREATED',
        userId: rx.doctorId,
        userRole: 'doctor',
        userEmail: doctors[index % doctors.length].email,
        action: `Prescription created: ${rx.prescriptionId}`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (2000 - index * 100)),
        ipAddress: `192.168.1.${110 + (index % 5)}`,
        userAgent: 'Mozilla/5.0',
        resourceId: rx.prescriptionId,
        resourceType: 'Prescription',
        metadata: {
          drugName: rx.drugName,
          patientId: rx.patientId.toString(),
          isControlledSubstance: rx.isControlledSubstance
        }
      })),

      // PRESCRIPTION_VERIFIED Events
      ...prescriptions.slice(0, 8).map((rx, index) => ({
        eventType: 'PRESCRIPTION_VERIFIED',
        userId: pharmacies[index % pharmacies.length]._id,
        userRole: 'pharmacy',
        userEmail: pharmacies[index % pharmacies.length].email,
        action: `Prescription verified: ${rx.prescriptionId}`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (1500 - index * 100)),
        ipAddress: `192.168.1.${105 + (index % 5)}`,
        userAgent: 'Mozilla/5.0',
        resourceId: rx.prescriptionId,
        resourceType: 'Prescription',
        metadata: {
          signatureValid: true,
          hashMatched: true,
          integrityCheck: 'PASSED'
        }
      })),

      // PRESCRIPTION_DISPENSED Events
      ...prescriptions.slice(0, 6).map((rx, index) => ({
        eventType: 'PRESCRIPTION_DISPENSED',
        userId: pharmacies[index % pharmacies.length]._id,
        userRole: 'pharmacy',
        userEmail: pharmacies[index % pharmacies.length].email,
        action: `Prescription dispensed: ${rx.prescriptionId}`,
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (1000 - index * 80)),
        ipAddress: `192.168.1.${105 + (index % 5)}`,
        userAgent: 'Mozilla/5.0',
        resourceId: rx.prescriptionId,
        resourceType: 'Prescription',
        metadata: {
          drugName: rx.drugName,
          dosage: rx.dosage,
          quantity: 30,
          dispensedTo: patients[index % patients.length].email,
          isControlledSubstance: rx.isControlledSubstance
        }
      })),

      // ACCESS_DENIED Events
      {
        eventType: 'ACCESS_DENIED',
        userId: patients[0]._id,
        userRole: 'patient',
        userEmail: patients[0].email,
        action: 'Access denied to admin dashboard',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 1200),
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0',
        reason: 'Insufficient permissions (Role: Patient, Required: Admin)',
        resourceType: 'System'
      },

      {
        eventType: 'ACCESS_DENIED',
        userId: pharmacies[0]._id,
        userRole: 'pharmacy',
        userEmail: pharmacies[0].email,
        action: 'Access denied to patient personal data',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 800),
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0',
        reason: 'Role-based access control violation',
        resourceType: 'System'
      },

      // FAILED_ACCESS_ATTEMPT Events
      {
        eventType: 'FAILED_ACCESS_ATTEMPT',
        userId: patients[0]._id,
        userRole: 'patient',
        userEmail: patients[0].email,
        action: 'Unauthorized access attempt to /admin/users',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 1100),
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0',
        reason: 'Endpoint requires admin role',
        metadata: {
          method: 'GET',
          endpoint: '/admin/users',
          statusCode: 403
        }
      },

      {
        eventType: 'FAILED_ACCESS_ATTEMPT',
        userId: patients[1]._id,
        userRole: 'patient',
        userEmail: patients[1].email,
        action: 'Unauthorized access attempt to /prescriptions/admin',
        status: 'FAILURE',
        timestamp: new Date(Date.now() - 900),
        ipAddress: '192.168.1.107',
        userAgent: 'Mozilla/5.0',
        reason: 'Endpoint requires admin role',
        metadata: {
          method: 'GET',
          endpoint: '/prescriptions/admin',
          statusCode: 403
        }
      },

      // LOGOUT Events
      ...doctors.slice(0, 2).map((doctor, index) => ({
        eventType: 'LOGOUT',
        userId: doctor._id,
        userRole: 'doctor',
        userEmail: doctor.email,
        action: 'User logout',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - (500 - index * 100)),
        ipAddress: `192.168.1.${110 + index}`,
        userAgent: 'Mozilla/5.0',
        metadata: { sessionDuration: (20 + index * 5) }
      })),

      // ADMIN_ACTION Events
      {
        eventType: 'ADMIN_ACTION',
        userId: admin._id,
        userRole: 'admin',
        userEmail: 'admin@securerx.test',
        action: 'View audit logs',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 300),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        metadata: {
          action: 'view_audit_logs',
          filters: { role: 'doctor', startDate: new Date(Date.now() - 86400000) },
          recordsRetrieved: 15
        }
      },

      {
        eventType: 'ADMIN_ACTION',
        userId: admin._id,
        userRole: 'admin',
        userEmail: 'admin@securerx.test',
        action: 'View system logs',
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 200),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        metadata: {
          action: 'view_system_logs',
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(),
          recordsRetrieved: 38
        }
      }
    ];

    await AuditLog.insertMany(auditLogs);
    console.log("📋 Audit logs created:", auditLogs.length);

    console.log("✅ Seed complete. Database populated.");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Mongo connection closed");
    process.exit(0);
  }
}

seed();

/*Doctor → AES encrypt → RSA encrypt key → SHA hash → Sign → QR
Pharmacy → Decrypt key → Decrypt data → Verify hash → Verify signature */
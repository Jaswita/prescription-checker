// ============================================
// PRESCRIPTION CONTROLLER
// Handles prescription CRUD operations
// LAB MARK: Encryption, Signatures, QR
// ============================================

const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { encrypt, decrypt, generateAESKey } = require('../crypto/aes');
const { encryptWithPublicKey, decryptWithPrivateKey } = require('../crypto/rsa');
const { createSignedHash, verifySignedHash } = require('../crypto/signature');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Create a new prescription (Doctor only)
 * POST /prescriptions/create
 * LAB MARK: AES Encryption, RSA Key Exchange, Digital Signature
 */
const createPrescription = async (req, res) => {
  try {
    const { patientId, drugName, dosage, instructions, isControlledSubstance, expiryDays = 30 } = req.body;

    // Validate input
    if (!patientId || !drugName || !dosage) {
      return res.status(400).json({ error: 'Patient ID, drug name, and dosage are required.' });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ error: 'Invalid patient ID.' });
    }

    // Get doctor's keys
    const doctor = await User.findById(req.userId);
    if (!doctor.privateKey || !doctor.publicKey) {
      return res.status(400).json({ error: 'Doctor keys not found. Please contact admin.' });
    }

    // Prepare prescription data
    const prescriptionData = JSON.stringify({
      patientId,
      patientName: patient.name,
      doctorId: req.userId,
      doctorName: doctor.name,
      drugName,
      dosage,
      instructions,
      isControlledSubstance,
      createdAt: new Date().toISOString()
    });

    // LAB MARK: Step 1 - Generate AES key for symmetric encryption
    const aesKey = generateAESKey();

    // LAB MARK: Step 2 - Encrypt prescription data with AES
    const { iv, encryptedData } = encrypt(prescriptionData, aesKey);

    // LAB MARK: Step 3 - Encrypt AES key with doctor's public key (Key Exchange)
    const aesKeyEncrypted = encryptWithPublicKey(aesKey.toString('hex'), doctor.publicKey);

    // LAB MARK: Step 4 - Create hash and sign it (Digital Signature)
    const { hash, signature } = createSignedHash(prescriptionData, doctor.privateKey);

    // Generate unique prescription ID
    const prescriptionId = `RX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // LAB MARK: Step 5 - Generate QR Code (Encoding)
    const qrData = JSON.stringify({
      prescriptionId,
      verifyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${prescriptionId}`
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Create prescription record
    const prescription = new Prescription({
      prescriptionId,
      doctorId: req.userId,
      patientId,
      encryptedData,
      iv,
      aesKeyEncrypted,
      hash,
      digitalSignature: signature,
      qrCode,
      drugName,
      dosage,
      isControlledSubstance: isControlledSubstance || false,
      expiryDate
    });

    // Add audit log
    prescription.addAuditLog('CREATED', req.userId, 'doctor', 'Prescription created and signed', req.ip);

    await prescription.save();

    res.status(201).json({
      message: 'Prescription created successfully.',
      prescription: {
        prescriptionId: prescription.prescriptionId,
        drugName,
        dosage,
        status: prescription.status,
        expiryDate: prescription.expiryDate,
        qrCode: prescription.qrCode,
        isControlledSubstance: prescription.isControlledSubstance
      }
    });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription.' });
  }
};

/**
 * Verify a prescription (Public/Pharmacy)
 * POST /prescriptions/verify
 * LAB MARK: Signature Verification, Hash Verification
 */
const verifyPrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ error: 'Prescription ID is required.' });
    }

    // Find prescription
    const prescription = await Prescription.findOne({ prescriptionId })
      .populate('doctorId', 'name email publicKey')
      .populate('patientId', 'name email');

    if (!prescription) {
      return res.status(404).json({ 
        error: 'Prescription not found.',
        verificationStatus: 'NOT_FOUND'
      });
    }

    // Check expiry
    if (prescription.isExpired()) {
      return res.status(400).json({
        error: 'Prescription has expired.',
        verificationStatus: 'EXPIRED',
        prescription: {
          prescriptionId: prescription.prescriptionId,
          status: 'EXPIRED'
        }
      });
    }

    // Check if already used
    if (prescription.status === 'USED') {
      return res.status(400).json({
        error: 'Prescription has already been used.',
        verificationStatus: 'ALREADY_USED',
        prescription: {
          prescriptionId: prescription.prescriptionId,
          status: 'USED',
          dispensedAt: prescription.dispensedAt
        }
      });
    }

    // Get doctor's public key for verification
    const doctorPublicKey = prescription.doctorId.publicKey;

    // LAB MARK: Decrypt AES key using doctor's private key
    const doctor = await User.findById(prescription.doctorId._id);
    const aesKey = Buffer.from(
      decryptWithPrivateKey(prescription.aesKeyEncrypted, doctor.privateKey).toString(),
      'hex'
    );

    // LAB MARK: Decrypt prescription data
    const decryptedData = decrypt(prescription.encryptedData, aesKey, prescription.iv);

    // LAB MARK: Verify hash and signature
    const verification = verifySignedHash(
      decryptedData,
      prescription.hash,
      prescription.digitalSignature,
      doctorPublicKey
    );

    // Add to audit log if user is authenticated
    if (req.user) {
      prescription.addAuditLog('VERIFIED', req.userId, req.userRole, 
        `Verification attempt: ${verification.isValid ? 'SUCCESS' : 'FAILED'}`, req.ip);
      await prescription.save();
    }

    if (!verification.isValid) {
      return res.status(400).json({
        error: 'Prescription verification failed. Data may have been tampered.',
        verificationStatus: 'TAMPERED',
        details: {
          hashMatch: verification.hashMatch,
          signatureValid: verification.signatureValid
        }
      });
    }

    // Parse decrypted data
    const prescriptionDetails = JSON.parse(decryptedData);

    res.json({
      message: 'Prescription verified successfully.',
      verificationStatus: 'VALID',
      verification: {
        hashMatch: verification.hashMatch,
        signatureValid: verification.signatureValid,
        integrityVerified: true
      },
      prescription: {
        prescriptionId: prescription.prescriptionId,
        doctor: prescription.doctorId.name,
        patient: prescription.patientId.name,
        drugName: prescriptionDetails.drugName,
        dosage: prescriptionDetails.dosage,
        instructions: prescriptionDetails.instructions,
        isControlledSubstance: prescription.isControlledSubstance,
        status: prescription.status,
        createdAt: prescriptionDetails.createdAt,
        expiryDate: prescription.expiryDate
      }
    });
  } catch (error) {
    console.error('Verify Prescription Error:', error);
    res.status(500).json({ error: 'Failed to verify prescription.' });
  }
};

/**
 * Dispense prescription (Pharmacy only)
 * POST /prescriptions/dispense
 * LAB MARK: Controlled Substance Tracking
 */
const dispensePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ error: 'Prescription ID is required.' });
    }

    const prescription = await Prescription.findOne({ prescriptionId });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    if (prescription.status !== 'ACTIVE') {
      return res.status(400).json({ 
        error: `Cannot dispense. Prescription status is ${prescription.status}.` 
      });
    }

    if (prescription.isExpired()) {
      prescription.status = 'EXPIRED';
      await prescription.save();
      return res.status(400).json({ error: 'Prescription has expired.' });
    }

    // Update prescription status
    prescription.status = 'USED';
    prescription.dispensedBy = req.userId;
    prescription.dispensedAt = new Date();

    // Add audit log
    prescription.addAuditLog('DISPENSED', req.userId, 'pharmacy', 
      `Medicine dispensed. Controlled substance: ${prescription.isControlledSubstance}`, req.ip);

    await prescription.save();

    res.json({
      message: 'Prescription dispensed successfully.',
      prescription: {
        prescriptionId: prescription.prescriptionId,
        status: prescription.status,
        dispensedAt: prescription.dispensedAt,
        isControlledSubstance: prescription.isControlledSubstance
      }
    });
  } catch (error) {
    console.error('Dispense Prescription Error:', error);
    res.status(500).json({ error: 'Failed to dispense prescription.' });
  }
};

/**
 * Get patient's prescriptions
 * GET /prescriptions/my
 */
const getMyPrescriptions = async (req, res) => {
  try {
    let query = {};

    // Filter based on role
    if (req.userRole === 'patient') {
      query.patientId = req.userId;
    } else if (req.userRole === 'doctor') {
      query.doctorId = req.userId;
    } else if (req.userRole === 'pharmacy') {
      query.dispensedBy = req.userId;
    }

    const prescriptions = await Prescription.find(query)
      .populate('doctorId', 'name email')
      .populate('patientId', 'name email')
      .select('-encryptedData -aesKeyEncrypted -hash -digitalSignature -iv')
      .sort({ createdAt: -1 });

    res.json({ prescriptions });
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to get prescriptions.' });
  }
};

/**
 * Get all patients (for doctor to select)
 * GET /prescriptions/patients
 */
const getPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('_id name email');
    
    res.json({ patients });
  } catch (error) {
    console.error('Get Patients Error:', error);
    res.status(500).json({ error: 'Failed to get patients.' });
  }
};

module.exports = {
  createPrescription,
  verifyPrescription,
  dispensePrescription,
  getMyPrescriptions,
  getPatients
};

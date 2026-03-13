// ============================================
// DIGITAL SIGNATURE MODULE
// SHA-256 Hashing + RSA Signing
// LAB MARK: Digital Signatures - Integrity & Non-Repudiation
// ============================================

const crypto = require('crypto');

/**
 * Create SHA-256 hash of data
 * LAB MARK: Hashing for integrity verification
 * @param {string} data - Data to hash
 * @returns {string} - Hash (hex string)
 */
const createHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Sign data using private key
 * LAB MARK: Digital Signature for non-repudiation
 * @param {string} data - Data to sign
 * @param {string} privateKey - RSA private key (PEM format)
 * @returns {string} - Signature (base64)
 */
const signData = (data, privateKey) => {
  try {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  } catch (error) {
    throw new Error(`Signing failed: ${error.message}`);
  }
};

/**
 * Verify signature using public key
 * LAB MARK: Signature Verification
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify (base64)
 * @param {string} publicKey - RSA public key (PEM format)
 * @returns {boolean} - True if valid, false otherwise
 */
const verifySignature = (data, signature, publicKey) => {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Create signed hash (hash + signature)
 * @param {string} data - Data to hash and sign
 * @param {string} privateKey - RSA private key
 * @returns {object} - { hash, signature }
 */
const createSignedHash = (data, privateKey) => {
  const hash = createHash(data);
  const signature = signData(hash, privateKey);
  return { hash, signature };
};

/**
 * Verify signed hash
 * @param {string} data - Original data
 * @param {string} expectedHash - Expected hash
 * @param {string} signature - Signature to verify
 * @param {string} publicKey - RSA public key
 * @returns {object} - { isValid, hashMatch, signatureValid }
 */
const verifySignedHash = (data, expectedHash, signature, publicKey) => {
  const currentHash = createHash(data);
  const hashMatch = currentHash === expectedHash;
  const signatureValid = verifySignature(expectedHash, signature, publicKey);
  
  return {
    isValid: hashMatch && signatureValid,
    hashMatch,
    signatureValid
  };
};

module.exports = {
  createHash,
  signData,
  verifySignature,
  createSignedHash,
  verifySignedHash
};

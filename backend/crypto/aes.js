// ============================================
// AES ENCRYPTION MODULE
// AES-256-CBC Symmetric Encryption
// LAB MARK: Encryption - Confidentiality
// ============================================

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const KEY_LENGTH = 32; // 256 bits

// Generate a random AES key
const generateAESKey = () => {
  return crypto.randomBytes(KEY_LENGTH);
};

// Generate a random Initialization Vector
const generateIV = () => {
  return crypto.randomBytes(IV_LENGTH);
};

/**
 * Encrypt data using AES-256-CBC
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} key - AES key (32 bytes)
 * @returns {object} - { iv, encryptedData } (both as hex strings)
 */
const encrypt = (plaintext, key) => {
  try {
    const iv = generateIV();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  } catch (error) {
    throw new Error(`AES Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data using AES-256-CBC
 * @param {string} encryptedData - Encrypted data (hex string)
 * @param {Buffer} key - AES key (32 bytes)
 * @param {string} ivHex - Initialization Vector (hex string)
 * @returns {string} - Decrypted plaintext
 */
const decrypt = (encryptedData, key, ivHex) => {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`AES Decryption failed: ${error.message}`);
  }
};

module.exports = {
  generateAESKey,
  generateIV,
  encrypt,
  decrypt,
  ALGORITHM,
  KEY_LENGTH
};

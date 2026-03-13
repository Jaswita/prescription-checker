// ============================================
// RSA ENCRYPTION MODULE
// RSA Asymmetric Encryption for Key Exchange
// LAB MARK: Key Exchange Protocol
// ============================================

const crypto = require('crypto');

/**
 * Encrypt data using RSA Public Key
 * Used to encrypt AES keys for secure transmission
 * @param {string} data - Data to encrypt (typically AES key)
 * @param {string} publicKey - RSA public key (PEM format)
 * @returns {string} - Encrypted data (base64)
 */
const decryptWithPublicKey = (data, publicKey) => {
  try {
    const buffer = Buffer.from(data);
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return encrypted.toString('base64');
  } catch (error) {
    throw new Error(`RSA Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data using RSA Private Key
 * Used to decrypt AES keys
 * @param {string} encryptedData - Encrypted data (base64)
 * @param {string} privateKey - RSA private key (PEM format)
 * @returns {Buffer} - Decrypted data
 */
const encryptWithPrivateKey = (encryptedData, privateKey) => {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return decrypted;
  } catch (error) {
    throw new Error(`RSA Decryption failed: ${error.message}`);
  }
};

/**
 * Generate RSA Key Pair
 * @returns {object} - { publicKey, privateKey }
 */
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
};

module.exports = {
  decryptWithPublicKey,
  encryptWithPrivateKey,
  generateKeyPair
};

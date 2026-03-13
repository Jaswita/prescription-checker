// ============================================
// RSA KEY CONFIGURATION
// Key generation and management
// LAB MARK: Key Exchange Protocol
// ============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, '../keys');

// Generate RSA Key Pair
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: parseInt(process.env.RSA_KEY_SIZE) || 2048,
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

// Save keys to files (for persistent storage)
const saveKeys = (userId, publicKey, privateKey) => {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(KEYS_DIR, `${userId}_public.pem`), publicKey);
  fs.writeFileSync(path.join(KEYS_DIR, `${userId}_private.pem`), privateKey);
};

// Load keys from files
const loadKeys = (userId) => {
  try {
    const publicKey = fs.readFileSync(path.join(KEYS_DIR, `${userId}_public.pem`), 'utf8');
    const privateKey = fs.readFileSync(path.join(KEYS_DIR, `${userId}_private.pem`), 'utf8');
    return { publicKey, privateKey };
  } catch (error) {
    return null;
  }
};

module.exports = { generateKeyPair, saveKeys, loadKeys };

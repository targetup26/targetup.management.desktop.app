const Store = require('electron-store');
const crypto = require('crypto');
const os = require('os');

// Generate a device-specific encryption key
const getEncryptionKey = () => {
    const machineId = os.hostname() + os.platform() + os.arch();
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32);
};

// Initialize encrypted store
const store = new Store({
    name: 'secure-storage',
    encryptionKey: getEncryptionKey(),
    clearInvalidConfig: true
});

class SecureStorage {
    /**
     * Store a value securely
     * @param {string} key 
     * @param {any} value 
     */
    static set(key, value) {
        try {
            store.set(key, value);
            return true;
        } catch (error) {
            console.error('SecureStorage.set error:', error);
            return false;
        }
    }

    /**
     * Retrieve a value
     * @param {string} key 
     * @param {any} defaultValue 
     */
    static get(key, defaultValue = null) {
        try {
            return store.get(key, defaultValue);
        } catch (error) {
            console.error('SecureStorage.get error:', error);
            return defaultValue;
        }
    }

    /**
     * Remove a value
     * @param {string} key 
     */
    static remove(key) {
        try {
            store.delete(key);
            return true;
        } catch (error) {
            console.error('SecureStorage.remove error:', error);
            return false;
        }
    }

    /**
     * Clear all stored data
     */
    static clear() {
        try {
            store.clear();
            return true;
        } catch (error) {
            console.error('SecureStorage.clear error:', error);
            return false;
        }
    }

    /**
     * Check if a key exists
     * @param {string} key 
     */
    static has(key) {
        return store.has(key);
    }
}

module.exports = SecureStorage;

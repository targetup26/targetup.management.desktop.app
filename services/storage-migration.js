/**
 * Storage Migration Helper
 * Provides a drop-in replacement for localStorage/sessionStorage
 * Uses SecureStorage for encryption
 */
const SecureStorage = require('../services/secure-storage.service');

// Create a proxy object that mimics localStorage/sessionStorage API
const createStorageProxy = (prefix = '') => {
    return {
        setItem(key, value) {
            SecureStorage.set(prefix + key, value);
        },
        getItem(key) {
            return SecureStorage.get(prefix + key, null);
        },
        removeItem(key) {
            SecureStorage.remove(prefix + key);
        },
        clear() {
            // Note: This clears ALL secure storage, not just prefixed items
            SecureStorage.clear();
        },
        has(key) {
            return SecureStorage.has(prefix + key);
        }
    };
};

// Export storage proxies
module.exports = {
    secureLocalStorage: createStorageProxy('local_'),
    secureSessionStorage: createStorageProxy('session_')
};

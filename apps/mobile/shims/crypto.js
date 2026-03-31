// Shim for Node.js 'crypto' module in React Native
// The actual crypto.getRandomValues is provided by react-native-get-random-values polyfill
// This shim only exists so Metro doesn't crash on require('crypto')
module.exports = {
  randomBytes: function(size) {
    const bytes = new Uint8Array(size);
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    }
    return Buffer.from(bytes);
  },
};

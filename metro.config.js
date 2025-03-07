const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolution for react-dom
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    'react-dom': require.resolve('./react-dom-mock.js'),
  },
};

module.exports = config; 
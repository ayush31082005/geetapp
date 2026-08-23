const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to allow babel-plugin-react-native-web directory imports
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

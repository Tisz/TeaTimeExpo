// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = function packageExportsResolver(context, moduleImport, platform) {
  // Use the browser version of the package for React Native 
  if (moduleImport === '<package>' || moduleImport.startsWith('<package>/')) {
    return resolve(
      {
        ...context,
        unstable_conditionNames: ['browser'],
      },
      moduleImport,
      platform,
    );
  }

  // Fall back to normal resolution
  return resolve(context, moduleImport, platform);
};

module.exports = config;
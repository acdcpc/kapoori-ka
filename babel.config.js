module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // V5: react-native-worklets (SWMansion) replaces react-native-worklets-core (Margelo)
      'react-native-worklets/plugin',
    ],
  };
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 runs through react-native-worklets; its plugin must be last.
    plugins: ['react-native-worklets/plugin'],
  };
};

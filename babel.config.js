module.exports = function (api) {
  api.cache(true);
  
  // Check if we're running in test environment
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [] : [
      // Only include reanimated plugin when not testing
      'react-native-reanimated/plugin'
    ]
  };
};
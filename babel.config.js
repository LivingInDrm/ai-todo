module.exports = function (api) {
  api.cache(true);
  
  // Check if we're running in test environment
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@ui': './components/ui',
            '@lib': './lib'
          }
        }
      ],
      ...(isTest ? [] : ['react-native-reanimated/plugin'])
    ]
  };
};
module.exports = function (api) {
  api.cache(false);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: './.env', // 使用mobile目录下的.env文件
        blocklist: null,
        allowlist: null,
        safe: false,
        allowUndefined: true,
      }]
    ]
  };
};

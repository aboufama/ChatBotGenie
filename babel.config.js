module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: [
          'API_TOKEN',
          'SPACE_ID',
          'INSTANCE_URL',
          'WAREHOUSE_ID',
          'AZURE_CLIENT_ID',
          'AZURE_TENANT_ID',
          'REDIRECT_URI',
          'AZURE_SCOPES'
        ],
        safe: true,
        allowUndefined: false
      }],
      '@babel/plugin-transform-export-namespace-from',
      '@babel/plugin-transform-runtime'
    ]
  };
}; 
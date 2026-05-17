module.exports = {
  apps: [
    {
      name: 'lorawan-backend',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
};

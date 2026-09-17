module.exports = {
  apps: [
    {
      name: '69club-api',
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_file: '.env.production',
    },
  ],
}

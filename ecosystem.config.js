module.exports = {
  apps: [{
    name: "pavilion-app",
    script: "server.js",
    cwd: "/var/www/pavilion-app",
    instances: 1,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    log_file: "/var/log/pavilion-app.log",
    error_file: "/var/log/pavilion-app-error.log",
    out_file: "/var/log/pavilion-app-out.log",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    time: true
  }]
};

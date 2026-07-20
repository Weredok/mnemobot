module.exports = {
  apps: [{
    name: "mnemo",
    script: "./index.ts",
    interpreter: "node",
    interpreter_args: "--import tsx",
    watch: true,
    env: {
      stage: "prod"
    },
    env_dev: {
      stage: "dev"
    },
    env_canary: {
      stage: "canary"
    },
    error_file: "./logs/mnemo-error.log", // Сюда полетят все console.error и краши приложения
    out_file: "./logs/mnemo-out.log",     // Сюда полетят обычные console.log
    merge_logs: true,                     // Дописывать в тот же файл при перезапуске
    time: true,
  }]
}
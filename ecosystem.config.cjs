const path = require('path');

module.exports = {
  apps: [
    {
      name: "my-app",
      // Указываем папку, ГДЕ лежит package.json вашего сервиса
      cwd: path.resolve(__dirname, "./adapters/discord"),

      // Путь к файлу ОТНОСИТЕЛЬНО cwd
      script: "./startup.ts",

      // Явно говорим, что запускаем через node
      interpreter: "node",

      // Передаем лоадер именно сюда.
      // Для Node v18-v19 используйте --loader
      // Для Node v20+ лучше использовать --import (но loader часто тоже работает)
      node_args: "--loader ts-node/esm --no-warnings", 
      
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
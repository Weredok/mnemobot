import { config } from "dotenv";

switch (process.env.stage) {
  case "dev":
  case "canary":
  case "production":
   config({ path: `./enviroment/${process.env.stage}.env` });
    break;
  default:
    config({ path: `./enviroment/dev.env` });
    break;
};

console.log(process.env.version);

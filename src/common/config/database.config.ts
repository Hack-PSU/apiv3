import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { Knex } from "knex";

export const dbConfig = registerAs<Knex.StaticConnectionConfig>(
  ConfigToken.DB,
  () => {
    // Connect to the database via Unix socket if we are running on Cloud Run.
    if (process.env.RUNTIME_INSTANCE === "production" || process.env.RUNTIME_INSTANCE === "staging") {
      return {
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        socketPath: process.env.MYSQL_SOCKET_PATH,
      };
    } else {
      // Otherwise, we are running locally, so connect to database over the Cloud SQL Auth Proxy.
      return {
        host: process.env.MYSQL_HOST,
        password: process.env.MYSQL_PASSWORD,
        user: process.env.MYSQL_USER,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT,
      };
    }
  },
);

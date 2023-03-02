import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { Knex } from "knex";

export const dbConfig = registerAs<Knex.StaticConnectionConfig>(
  ConfigToken.DB,
  () => {
    console.log(
      "ENVIRONMENT ",
      process.env.NODE_ENV,
      process.env.MYSQL_SOCKET_PATH,
    );
    if (process.env.NODE_ENV === "production") {
      return {
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        socketPath: process.env.MYSQL_SOCKET_PATH,
      };
    } else {
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

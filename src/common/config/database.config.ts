import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";
import { Knex } from "knex";

export const dbConfig = registerAs<Knex.StaticConnectionConfig>(
  ConfigToken.DB,
  () => ({
    host: process.env.MYSQL_HOST,
    password: process.env.MYSQL_PASSWORD,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
  }),
);

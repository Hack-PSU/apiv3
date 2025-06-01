import type { Knex } from "knex";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  staging: {
    client: "mysql",
    connection: {
      database: "test",
      port: 3306,
      host: "127.0.0.1",
      user: "Kanishk",
      password: "Admission-2021!",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./db/migrations",
    },
  },

  production: {
    client: "mysql",
    connection: {
      database: "production",
      user: "apiv3_production",
      password: "",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./db/migrations",
    },
  },
};

module.exports = config;

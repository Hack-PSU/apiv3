import type { Knex } from "knex";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql",
    connection: {
      database: "",
      user: "root",
      password: "password",
      port: 3306,
      host: "localhost",
    },
    seeds: {
      directory: "./db/seeds",
    },
    migrations: {
      directory: "./db/migrations",
    },
  },

  staging: {
    client: "mysql",
    connection: {
      database: "staging",
      user: "apiv3_staging",
      host: "",
      password:"" ,
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

  test: {
    client: "mysql",
    connection: {
      database: "test",
      user: "apiv3_test",
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

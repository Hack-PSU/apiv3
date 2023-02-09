import type { Knex } from "knex";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql",
    connection: {
      database: "hackpsu-local",
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
      database: "hackpsu-staging",
      user: "root",
      password: "password",
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
      database: "hackpsu",
      user: "root",
      password: "password",
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

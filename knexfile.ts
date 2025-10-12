// knexfile.js
require('ts-node/register');
require('dotenv').config();

const {
  MYSQL_HOST = '127.0.0.1',
  MYSQL_PORT = '3307',
  MYSQL_DATABASE = 'test',
  MYSQL_USER = 'localtester',
  MYSQL_PASSWORD = '',
} = process.env;

const base = {
  client: 'mysql2',
  connection: {
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: 'knex_migrations',
    directory: './db/migrations',
    extension: 'ts',
  },
};

module.exports = {
  development: base,
  staging: base,
  production: base,
};

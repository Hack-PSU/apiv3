import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("scans", (table) => {
    table.bigInteger("timestamp").unsigned().nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("scans", (table) => {
    table.dropColumn("timestamp");
  });
}
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("locations", (table) => {
    table.integer("capacity").notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("locations", (table) => {
    table.dropColumn("capacity");
  });
}

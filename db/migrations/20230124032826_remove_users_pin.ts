import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (t) => {
    t.dropColumn("pin");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (t) => {
    t.text("pin").notNullable();
  });
}

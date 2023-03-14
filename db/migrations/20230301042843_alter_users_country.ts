import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (t) => {
    t.dropColumn("address");
    t.text("country").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (t) => {
    t.dropColumn("country");
    t.text("address").notNullable();
  });
}

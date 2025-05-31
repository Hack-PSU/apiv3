import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("organizers", (t) => {
    t.boolean("isActive").notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("organizers", (t) => {
    t.dropColumn("isActive");
  });
}

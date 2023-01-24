import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.enum("type", ["activity", "workshop", "food", "checkIn"])
      .alter()
      .notNullable()
      .defaultTo("activity");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.enum("type", ["activity", "workshop", "food"])
      .alter()
      .notNullable()
      .defaultTo("activity");
  });
}

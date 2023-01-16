import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.bigInteger("start_time").unsigned().notNullable().alter();
    t.bigInteger("end_time").unsigned().notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.integer("start_time").unsigned().notNullable().alter();
    t.integer("end_time").unsigned().notNullable().alter();
  });
}

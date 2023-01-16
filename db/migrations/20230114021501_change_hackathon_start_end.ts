import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("hackathons", (t) => {
    t.dropColumn("end_date");
    t.dropColumn("start_date");

    t.bigInteger("start_time").unsigned().notNullable();
    t.bigInteger("end_time").unsigned().notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("hackathons", (t) => {
    t.dropColumn("start_time");
    t.dropColumn("end_time");

    t.integer("start_date").unsigned().notNullable();
    t.integer("end_date").unsigned().notNullable();
  });
}

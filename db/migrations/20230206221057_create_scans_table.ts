import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("scans", (t) => {
    t.increments("id").primary().unsigned().notNullable();

    t.uuid("event_id").notNullable();
    t.foreign("event_id")
      .references("id")
      .inTable("events")
      .onUpdate("CASCADE");

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");

    t.uuid("user_id").notNullable();
    t.foreign("user_id").references("id").inTable("users").onUpdate("CASCADE");

    t.uuid("organizer_id").notNullable();
    t.foreign("organizer_id")
      .references("id")
      .inTable("organizers")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("scans");
}

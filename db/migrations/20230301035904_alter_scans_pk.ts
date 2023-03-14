import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("scans");

  return knex.schema.createTable("scans", (t) => {
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

    t.primary(["event_id", "user_id"]);

    t.uuid("organizer_id").notNullable();
    t.foreign("organizer_id")
      .references("id")
      .inTable("organizers")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("scans");

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

import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("events", (tableBuilder) => {
    tableBuilder.uuid("id").primary().notNullable();

    tableBuilder.integer("start_time").unsigned().notNullable();
    tableBuilder.integer("end_time").unsigned().notNullable();

    tableBuilder.text("name", "TEXT").notNullable();

    tableBuilder.text("description", "LONGTEXT").nullable();

    tableBuilder.integer("location_id").unsigned().nullable();
    tableBuilder
      .foreign("location_id")
      .references("id")
      .inTable("locations")
      .onUpdate("CASCADE");

    tableBuilder.uuid("hackathon_id").nullable();
    tableBuilder
      .foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");

    tableBuilder
      .enum("type", ["activity", "workshop", "food"])
      .notNullable()
      .defaultTo("activity");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("events");
}

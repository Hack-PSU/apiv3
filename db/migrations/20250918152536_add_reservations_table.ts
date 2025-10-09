import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("locations", (table) => {
    table.index("id");
  });

  await knex.schema.alterTable("teams", (table) => {
    table.index("id");
  });

  await knex.schema.createTable("reservations", (table) => {
    table.increments("id").primary().notNullable();
    table.bigInteger("start_time").unsigned().notNullable();

    table.bigInteger("end_time").unsigned().notNullable();

    table
      .integer("location_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("locations")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .uuid("team_id")
      .notNullable()
      .references("id")
      .inTable("teams")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.enu("reservation_type", ["participant", "admin"]).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("reservations");

  // Remove the index we added
  await knex.schema.alterTable("locations", (table) => {
    table.dropIndex("id");
  });
}

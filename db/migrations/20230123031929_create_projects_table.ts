import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("projects", (t) => {
    t.increments("id").primary().unsigned().notNullable();
    t.text("name").notNullable();

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("projects");
}

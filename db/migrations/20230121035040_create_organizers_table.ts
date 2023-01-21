import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("organizers", (t) => {
    t.uuid("id").primary().notNullable();

    t.text("email").notNullable();

    t.text("first_name", "TEXT").notNullable();
    t.text("last_name", "TEXT").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("organizers");
}

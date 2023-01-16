import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("locations", (tableBuilder) => {
    tableBuilder.increments("id").primary().unsigned().notNullable();
    tableBuilder.string("name").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("locations");
}

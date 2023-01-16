import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("hackathons", (tableBuilder) => {
    tableBuilder.uuid("id").primary().notNullable();
    tableBuilder.string("name").notNullable();
    tableBuilder.integer("start_date").unsigned().notNullable();
    tableBuilder.integer("end_date").unsigned().notNullable();
    tableBuilder.boolean("active").notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("hackathons");
}

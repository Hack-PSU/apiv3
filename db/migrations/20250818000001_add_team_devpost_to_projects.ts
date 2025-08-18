import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("projects", (table) => {
    table
      .uuid("team_id")
      .nullable()
      .references("id")
      .inTable("teams")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.string("devpost_link").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("team_id");
    table.dropColumn("devpost_link");
  });
}
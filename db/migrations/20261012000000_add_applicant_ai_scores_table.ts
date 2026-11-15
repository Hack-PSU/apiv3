import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("applicant_ai_scores", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("status", 16).notNullable();
    table.float("score");
    table.tinyint("effort_score");
    table.tinyint("motivation_score");
    table.tinyint("project_score");
    table.tinyint("initiative_score");
    table.text("summary");
    table.string("model");
    table.string("prompt_version").notNullable();
    table.text("error");
    table.integer("attempts").unsigned().notNullable().defaultTo(0);
    table.bigInteger("scored_at").unsigned();
    table.bigInteger("updated_at").unsigned().notNullable();
    table.primary(["hackathon_id", "user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("applicant_ai_scores");
}

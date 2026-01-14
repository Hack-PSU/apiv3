import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Update registrations table
  await knex.schema.alterTable("registrations", (table) => {
    table
      .enum("review_status", ["pending_review", "in_review", "graded"])
      .defaultTo("pending_review")
      .notNullable();
    table.enum("grade", ["top", "middle", "bottom"]).nullable();
    table.string("graded_by").nullable();
  });

  // Create registration_reviews table
  await knex.schema.createTable("registration_reviews", (table) => {
    table.increments("id").primary();
    table.integer("registration_id").unsigned().notNullable(); 
    table.string("reviewer_id").notNullable();
    table.enum("grade", ["top", "middle", "bottom"]).notNullable();
    table.text("review_notes").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // Create reviewer_stats table
  await knex.schema.createTable("reviewer_stats", (table) => {
    table.string("reviewer_id").primary();
    table.integer("total_reviewed").defaultTo(0).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("reviewer_stats");
  await knex.schema.dropTableIfExists("registration_reviews");
  await knex.schema.alterTable("registrations", (table) => {
    table.dropColumn("review_status");
    table.dropColumn("grade");
    table.dropColumn("graded_by");
  });
}
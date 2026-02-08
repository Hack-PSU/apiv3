import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("applicant_scores", (table) => {
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
        table
            .float("mu")
            .notNullable();
        table
            .float("sigma_squared")
            .notNullable();
        table.boolean("prioritized")
            .notNullable()
            .defaultTo(false);
        table.primary(["hackathon_id", "user_id"]);
        });
        
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("applicant_scores");
}


import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("challenges", (table) => {
        table.increments("id").unsigned().primary();
        table
            .uuid("hackathon_id")
            .notNullable()
            .references("id")
            .inTable("hackathons")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.string("name", 255).notNullable();
        table.text("description", "longtext").notNullable();
        table.string("first_prize", 255).nullable();
        table.string("second_prize", 255).nullable();
        table.string("third_prize", 255).nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("challenges");
}

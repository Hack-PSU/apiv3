import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("projects", (table) => {
        table.string("github_link").nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("projects", (table) => {
        table.dropColumn("github_link");
    });
}


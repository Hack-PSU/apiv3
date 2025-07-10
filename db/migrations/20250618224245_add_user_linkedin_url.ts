import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('users', (t) => {
        t.string('linkedin_url', 255).nullable().defaultTo(null);
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('users', (t) => {
        t.dropColumn('linkedin_url');
    });
}


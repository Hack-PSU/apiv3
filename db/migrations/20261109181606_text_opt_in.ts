import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("registrations", (table) => {
        table.boolean("text_opt_in").notNullable().defaultTo(false);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("registrations", (table) => {
        table.dropColumn("text_opt_in");
    });
}


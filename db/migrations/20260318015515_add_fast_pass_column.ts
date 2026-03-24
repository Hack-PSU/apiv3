import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.table("events", (table) => {
        table.boolean("fast_pass").notNullable().defaultTo(false);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.table("events", (table) => {
        table.dropColumn("fast_pass");
    });
}


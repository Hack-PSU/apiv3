import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.table("finances", (table) => {
        table.boolean("reminder_sent").defaultTo(false);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.table("finances", (table) => {
        table.dropColumn("reminder_sent");
    });
}


import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.table("registrations", (table) => {
        table.boolean("three_day_reminder_sent").defaultTo(false);
        table.boolean("one_day_reminder_sent").defaultTo(false);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.table("registrations", (table) => {
        table.dropColumn("three_day_reminder_sent");
        table.dropColumn("one_day_reminder_sent");
    });
}


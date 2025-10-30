import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("reservations", (table) => {
        table.uuid("team_id").nullable().alter();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("reservations", (table) => {
        table.uuid("team_id").notNullable().alter();
    });
}


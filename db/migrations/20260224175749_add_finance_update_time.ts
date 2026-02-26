import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.table("finances", (table) => {
        table.bigInteger("updated_at").nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.table("finances", (table) => {
        table.dropColumn("updated_at");
    });
}


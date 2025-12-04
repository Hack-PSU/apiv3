import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("registrations", (table) => {
        table.string("excitement").nullable();
        table.string("zip_code").nullable();
        table.integer("travel_cost").nullable();
        table.string("travel_method").nullable();
        table.string("travel_additional").nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("registrations", (table) => {
        table.dropColumn("excitement");
        table.dropColumn("zip_code");
        table.dropColumn("travel_cost");
        table.dropColumn("travel_method");
        table.dropColumn("travel_additional");
    });
}


import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("extra_credit_classes", (table) => {
        table.enum("requirement", ["check-in", "submit", "expo", "other"]).nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("extra_credit_classes", (table) => {
        table.dropColumn("requirement");
    });
}


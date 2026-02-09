import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // Add the column with a temporary default to populate existing rows
    await knex.schema.alterTable("sponsors", (table) => {
        table.enum("sponsor_type", ["sponsor", "partner"]).notNullable().defaultTo("sponsor");
    });

    // Remove the default constraint so new entries must be explicitly specified
    await knex.raw(`ALTER TABLE sponsors ALTER COLUMN sponsor_type DROP DEFAULT`);
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("sponsors", (table) => {
        table.dropColumn("sponsor_type");
    });
}

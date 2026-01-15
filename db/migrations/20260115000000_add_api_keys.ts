import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("api_keys", (table) => {
        table.uuid("id").primary().defaultTo(knex.fn.uuid());
        table.string("name").unique().notNullable();
        table.string("value_hash").notNullable();
        table.string("prefix").notNullable();
        table.timestamp("last_used_at").nullable();
        table.timestamp("revoked_at").nullable();
        table.timestamp("created_at").defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists("api_keys");
}

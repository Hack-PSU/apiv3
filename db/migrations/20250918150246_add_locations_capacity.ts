import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable("locations", (t) => {
    t.integer("capacity").defaultTo(0).notNullable();
  });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable("locations", (t) => {
      t.dropColumn("capacity");
    });
}


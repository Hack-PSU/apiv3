import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("extra_credit_classes", (t) => {
    t.increments("id").primary().unsigned().notNullable();
    t.text("name", "TEXT").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("extra_credit_classes");
}

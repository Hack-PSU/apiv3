import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("extra_credit_assignments", (t) => {
    t.increments("id").primary().unsigned().notNullable();

    t.uuid("user_id").notNullable();
    t.foreign("user_id").references("id").inTable("users").onUpdate("CASCADE");

    t.integer("class_id").unsigned().notNullable();
    t.foreign("class_id")
      .references("id")
      .inTable("extra_credit_classes")
      .onUpdate("CASCADE");

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("extra_credit_assignments");
}

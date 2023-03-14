import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("extra_credit_classes", (t) => {
    t.uuid("hackathon_id").nullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");
  });

  await knex("extra_credit_classes").update(
    "hackathon_id",
    "86473fb47a8c473f8727ffe091a3d64a",
  );

  return knex.schema.alterTable("extra_credit_classes", (t) => {
    t.uuid("hackathon_id").notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("extra_credit_classes", (t) => {
    t.dropColumn("hackathon_id");
  });
}

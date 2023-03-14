import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("extra_credit_assignments");
  await knex.schema.dropTableIfExists("scans");
  await knex.schema.dropTableIfExists("users");

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().notNullable();

    t.text("first_name", "TEXT").notNullable();
    t.text("last_name", "TEXT").notNullable();

    t.enum("gender", [
      "male",
      "female",
      "non-binary",
      "no-disclose",
    ]).notNullable();

    t.enum("shirt_size", ["XS", "S", "M", "L", "XL", "XXL"]).notNullable();

    t.string("dietary_restriction").nullable();
    t.string("allergies").nullable();

    t.text("university").notNullable();
    t.text("email").notNullable();

    t.text("major").notNullable();
    t.string("phone").notNullable();
    t.text("country").notNullable();

    t.string("race").nullable();
    t.text("resume").nullable();
  });

  await knex.schema.createTable("extra_credit_assignments", (t) => {
    t.uuid("user_id").notNullable();
    t.foreign("user_id").references("id").inTable("users").onUpdate("CASCADE");

    t.integer("class_id").unsigned().notNullable();
    t.foreign("class_id")
      .references("id")
      .inTable("extra_credit_classes")
      .onUpdate("CASCADE");

    t.primary(["user_id", "class_id"]);
  });

  return knex.schema.createTable("scans", (t) => {
    t.uuid("event_id").notNullable();
    t.foreign("event_id")
      .references("id")
      .inTable("events")
      .onUpdate("CASCADE");

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");

    t.uuid("user_id").notNullable();
    t.foreign("user_id").references("id").inTable("users").onUpdate("CASCADE");

    t.primary(["event_id", "user_id"]);

    t.uuid("organizer_id").notNullable();
    t.foreign("organizer_id")
      .references("id")
      .inTable("organizers")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("extra_credit_assignments");
  await knex.schema.dropTableIfExists("scans");
  return knex.schema.dropTableIfExists("users");
}

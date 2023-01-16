import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (t) => {
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

    t.boolean("travel_reimbursement").notNullable();
    t.boolean("driving").notNullable();
    t.boolean("first_hackathon").notNullable();

    t.text("university").notNullable();
    t.text("email").notNullable();

    t.enum("academic_year", [
      "freshman",
      "sophomore",
      "junior",
      "senior",
      "graduate",
      "other",
    ]).notNullable();
    t.enum("educational_institution_type", [
      "less-than-secondary",
      "secondary",
      "two-year-university",
      "three-plus-year-university",
      "graduate-university",
      "code-school-or-bootcamp",
      "vocational-trade-apprenticeship",
      "other",
      "not-a-student",
      "prefer-no-answer",
    ]).notNullable();

    t.text("major").notNullable();
    t.string("phone").notNullable();
    t.text("address").notNullable();

    t.string("race").nullable();
    t.text("resume").nullable();

    t.enum("coding_experience", [
      "none",
      "beginner",
      "intermediate",
      "advanced",
    ]).nullable();

    t.boolean("eighteen_before_event").notNullable();

    t.boolean("mlh_coc").notNullable();
    t.boolean("mlh_dcp").notNullable();

    t.text("referral").nullable();
    t.text("project").nullable();

    t.text("expectations").nullable();

    t.boolean("share_address_mlh").nullable();
    t.boolean("share_address_sponsors").nullable();
    t.boolean("share_email_mlh").nullable();

    t.text("pin").notNullable();

    t.enum("veteran", ["true", "false", "no-disclose"]).notNullable();

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");

    t.bigInteger("time").unsigned().notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("users");
}

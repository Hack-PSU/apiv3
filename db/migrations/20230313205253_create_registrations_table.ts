import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("registrations", (t) => {
    t.increments("id").primary().unsigned().notNullable();

    t.boolean("travel_reimbursement").notNullable();
    t.boolean("driving").notNullable();
    t.boolean("first_hackathon").notNullable();

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

    t.enum("veteran", ["true", "false", "no-disclose"]).notNullable();

    t.bigInteger("time").unsigned().notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {}

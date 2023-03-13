import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (t) => {
    t.dropColumn("driving");
    t.dropColumn("first_hackathon");

    t.dropColumn("academic_year");

    t.dropColumn("educational_institution_type");

    t.dropColumn("coding_experience");

    t.dropColumn("eighteen_before_event");

    t.dropColumn("mlh_coc");
    t.dropColumn("mlh_dcp");

    t.dropColumn("referral");
    t.dropColumn("project");

    t.dropColumn("expectations");

    t.dropColumn("share_address_mlh");
    t.dropColumn("share_address_sponsors");
    t.dropColumn("share_email_mlh");

    t.dropColumn("veteran");

    t.dropColumn("time");
  });
}

export async function down(knex: Knex): Promise<void> {}

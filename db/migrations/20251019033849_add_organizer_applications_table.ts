import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("organizer_applications", (table) => {
    table.increments("id").unsigned().primary().notNullable();

    // Basic Information
    table.string("name").notNullable();
    table.string("email").notNullable();

    // Year and Major
    table
      .enum("year_standing", [
        "Freshman",
        "Sophomore",
        "Junior",
        "Senior",
        "Other",
      ])
      .notNullable();
    table.string("major").notNullable();

    // Team Preferences
    table
      .enum("first_choice_team", [
        "Communications",
        "Design",
        "Education",
        "Entertainment",
        "Finance",
        "Logistics",
        "Marketing",
        "Sponsorship",
        "Technology",
      ])
      .notNullable();
    table
      .enum("second_choice_team", [
        "Communications",
        "Design",
        "Education",
        "Entertainment",
        "Finance",
        "Logistics",
        "Marketing",
        "Sponsorship",
        "Technology",
      ])
      .notNullable();

    // Resume (stored in Firebase, this stores the path/URL)
    table.string("resume_url").notNullable();

    // Application Questions
    table.text("why_hackpsu", "longtext").notNullable();
    table.text("new_idea", "longtext").notNullable();
    table.text("what_excites_you", "longtext").notNullable();

    // Application Status for each team preference
    table
      .enum("first_choice_status", ["pending", "accepted", "rejected"])
      .notNullable()
      .defaultTo("pending");
    table
      .enum("second_choice_status", ["pending", "accepted", "rejected"])
      .notNullable()
      .defaultTo("pending");

    // Final assigned team (set when either first or second choice accepts)
    table
      .enum("assigned_team", [
        "Communications",
        "Design",
        "Education",
        "Entertainment",
        "Finance",
        "Logistics",
        "Marketing",
        "Sponsorship",
        "Technology",
      ])
      .nullable();

    // Timestamps
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    // Indexes for efficient querying
    table.index("email");
    table.index("first_choice_status");
    table.index("second_choice_status");
    table.index("first_choice_team");
    table.index("second_choice_team");
    table.index("assigned_team");
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("organizer_applications");
}


import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create hackathons table (independent)
  await knex.schema.createTable("hackathons", (table) => {
    table.uuid("id").primary();
    table.string("name").notNullable();
    table.bigInteger("start_time").unsigned().notNullable();
    table.bigInteger("end_time").unsigned().notNullable();
    table.boolean("active").notNullable().defaultTo(false);
  });

  // 2. Create locations table (independent)
  await knex.schema.createTable("locations", (table) => {
    table.increments("id").unsigned().notNullable().primary();
    table.string("name").notNullable();
  });

  // 3. Create organizers table (independent)
  await knex.schema.createTable("organizers", (table) => {
    table.uuid("id").primary().notNullable();
    table.string("first_name").notNullable();
    table.string("last_name").notNullable();
    table.string("email").notNullable();
    table.string("team"); // nullable by default
    table.string("award");
    table.string("judging_location");
  });

  // 4. Create users table (independent)
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().notNullable();
    table.string("first_name").notNullable();
    table.string("last_name").notNullable();
    table
      .enum("gender", ["male", "female", "non-binary", "no-disclose"])
      .notNullable();
    table.enum("shirt_size", ["XS", "S", "M", "L", "XL", "XXL"]).notNullable();
    table.text("dietary_restriction", "longtext");
    table.string("allergies");
    table.string("university").notNullable();
    table.string("email").notNullable();
    table.string("major").notNullable();
    table.string("phone").notNullable();
    table.string("country").notNullable();
    table.string("race");
    table.text("resume", "longtext");
  });

  // 5. Create events table
  await knex.schema.createTable("events", (table) => {
    table.uuid("id").primary().notNullable();
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name").notNullable();
    table
      .enum("type", ["activity", "workshop", "food", "checkIn"])
      .notNullable()
      .defaultTo("activity");
    table.text("description", "longtext");
    table
      .integer("location_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("locations")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table.string("icon");
    table.bigInteger("start_time").unsigned().notNullable();
    table.bigInteger("end_time").unsigned().notNullable();
    table.string("ws_presenter_names");
    table.string("ws_relevant_skills");
    table.string("ws_skill_level");
    table.string("ws_urls");
  });

  // 6. Create extra_credit_classes table
  await knex.schema.createTable("extra_credit_classes", (table) => {
    table.increments("id").unsigned().notNullable().primary();
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name").notNullable();
  });

  // 7. Create projects table
  await knex.schema.createTable("projects", (table) => {
    table.increments("id").unsigned().primary();
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name").notNullable();
    table.string("categories");
  });

  // 8. Create finances table
  await knex.schema.createTable("finances", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("id").primary();
    table.decimal("amount", 10, 2).notNullable();
    table.string("status").notNullable();
    table.string("submitter_type").notNullable();
    table.string("submitter_id").notNullable();
    table.string("receipt_url").notNullable();
    table.text("description", "longtext").notNullable();
    table.string("category").notNullable();
    table.bigInteger("created_at").unsigned().notNullable();
    table.string("updated_by");
    table.string("street").notNullable();
    table.string("city").notNullable();
    table.string("state").notNullable();
    table.string("postal_code").notNullable();
  });

  // 9. Create registrations table
  await knex.schema.createTable("registrations", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.integer("id").unsigned().defaultTo(1).notNullable();
    table.boolean("travel_reimbursement").notNullable().defaultTo(false);
    table.boolean("driving").notNullable().defaultTo(false);
    table.boolean("first_hackathon").notNullable().defaultTo(false);
    table
      .enum("academic_year", [
        "freshman",
        "sophomore",
        "junior",
        "senior",
        "graduate",
        "other",
      ])
      .notNullable();
    table
      .enum("educational_institution_type", [
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
      ])
      .notNullable();
    table
      .enum("coding_experience", [
        "none",
        "beginner",
        "intermediate",
        "advanced",
      ])
      .nullable();
    table.integer("age").notNullable();
    table.boolean("mlh_coc").notNullable();
    table.boolean("mlh_dcp").notNullable();
    table.text("referral", "longtext");
    table.text("project", "longtext");
    table.text("expectations", "longtext");
    table.boolean("share_address_mlh").notNullable().defaultTo(false);
    table.boolean("share_address_sponsors").notNullable().defaultTo(false);
    table.boolean("share_email_mlh").notNullable().defaultTo(false);
    table
      .enum("veteran", ["yes", "no", "no-disclose", "true", "false"])
      .notNullable();
    table.bigInteger("time").unsigned().notNullable();
  });

  // 10. Create sponsors table
  await knex.schema.createTable("sponsors", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.increments("id").unsigned().primary();
    table.string("name").notNullable();
    table.string("level");
    table.string("link");
    table.string("dark_logo");
    table.string("light_logo");
    table.integer("order").notNullable().defaultTo(1000);
  });

  // 11. Create extra_credit_assignments join table
  await knex.schema.createTable("extra_credit_assignments", (table) => {
    table.uuid("user_id").notNullable();
    table.integer("class_id").unsigned().notNullable();
    table.primary(["user_id", "class_id"]);
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("class_id")
      .references("id")
      .inTable("extra_credit_classes")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
  });

  // 12. Create scans table (composite key on event_id and user_id)
  await knex.schema.createTable("scans", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.uuid("event_id").notNullable();
    table.uuid("user_id").notNullable();
    table.uuid("organizer_id").notNullable();
    table.primary(["event_id", "user_id"]);
    table
      .foreign("event_id")
      .references("id")
      .inTable("events")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("organizer_id")
      .references("id")
      .inTable("organizers")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
  });

  // 13. Create scores table (composite key on judge_id and project_id)
  await knex.schema.createTable("scores", (table) => {
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .uuid("judge_id")
      .notNullable()
      .references("id")
      .inTable("organizers")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.primary(["judge_id", "project_id"]);
    table.integer("creativity").notNullable().defaultTo(-1);
    table.integer("technical").notNullable().defaultTo(-1);
    table.integer("implementation").notNullable().defaultTo(-1);
    table.integer("clarity").notNullable().defaultTo(-1);
    table.integer("growth").notNullable().defaultTo(-1);
    table.integer("challenge1");
    table.integer("challenge2");
    table.integer("challenge3");
    table.boolean("submitted").notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to avoid foreign key violations.
  await knex.schema.dropTableIfExists("scores");
  await knex.schema.dropTableIfExists("scans");
  await knex.schema.dropTableIfExists("extra_credit_assignments");
  await knex.schema.dropTableIfExists("sponsors");
  await knex.schema.dropTableIfExists("registrations");
  await knex.schema.dropTableIfExists("finances");
  await knex.schema.dropTableIfExists("projects");
  await knex.schema.dropTableIfExists("extra_credit_classes");
  await knex.schema.dropTableIfExists("events");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("organizers");
  await knex.schema.dropTableIfExists("locations");
  await knex.schema.dropTableIfExists("hackathons");
}

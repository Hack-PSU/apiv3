import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Add booking-related columns to locations table
  await knex.schema.alterTable("locations", (table) => {
    table
      .uuid("hackathon_id")
      .nullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.boolean("is_bookable").notNullable().defaultTo(false);
    table.integer("team_capacity").notNullable().defaultTo(1);
    table.integer("min_reservation_mins").notNullable().defaultTo(30);
    table.integer("max_reservation_mins").notNullable().defaultTo(120);
    table.integer("buffer_mins").notNullable().defaultTo(0);

    table.index(["hackathon_id"]);
  });

  // 2. Create team_roster table
  await knex.schema.createTable("team_roster", (table) => {
    table.uuid("id").primary().notNullable();
    table.string("team_id", 26).notNullable();
    table.string("team_name", 80).notNullable();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.enum("role", ["lead", "member"]).notNullable();
    table.bigInteger("joined_at").unsigned().notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.unique(["user_id", "hackathon_id"]); // One team per user per hackathon
    table.unique(["team_id", "user_id"]); // Safety
    table.index(["team_id"]);
    table.index(["hackathon_id"]);
    table.index(["role"]);
  });

  // 3. Create reservations table
  await knex.schema.createTable("reservations", (table) => {
    table.uuid("id").primary().notNullable();
    table
      .integer("location_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("locations")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("team_id", 26).nullable();
    table.enum("type", ["team", "blackout"]).notNullable().defaultTo("team");
    table.bigInteger("start_time").unsigned().notNullable();
    table.bigInteger("end_time").unsigned().notNullable();
    table
      .enum("status", ["confirmed", "canceled"])
      .notNullable()
      .defaultTo("confirmed");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.bigInteger("created_at").unsigned().notNullable();
    table.bigInteger("canceled_at").unsigned().nullable();
    table.string("cancel_reason", 255).nullable();
    table
      .uuid("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.index(["location_id", "start_time"]);
    table.index(["team_id", "start_time"]);
    table.index(["hackathon_id"]);
    table.index(["status"]);
    table.index(["type"]);
  });

  // 4. Create reservation_audit table
  await knex.schema.createTable("reservation_audit", (table) => {
    table.uuid("id").primary().notNullable();
    table
      .uuid("reservation_id")
      .notNullable()
      .references("id")
      .inTable("reservations")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .uuid("actor_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .enum("action", ["create", "cancel", "update", "auto_cancel"])
      .notNullable();
    table.json("meta").nullable();
    table.bigInteger("created_at").unsigned().notNullable();

    table.index(["reservation_id"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to avoid foreign key violations
  await knex.schema.dropTableIfExists("reservation_audit");
  await knex.schema.dropTableIfExists("reservations");
  await knex.schema.dropTableIfExists("team_roster");

  // Remove columns from locations table
  await knex.schema.alterTable("locations", (table) => {
    table.dropColumn("hackathon_id");
    table.dropColumn("is_bookable");
    table.dropColumn("team_capacity");
    table.dropColumn("min_reservation_mins");
    table.dropColumn("max_reservation_mins");
    table.dropColumn("buffer_mins");
  });
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("team_roster", (table) => {
    table.uuid("id").primary().notNullable(); // UUID

    table
      .string("hackathon_id")
      .notNullable()
      .references("id")
      .inTable("hackathons")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.uuid("team_id").notNullable(); // UUID identifier for the team
    table.string("team_name", 80).notNullable(); // Team name (duplicated across rows)

    table
      .string("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.enu("role", ["lead", "member"]).notNullable();

    table.bigInteger("joined_at").unsigned().notNullable();
    table.bigInteger("updated_at").unsigned().notNullable();

    // Constraints
    table.unique(
      ["hackathon_id", "user_id"],
      "team_roster_hackathon_user_unique",
    ); // One team per user per hackathon
    table.unique(
      ["hackathon_id", "team_id", "user_id"],
      "team_roster_hackathon_team_user_unique",
    ); // No duplicate row in same team

    // Indexes
    table.index(
      ["hackathon_id", "team_id"],
      "team_roster_hackathon_team_index",
    );
    table.index(
      ["hackathon_id", "team_name"],
      "team_roster_hackathon_name_index",
    );
    table.index(["user_id"], "team_roster_user_index");
    table.index(["team_id"], "team_roster_team_index");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("team_roster");
}

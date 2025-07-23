import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("inventory_categories", (table) => {
    table.increments("id").unsigned().primary();
    table.string("name", 255).notNullable();
    table.text("description").nullable();
  });

  await knex.schema.createTable("inventory_items", (table) => {
    table.string("id", 36).primary().notNullable(); // UUID char(36)
    table
      .integer("category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_categories")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.string("name", 255).nullable(); // optional override
    table.string("asset_tag", 255).nullable();
    table.string("serial_number", 255).nullable();

    table
      .enu("status", ["active", "checked_out", "lost", "disposed", "archived"])
      .notNullable()
      .defaultTo("active");

    table
      .integer("holder_location_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table
      .string("holder_organizer_id", 36)
      .nullable()
      .references("id")
      .inTable("organizers")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.text("notes").nullable();

    table.bigInteger("created_at").unsigned().notNullable();
    table.bigInteger("updated_at").unsigned().notNullable();

    table.index(["category_id"]);
    table.index(["holder_location_id"]);
    table.index(["holder_organizer_id"]);
    table.index(["status"]);
  });

  await knex.schema.createTable("inventory_movements", (table) => {
    table.string("id", 36).primary().notNullable(); // UUID char(36)

    table
      .string("item_id", 36)
      .notNullable()
      .references("id")
      .inTable("inventory_items")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // FROM
    table
      .integer("from_location_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .string("from_organizer_id", 36)
      .nullable()
      .references("id")
      .inTable("organizers")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // TO
    table
      .integer("to_location_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .string("to_organizer_id", 36)
      .nullable()
      .references("id")
      .inTable("organizers")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table
      .enu("reason", [
        "checkout",
        "return",
        "transfer",
        "lost",
        "disposed",
        "repair",
        "other",
      ])
      .notNullable();

    table.text("notes").nullable();

    table
      .string("moved_by_organizer_id", 36)
      .notNullable()
      .references("id")
      .inTable("organizers")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.bigInteger("created_at").unsigned().notNullable();

    table.index(["item_id"]);
    table.index(["from_location_id"]);
    table.index(["to_location_id"]);
    table.index(["from_organizer_id"]);
    table.index(["to_organizer_id"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("inventory_movements");
  await knex.schema.dropTableIfExists("inventory_items");
  await knex.schema.dropTableIfExists("inventory_categories");
}

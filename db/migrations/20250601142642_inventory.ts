import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Assume "users" table exists with "id" TEXT PRIMARY KEY
  // Assume "locations" table exists with "id" INTEGER PRIMARY KEY
  await knex.schema.dropTableIfExists("inventory_history");
  await knex.schema.dropTableIfExists("products");

  // Create "products" table (snake_case columns)
  await knex.schema.createTable("products", (table) => {
    table.string("id").primary(); // For CUIDs
    table.string("name").notNullable();
    table.string("description");
    table.string("photo_url");
    table.string("category");
    table.text("notes", "longtext");
    table.integer("quantity").notNullable().defaultTo(0);

    table.string("user_id"); // FK → users.id (TEXT)
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.integer("location_id").unsigned(); // FK → locations.id (INTEGER)
    table
      .foreign("location_id")
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.timestamp("created_at", { useTz: false }).notNullable();
    table.timestamp("updated_at", { useTz: false }).notNullable();
  });

  // Create "inventory_history" table (snake_case columns)
  await knex.schema.createTable("inventory_history", (table) => {
    table.string("id").primary(); // For CUIDs

    table.string("product_id").notNullable();
    table
      .foreign("product_id")
      .references("id")
      .inTable("products")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .enum("inventory_event_type", [
        "ADD",
        "REMOVE",
        "CHECKOUT",
        "RETURN",
        "TRANSFER",
        "OTHER",
      ])
      .notNullable();

    table.integer("quantity_changed").notNullable();

    table.string("from_user_id"); // FK → users.id (TEXT)
    table
      .foreign("from_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.bigInteger("timestamp").unsigned().notNullable();

    table.string("to_user_id"); // FK → users.id (TEXT)
    table
      .foreign("to_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.integer("from_location_id").unsigned(); // FK → locations.id (INTEGER)
    table
      .foreign("from_location_id")
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.integer("to_location_id").unsigned(); // FK → locations.id (INTEGER)
    table
      .foreign("to_location_id")
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    table.text("notes", "longtext");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("inventory_history");
  await knex.schema.dropTableIfExists("products");
  // "users" and "locations" are untouched, as assumed to pre-exist.
}

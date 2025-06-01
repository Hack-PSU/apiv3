import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create InventoryEventType enum for PostgreSQL
  await knex.raw(`
    CREATE TYPE "InventoryEventType" AS ENUM (
      'ADD',
      'REMOVE',
      'CHECKOUT',
      'RETURN',
      'TRANSFER',
      'OTHER'
    );
  `);

  // Assume "users" table exists with "id" TEXT PRIMARY KEY
  // Assume "locations" table exists with "id" INTEGER PRIMARY KEY

  // Create Product table
  await knex.schema.createTable('products', function(table) {
    table.text('id').primary(); // For CUIDs
    table.text('name').notNullable();
    table.text('description');
    table.text('photoUrl');
    table.text('category');
    table.text('notes');
    table.integer('quantity').notNullable().defaultTo(0);

    table.text('userId'); // Foreign key to users.id (TEXT)
    table.foreign('userId').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');

    table.integer('locationId'); // Foreign key to locations.id (INTEGER)
    table.foreign('locationId').references('id').inTable('locations').onDelete('SET NULL').onUpdate('CASCADE');

    table.timestamp('createdAt', { useTz: false }).notNullable();
    table.timestamp('updatedAt', { useTz: false }).notNullable();
  });

  // Create InventoryHistory table
  await knex.schema.createTable('inventory_history', function(table) {
    table.text('id').primary(); // For CUIDs

    table.text('productId').notNullable();
    table.foreign('productId').references('id').inTable('products').onDelete('CASCADE').onUpdate('CASCADE');

    table.specificType('eventType', '"InventoryEventType"').notNullable(); // PostgreSQL specific for enum

    table.integer('quantityChanged').notNullable();

    table.text('fromUserId'); // Foreign key to users.id (TEXT)
    table.foreign('fromUserId').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');

    table.text('toUserId'); // Foreign key to users.id (TEXT)
    table.foreign('toUserId').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');

    table.integer('fromLocationId'); // Foreign key to locations.id (INTEGER)
    table.foreign('fromLocationId').references('id').inTable('locations').onDelete('SET NULL').onUpdate('CASCADE');

    table.integer('toLocationId'); // Foreign key to locations.id (INTEGER)
    table.foreign('toLocationId').references('id').inTable('locations').onDelete('SET NULL').onUpdate('CASCADE');

    table.text('notes');
    table.timestamp('timestamp', { useTz: false }).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_history');
  await knex.schema.dropTableIfExists('products');
  await knex.raw('DROP TYPE IF EXISTS "InventoryEventType";');
  // "users" and "locations" tables are not touched as they are assumed to pre-exist.
}

import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable("registrations", (table) => {
        table
            .enum("application_status", ["pending", "accepted", "rejected", "waitlisted", "confirmed", "declined"])
            .notNullable()
            .defaultTo("pending");
        table
            .bigInteger("accepted_at")
            .nullable();
        table
            .bigInteger("rsvp_deadline")
            .nullable();
        table
            .bigInteger("rsvp_at")
            .nullable();
        table
            .uuid("accepted_by")
            .nullable()
            .references("id")
            .inTable("users")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable("registrations", (table) => {
        table.dropColumn("application_status");
        table.dropColumn("accepted_at");
        table.dropColumn("rsvp_deadline");
        table.dropColumn("rsvp_at");
        table.dropColumn("accepted_by");
    });
}


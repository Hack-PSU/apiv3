import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("bug_reports", (table) => {
        table.uuid("id").primary().notNullable();
        
        table.string("title").notNullable();

        table.text("description").nullable();

        table
            .enu("severity", ["low", "medium", "high"])
            .notNullable();

        table
            .enu("status", ["unseen", "in progress", "resolved"])
            .notNullable()
            .defaultTo("unseen");
        

        table.bigInteger("date_reported").unsigned().notNullable();
        table.bigInteger("date_updated").unsigned().notNullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("bug_reports");
}


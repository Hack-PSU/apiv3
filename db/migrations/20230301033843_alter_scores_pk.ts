import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("scores");

  return knex.schema.createTable("scores", (t) => {
    t.integer("creativity").nullable().defaultTo(-1);
    t.integer("technical").nullable().defaultTo(-1);
    t.integer("implementation").nullable().defaultTo(-1);
    t.integer("clarity").nullable().defaultTo(-1);
    t.integer("growth").nullable().defaultTo(-1);
    t.integer("energy").nullable().defaultTo(-1);
    t.integer("supply_chain").nullable().defaultTo(-1);
    t.integer("environmental").nullable().defaultTo(-1);

    t.boolean("submitted").notNullable().defaultTo(false);

    t.integer("project_id").unsigned().notNullable();
    t.foreign("project_id")
      .references("id")
      .inTable("projects")
      .onUpdate("CASCADE");

    t.primary(["project_id", "judge_id"]);

    t.uuid("judge_id").notNullable();
    t.foreign("judge_id")
      .references("id")
      .inTable("organizers")
      .onUpdate("CASCADE");

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("scores");

  return knex.schema.createTable("scores", (t) => {
    t.increments("id").primary().unsigned().notNullable();

    t.integer("creativity").nullable().defaultTo(-1);
    t.integer("technical").nullable().defaultTo(-1);
    t.integer("implementation").nullable().defaultTo(-1);
    t.integer("clarity").nullable().defaultTo(-1);
    t.integer("growth").nullable().defaultTo(-1);
    t.integer("energy").nullable().defaultTo(-1);
    t.integer("supply_chain").nullable().defaultTo(-1);
    t.integer("environmental").nullable().defaultTo(-1);

    t.boolean("submitted").notNullable().defaultTo(false);

    t.integer("project_id").unsigned().notNullable();
    t.foreign("project_id")
      .references("id")
      .inTable("projects")
      .onUpdate("CASCADE");

    t.uuid("judge_id").notNullable();
    t.foreign("judge_id")
      .references("id")
      .inTable("organizers")
      .onUpdate("CASCADE");

    t.uuid("hackathon_id").notNullable();
    t.foreign("hackathon_id")
      .references("id")
      .inTable("hackathons")
      .onUpdate("CASCADE");
  });
}

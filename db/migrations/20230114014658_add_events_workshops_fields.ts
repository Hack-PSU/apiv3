import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.text("icon").nullable();
    t.text("ws_presenter_names").nullable();
    t.text("ws_relevant_skills").nullable();
    t.string("ws_skill_level").nullable();
    t.text("ws_urls").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("events", (t) => {
    t.dropColumn("icon");
    t.dropColumn("ws_presenter_names");
    t.dropColumn("ws_relevant_skills");
    t.dropColumn("ws_skill_level");
    t.dropColumn("ws_urls");
  });
}

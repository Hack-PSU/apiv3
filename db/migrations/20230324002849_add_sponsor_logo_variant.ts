import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("sponsors", (t) => {
    t.renameColumn("logo", "lightLogo");
    t.text("darkLogo").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("sponsors", (t) => {
    t.renameColumn("lightLogo", "logo");
    t.dropColumn("darkLogo");
  });
}

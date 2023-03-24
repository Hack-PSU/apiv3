import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("sponsors", (t) => {
    t.renameColumn("logo", "light_logo");
    t.text("dark_logo").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("sponsors", (t) => {
    t.renameColumn("light_logo", "logo");
    t.dropColumn("dark_logo");
  });
}

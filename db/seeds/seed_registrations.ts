import { Knex } from "knex";
import * as registrations from "./registrations.json";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("registrations").del();

  // Inserts seed entries
  await knex("registrations").insert(registrations);
}

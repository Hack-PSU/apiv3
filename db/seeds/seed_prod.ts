// import { Knex } from "knex";
// import * as registrations from "../local/prod/registrations.json";
// import * as organizers from "../local/prod/organizers.json";
// import * as events from "../local/prod/events.json";
// import * as locations from "../local/prod/locations.json";
// import * as hackathons from "../local/prod/hackathons.json";
// import * as users from "../local/prod/users.json";
// import * as assignments from "./extra_credit_assignments.json";
// import * as classes from "./extra_credit_classes.json";
// import * as projects from "./projects.json";
// import * as scores from "./scores.json";
// import * as sponsors from "../local/prod/sponsors.json";
//
// // 86473fb47a8c473f8727ffe091a3d64a
//
// export async function seed(knex: Knex): Promise<void> {
//   // Deletes ALL existing entries
//   await knex("extra_credit_assignments").del();
//   await knex("extra_credit_classes").del();
//
//   await knex("scores").del();
//   await knex("projects").del();
//
//   await knex("scans").del();
//   await knex("organizers").del();
//
//   await knex("events").del();
//
//   await knex("registrations").del();
//   await knex("users").del();
//
//   await knex("locations").del();
//
//   await knex("sponsors").del();
//
//   await knex("hackathons").del();
//
//   // Inserts seed entries
//   await knex("hackathons").insert(hackathons);
//   await knex("sponsors").insert(sponsors);
//   await knex("locations").insert(locations);
//   await knex("users").insert(users);
//   await knex("registrations").insert(registrations);
//   await knex("events").insert(events);
//   await knex("organizers").insert(organizers);
//   await knex("projects").insert(projects);
//   await knex("scores").insert(scores);
//   await knex("extra_credit_classes").insert(classes);
//   await knex("extra_credit_assignments").insert(assignments);
// }

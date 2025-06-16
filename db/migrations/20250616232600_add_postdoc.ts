import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('registrations', (t) => {
        t.dropColumn('educational_institution_type');
}).then(() => {
        return knex.schema.alterTable('registrations', (t) => {
            t.enum("educational_institution_type", [
                "less-than-secondary",
                "secondary",
                "two-year-university",
                "three-plus-year-university",
                "graduate-university",
                "code-school-or-bootcamp",
                "vocational-trade-apprenticeship",
                "postdoc",
                "other",
                "not-a-student",
                "prefer-no-answer",
              ])
              .notNullable();
        });
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('registrations', (t) => {
        t.dropColumn('educational_institution_type');
    }).then(() => {
        return knex.schema.alterTable('registrations', (t) => {
            t.enum("educational_institution_type", [
                "less-than-secondary",
                "secondary",
                "two-year-university",
                "three-plus-year-university",
                "graduate-university",
                "code-school-or-bootcamp",
                "vocational-trade-apprenticeship",
                "other",
                "not-a-student",
                "prefer-no-answer",
              ])
              .notNullable();
        });
    });
}
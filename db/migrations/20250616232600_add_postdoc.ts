import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE registrations 
        MODIFY COLUMN educational_institution_type 
        ENUM("less-than-secondary", "secondary", "two-year-university", "three-plus-year-university", "graduate-university", 
        "post-doctorate", "code-school-or-bootcamp", "vocational-trade-apprenticeship", "other", "not-a-student", 
        "prefer-no-answer"
)
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE registrations 
        MODIFY COLUMN educational_institution_type 
        ENUM("less-than-secondary", "secondary", "two-year-university", "three-plus-year-university", "graduate-university", 
        "code-school-or-bootcamp", "vocational-trade-apprenticeship", "other", "not-a-student", 
        "prefer-no-answer"
)
    `);
}
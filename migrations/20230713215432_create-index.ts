import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('daily_download', table => {
    table.index(['package_id', 'date'])
  })
  await knex.schema.alterTable('maintainer', table => {
    table.unique(['name', 'email'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('maintainer', table => {
    table.dropUnique(['name', 'email'])
  })
  await knex.schema.alterTable('daily_download', table => {
    table.dropIndex(['package_id', 'date'])
  })
}

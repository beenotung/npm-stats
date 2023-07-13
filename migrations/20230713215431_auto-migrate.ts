import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {

  if (!(await knex.schema.hasTable('user'))) {
    await knex.schema.createTable('user', table => {
      table.increments('id')
      table.text('username').notNullable().unique()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('package'))) {
    await knex.schema.createTable('package', table => {
      table.increments('id')
      table.text('name').notNullable().unique()
      table.integer('create_time').notNullable()
      table.integer('modify_time').notNullable()
      table.text('description').notNullable()
      table.text('readme').notNullable()
      table.integer('author_id').unsigned().nullable().references('user.id')
      table.text('license').notNullable()
      table.text('homepage').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('keyword'))) {
    await knex.schema.createTable('keyword', table => {
      table.increments('id')
      table.text('keyword').notNullable().unique()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('package_keyword'))) {
    await knex.schema.createTable('package_keyword', table => {
      table.increments('id')
      table.integer('package_id').unsigned().notNullable().references('package.id')
      table.integer('keyword_id').unsigned().notNullable().references('keyword.id')
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('daily_download'))) {
    await knex.schema.createTable('daily_download', table => {
      table.increments('id')
      table.integer('package_id').unsigned().notNullable().references('package.id')
      table.text('date').notNullable()
      table.integer('count').notNullable()
      table.integer('invalid_time').nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('maintainer'))) {
    await knex.schema.createTable('maintainer', table => {
      table.increments('id')
      table.text('name').notNullable()
      table.text('email').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('package_maintainer'))) {
    await knex.schema.createTable('package_maintainer', table => {
      table.increments('id')
      table.integer('package_id').unsigned().notNullable().references('package.id')
      table.integer('maintainer_id').unsigned().notNullable().references('maintainer.id')
      table.timestamps(false, true)
    })
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('package_maintainer')
  await knex.schema.dropTableIfExists('maintainer')
  await knex.schema.dropTableIfExists('daily_download')
  await knex.schema.dropTableIfExists('package_keyword')
  await knex.schema.dropTableIfExists('keyword')
  await knex.schema.dropTableIfExists('package')
  await knex.schema.dropTableIfExists('user')
}

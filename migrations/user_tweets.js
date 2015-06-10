exports.up = function (knex,promise) {
	return knex.schema.createTable('tweets', function(table) {
		table.increments('tweet_id').primary();
		table.string('tweets');
		table.string('username').references('username').inTable('users');
		table.dateTime('posted_at');
	});
};

exports.down = function (knex, promise) {
	return knex.schema.dropTable('tweets');
};
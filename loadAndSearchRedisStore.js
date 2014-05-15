/*
autocomplte module to accompany autocomplete.js

loads an array of data into redis store

searches redis store with query, limiting results returned
search checks the cache first, if value/cache key is not set
it will run the load function before searching
*/

var autocomplete = require('./autocomplete.js')
var redisClient = require('redis');

//create redis client
redisClient = redis.createClient();
// tries will be stored under the "trie:" prefix.
var prefix = "trie:";

module.exports = function() {

	//load an array of data into redis, associated with a key
	var loadIntoRedis = function(data, prefix, callback) {
		var auto = autocomplete();

		//load words into redis, limiting number of concurrent operations
		var running = 0;
		var limit = 100;

		function loadWords() {
			while(running < limit && data.length > 0) {
				var word = data.shift();
				auto.addWordToRedis(word, redisClient, key, function(result) {
					running--;
					if(data.length > 0) {
						loadWords();
					} else if(running == 0) {
							callback(null, data);
					}
				});
				running++;
			}
		}
		loadWords();
	}

	//search for a value in redis autocomplete store
	var searchRedisAutoStore = function(opts, callback, refresherFunc, data) {

		var auto = autocomplete()
		, query = opts.query
		, limit = opts.limit
		, key = opts.key
		, cacheExpire = opts.cacheExpire;

		//check redis client for cached key value pair
		//if it doesn't exist pass control to load function
		redisClient.zrange(key, 0, -1, function(err, value){
			if (value.length > 0) {
				auto.searchInRedis(query, limit, redisClient, key, function(err, resp) {
					callback(err, resp);
				});
			} else {
				refresherFunc(data, key, function(err, resp) {
					//otherwise set the cache time and load
					redisClient.multi([
					["expire", key, cacheExpire]
					]).exec(function (err, replies) {
						console.log('data service cache set ', key);
						searchRedisAutoStore(opts, callback);
					});
				})
		 	}
		});

	return {
		loadIntoRedis : loadIntoRedis,
		searchRedisAutoStore : searchRedisAutoStore
	}

};
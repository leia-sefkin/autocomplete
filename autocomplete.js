/*
Autocomplete module had the following options: 

add words to a redis data store incrementally
e.g. 'word' is loaded as 'w', 'wo', 'wor', 'word', and finally 'word*'

search for words in a store by key, with limit to how many values are returned:
e.g. 'wo', limit 20 will return the first 20 words starting with 'wo'

forked from https://gist.github.com/cwholt/1854283
*/

module.exports = function() {

  //add a word to the redis store associated with a unique key
  var addWordToRedis = function(word, prefix, redisClient, callback) {

    //split the word and add as incremental letters
    var letters = word.split("");
    var word_length = letters.length;
    addToRedis(letters, prefix, false, 0);

    function addToRedis(letters, key, last, x) {
      var letter = last ? "*" : letters[x];
      var score = last ? 0 : letter.charCodeAt(0);

      redisClient.zadd(key, score, letter, function(reply) {
        ++x;
        if (x < word_length) {
          addToRedis(letters, key+letter, false, x);
        } else if (x == word_length) {
          addToRedis(letters, key+letter, true, x);
        } else if(typeof(callback) == 'function'){
          callback();
        }
      })
    }
  }

  //search for a value by key in the RedisClient
  var searchInRedis = function(query, key, redisClient, limit, callback) {
    var more = 1;
    var suggestions = [];
      
    function findInRedis(query) {
      var key = prefix+query; 
      //get all the values located that key
      redisClient.zrange(key, 0, -1, function(err, reply) {
        more--;
        //iterate over to only return full value
        reply.forEach(function(partial) {
          if (partial == '*') { 
            suggestions.push(query);
          } else if (suggestions.length < limit) {
            more++;
            findInRedis(query + partial);
          }
        })
        if (more <= 0) {
          callback(null, suggestions);
        } 
      })
      
      findInRedis(query);
    }
  }

  return{
    addWordToRedis : addWordToRedis,
    searchInRedis : searchInRedis
  }

};
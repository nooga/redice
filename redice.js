var redis = require('redis')
  , shortid = require('shortid')
  ;

var SEPARATOR = '/';

function extend(base, add) {
  var ret = Object.create(base);
  for(var k in add) {
    if(!add.hasOwnProperty(k)) continue;
    ret[k] = add[k];
  }
  return ret;
}

var commands = ('DEL DUMP EXISTS EXPIRE EXPIREAT KEYS MIGRATE MOVE OBJECT PERSIST PEXPIRE PEXPIREAT '+
               'PTTL RENAME RENAMENX RESTORE SORT TTL TYPE SCAN APPEND BITCOUNT BITOP BITPOS DECR DECRBY '+ 
               'GET GETBIT GETRANGE GETSET INCR INCRBY INCRBYFLOAT MGET MSET MSETNX PSETEX SET SETBIT '+
               'SETEX SETNX SETRANGE STRLEN HDEL HEXISTS HGET HGETALL HINCRBY HINCRBYFLOAT HKEYS HLEN '+
               'HMGET HMSET HSET HSETNX HVALS HSCAN BLPOP BRPOP BRPOPLPUSH LINDEX LINSERT LLEN LPOP LPUSH '+ 
               'LPUSHX LRANGE LREM LSET LTRIM RPOP RPOPLPUSH RPUSH RPUSHX SADD SCARD SDIFF SDIFFSTORE '+
               'SINTER SINTERSTORE SISMEMBER SMEMBERS SMOVE SPOP SRANDMEMBER SREM SUNION SUNIONSTORE SSCAN '+
               'ZADD ZCARD ZCOUNT ZINCRBY ZINTERSTORE ZLEXCOUNT ZRANGE ZRANGEBYLEX ZREVRANGEBYLEX ZRANGEBYSCORE '+
               'ZRANK ZREM ZREMRANGEBYLEX ZREMRANGEBYRANK ZREMRANGEBYSCORE ZREVRANGE ZREVRANGEBYSCORE ZREVRANK '+
               'ZSCORE ZUNIONSTORE ZSCAN PFADD PFCOUNT PFMERGE').split(' ');

var ModelBase = { 
  key: function() {
    var args = Array.prototype.slice.call(arguments);
    if(args.length === 0 || !args[0]) return this.namespace + SEPARATOR + this.id + SEPARATOR;
    if(Array.isArray(args[0])) return this.key.apply(this, args[0]);
    return [this.namespace, this.id].concat(args).join(SEPARATOR);
  },

  fields: function(cb) {
    this.client.keys(this.key('*'), function(err, ks) {
      if(err) cb(err);
      cb(null, ks.map(function(k) {
        return k.split(SEPARATOR).slice(2).join(SEPARATOR);
      }).filter(function(k) {
        //console.log(k);
        return k != '';
      }));
    });
  },

  kill: function(cb) {
    var that = this;
    this.client.keys(this.key('*'), function(err, ks) {
      if(err) cb(err);
      that.client.del(ks, cb);
    });
  },

  touch: function(cb) {
    this.client.set(this.key(), 1);
  }
};

commands.forEach(function(command) {
  ModelBase[command] = function() {
    var args = Array.prototype.slice.call(arguments);
    if(typeof args[0] !== 'function') {
      args[0] = this.key(args[0]);
    }
    this.client[command].apply(this.client, args);
  };
});

function Model(name, def) {

  var Surrogate = function(client, id) {
    this.namespace = name;
    this.client = client;
    this.id = id;
    this.touch();
  };

  Surrogate.prototype = extend(ModelBase, def);

  return function(client) {
    var boundModel = function(id) {
      if(!id) id = shortid.generate();
      return new Surrogate(client, id);
    };

    boundModel.list = function(cb) {
      client.keys(name + SEPARATOR + '*' + SEPARATOR, function(err, res) {
        if(err) cb(err);
        cb(null, res.map(function(v) {
          return v.split(SEPARATOR)[1];
        }));
      });
    };

    boundModel.deleteAll = function(cb) {
      client.keys(name + SEPARATOR + '*', function(err, res) {
        if(err) cb(err);
        client.del(res, cb);
      });
    };

    return boundModel;
  };

}

module.exports = {
  createClient: redis.createClient.bind(redis),
  model: Model,
  redis: redis
};
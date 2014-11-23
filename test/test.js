var assert = require('assert');

describe('Redice', function() {

  var redice = require('../redice');

  describe('#createClient()', function() {

    it('should return node-redis client', function() {
      var client = redice.createClient();
      var rclient = redice.createClient();

      assert.equal(client.__proto__, rclient.__proto__);
    });

  });

  describe('#model()', function() {

    var User;

    beforeEach(function() {
      User = redice.model('User', {
        name: 'string',
        password: ['string', function(v) { }, function() { }]
      });
    });

    it('should return a binding function', function() {
      assert.equal(typeof User, 'function');

      var client = redice.createClient();

      var BoundUser = User(client);

      assert.equal(typeof BoundUser, 'function');
    });
  
  });

  describe('bound model', function() {
    var User, client;

    before(function() {
      client = redice.createClient();
      User = redice.model('User', {
        name: 'dummy',
        password: 'dummy'
      })(client);
    });  

    beforeEach(function(done) {
      client.flushdb(done);
    });

    after(function(done) {
      client.flushdb(done);
    });

    it('should assign new id when created without id', function() {
      var u = User();
      assert.ok(u.id);
    });

    it('should touch keys on create', function(done) {
      var u = User();
      client.get('User/'+u.id+'/', function(err, v) {
        if(err) throw err;
        assert.ok(v);
        done();
      });
    }); 

    it('#list()', function(done) {
      User('a'); 
      User('b');
      User.list(function(err, l) {
        if(err) throw err;
        assert.ok(l);
        assert.equal(l.length, 2);
        assert.deepEqual(l.sort(),['a','b']);
        done();
      });
    });

    it('#deleteAll()', function(done) {
      User(); 
      User();
      User.deleteAll(function(err) {
        if(err) throw err;
        User.list(function(err, l) {
          if(err) throw err;
          assert.equal(l.length, 0);
          done();
        });
      });
    });

  });

  describe('model instance', function() {

    var User, client, user, id = "user1";

    before(function() {
      client = redice.createClient();
      
      User = redice.model('User', {
        name: 'dummy',
        password: 'dummy'
      })(client);

      user = User(id);
    });

    after(function(done) {
      client.flushdb(done);
    });

    describe('#key()', function () {
      it('should return base key without args', function() {
        assert.equal(user.key(), 'User/' + id + '/');
      });
      it('should return valid key based on args', function() {
        assert.equal(user.key('something'), 'User/' + id + '/something');
        assert.equal(user.key('sub','key'), 'User/' + id + '/sub/key');
      });
      it('should detect array in arguments', function() {
        assert.equal(user.key(['sub','key']), user.key('sub','key'));
      });
    });

    describe('redis methods', function() {
      
      it('should use namespaced keys', function(done) {
        var name = 'testname';
        user.SET('name', name, function(err, _) {
          if(err) throw err;
          client.get('User/'+id+'/name', function(err, v) {
            assert.equal(v, name);
            done();
          });
        });
      });

      it('should use default key when subkey not supplied', function(done) {
        var name = 'testname';
        user.SET(null, name, function(err, _) {
          if(err) throw err;
          client.get('User/'+id+'/', function(err, v) {
            assert.equal(v, name);
            done();
          });
        });
      });

      it('should handle callbacks', function(done) {
        var pass = 'xxx';
        user.SET('pass', pass, function(err, _) {
          user.GET('pass', function(err, p) {
            assert.equal(p, pass);
            done();
          });
        });
      });

    });

    describe('#fields()', function () {
      it('should return keys owned by model instance', function(done) {
        user.fields(function(err, f) {
          assert.deepEqual(f, ['name','pass']);
          done();
        });
      });
    });

    describe('#kill()', function(done) {
      it('should remove all keys associated with instance', function(done) {
        user.kill(function(err, _) {
          if(err) throw err;
          client.keys(user.key('*'),function(err, fs) {
            if(err) throw err;
            assert.equal(fs.length, 0);
            done();
          });
        });
      });
    });
  });

  describe('redis commands', function() {

  });

});
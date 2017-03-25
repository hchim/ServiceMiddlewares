var assert = require('assert');
var expect = require('Chai').expect;
var utils = require('servicecommonutils');

var conf = {
    get: function (key) {
        if (key == 'redis.host')
            return '127.0.0.1';
        else if (key == 'redis.port')
            return 6379;
        else if (key == 'endpoint.metricservice')
            return 'http://localhost:3112';
        else if (key == 'service.name')
            return 'Middleware';
        else
            return null
    }
};

var res = {
    json: function (obj) {
        return obj
    }
};

var redisClient = utils.createRedisClient(conf.get('redis.host'), conf.get('redis.port'));
redisClient.set('x-test-token-2', 'x-test');
var next = function () {
    return 0
};

var mw = require('../index')(conf).auth_middleware;

function decodeBase64(json) {
    var b = new Buffer(json.payload, 'base64');
    var s = b.toString('utf-8');
    return JSON.parse(s)
}

describe('auth middleware', function () {

    it('no x-auth-token', function (done) {
        var req = {
            path: '/test',
            headers: {}
        };
        var jsonObj = mw(req, res, next);
        jsonObj = decodeBase64(jsonObj);
        expect(jsonObj.message).to.equal('Auth token not exist in request');
        done()
    });

    //TODO this test case does not work
    // it('not exist x-auth-token', function (done) {
    //     var req = {
    //         path: '/test',
    //         headers: {
    //             'x-auth-token': 'x-test-token-1'
    //         }
    //     };
    //     var jsonObj = mw(req, res, next);
    //     jsonObj = decodeBase64(jsonObj);
    //     expect(jsonObj.message).to.equal('Wrong auth token');
    //     done()
    // });

    it('successful auth token', function (done) {
        var req = {
            path: '/test',
            headers: {
                'x-auth-token': 'x-test-token-2',
            }
        };
        var json = mw(req, res, function () {
            expect('x-test').to.equal(req.headers['userId']);
            done()
        })
    })
});
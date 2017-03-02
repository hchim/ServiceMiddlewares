var assert = require('assert');
var expect = require('Chai').expect;

var conf = {
    get: function (key) {
        if (key == 'redis.host')
            return '127.0.0.1'
        else if (key == 'redis.port')
            return 6379
        else
            return null
    }
}

var res = {
    json: function (obj) {
        return obj
    }
}

var next = function () {return 0}

var mw = require('../index')(conf).signature_middleware

describe('signature middleware', function () {

    it('internal request', function (done) {
        var req = {
            headers: {
                'is-internal-request': 'YES'
            }
        }
        var json = mw(req, res, function () {
            done()
        })
    })

    it('no x-auth-digest', function (done) {
        var req = {
            headers: {}
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Request not signed correctly.');
        done()
    })

    it('no x-auth-time', function (done) {
        var req = {
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            }
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Request not signed correctly.');
        done()
    })

    it('no x-auth-app', function (done) {
        var req = {
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': 'xxxxxxxxx'
            }
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Request not signed correctly.');
        done()
    })

    it('invalid request time', function (done) {
        var req = {
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': '2017-03-02T08:01:48Z',
                'x-auth-app': 'SleepAiden'
            }
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Request expired.');
        done()
    })

    it('invalid request time', function (done) {
        var req = {
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'xxxxx'
            }
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Invalid app name.');
        done()
    })

    it('invalid signature', function (done) {
        var req = {
            method: 'POST',
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            body: {
                payload: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            },
            is: function (type) {
                return false
            }
        }
        var json = mw(req, res, next)
        expect(json.message).to.equal('Invalid signature.');
        done()
    })

    it('valid signature', function (done) {
        var body = {
            username: "username",
            password: "password"
        }
        var req = {
            method: 'POST',
            path: '/test',
            headers: {
                'x-auth-digest': '60b71edc59b734b8b37385f51b07e733',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            body: {
                payload: new Buffer(JSON.stringify(body)).toString('base64')
            },
            is: function (type) {
                return false
            }
        }
        var json = mw(req, res, function () {
            expect(body.username).to.equal(req.body.username)
            done()
        })
    })

    it('valid signature for get', function (done) {
        var req = {
            method: 'GET',
            path: '/test',
            headers: {
                'x-auth-digest': '1d98d6ead3033b8b610f8ff4f31ede53',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            is: function (type) {
                return false
            }
        }
        var json = mw(req, res, function () {
            done()
        })
    })
})
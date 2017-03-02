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

    it('invalid signature', function (done) {
        var req = {
            method: 'POST',
            path: '/test',
            headers: {
                'x-auth-digest': '11d188cc7de1f54a2764d5429d108cf0',
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
        var json = mw(req, res, function () {
            done()
        })
    })
})
'use strict';

var _index = require('../index');

var _SignatureMiddlewareHelper = require('../SignatureMiddlewareHelper');

var _metricsclient = require('metricsclient');

var _metricsclient2 = _interopRequireDefault(_metricsclient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var assert = require('assert');
var expect = require('Chai').expect;
var conf = {
    get: function get(key) {
        if (key === 'redis.host') return '127.0.0.1';else if (key === 'redis.port') return 6379;else if (key === 'endpoint.metricservice') return 'http://localhost:3112';else if (key === 'service.name') return 'Middleware';else return null;
    }
};
var metricClient = new _metricsclient2.default(conf);
var res = {
    json: function json(obj) {
        return obj;
    }
};

var next = function next() {
    return 0;
};

var mw = _index.SignatureMiddlewareCreator.create(metricClient, conf);

function decodeBase64(json) {
    var b = new Buffer(json.payload, 'base64');
    var s = b.toString('utf-8');
    return JSON.parse(s);
}

describe('signature middleware', function () {

    it('internal request', function (done) {
        var req = {
            path: '/test',
            headers: {
                'is-internal-request': 'YES'
            }
        };
        mw(req, res, function () {
            done();
        });
    });

    it('no x-auth-digest', function (done) {
        var req = {
            path: '/test',
            headers: {}
        };
        var jsonObj = mw(req, res, next);
        jsonObj = decodeBase64(jsonObj);
        expect(jsonObj.message).to.equal('Request not signed correctly.');
        done();
    });

    it('no x-auth-time', function (done) {
        var req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            }
        };
        var json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Request not signed correctly.');
        done();
    });

    it('no x-auth-app', function (done) {
        var req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': 'xxxxxxxxx'
            }
        };
        var json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Request not signed correctly.');
        done();
    });

    // it('invalid request time', function (done) {
    //     const req = {
    //         path: '/test',
    //         headers: {
    //             'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    //             'x-auth-time': '2017-03-02T08:01:48Z',
    //             'x-auth-app': 'SleepAiden'
    //         }
    //     };
    //     let json = mw(req, res, next);
    //     json = decodeBase64(json);
    //     expect(json.message).to.equal('Request expired.');
    //     done()
    // });

    it('invalid request time', function (done) {
        var req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'xxxxx'
            }
        };
        var json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Invalid app name.');
        done();
    });

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
            is: function is(type) {
                return false;
            }
        };
        var json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Invalid signature.');
        done();
    });

    it('valid signature', function (done) {
        var body = {
            username: "username",
            password: "password"
        };
        var req = {
            method: 'POST',
            path: '/test',
            headers: {
                'x-auth-digest': '03670d6a074b8a192b6d0696aab5f172',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            body: {
                payload: new Buffer(JSON.stringify(body)).toString('base64')
            },
            is: function is(type) {
                return false;
            }
        };
        var appConfs = (0, _SignatureMiddlewareHelper.appConfigs)();
        req.headers['x-auth-digest'] = (0, _SignatureMiddlewareHelper.requestSignature)(req, appConfs['SleepAiden'].key);
        mw(req, res, function () {
            expect(body.username).to.equal(req.body.username);
            done();
        });
    });

    it('valid signature for get', function (done) {
        var req = {
            method: 'GET',
            path: '/test',
            headers: {
                'x-auth-digest': 'd209d7b07c284c62ce1e7fecfe1ed9bf',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            is: function is(type) {
                return false;
            }
        };
        var appConfs = (0, _SignatureMiddlewareHelper.appConfigs)();
        req.headers['x-auth-digest'] = (0, _SignatureMiddlewareHelper.requestSignature)(req, appConfs['SleepAiden'].key);
        mw(req, res, function () {
            done();
        });
    });
});
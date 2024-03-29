import {SignatureMiddlewareCreator} from '../index';
import {appConfigs, requestSignature} from '../SignatureMiddlewareHelper';
import MetricServiceClient from 'metricsclient';

const assert = require('assert');
const expect = require('Chai').expect;
const conf = {
    get: function (key) {
        if (key === 'redis.host')
            return '127.0.0.1';
        else if (key === 'redis.port')
            return 6379;
        else if (key === 'endpoint.metricservice')
            return 'http://localhost:3112';
        else if (key === 'service.name')
            return 'Middleware';
        else
            return null
    }
};
const metricClient = new MetricServiceClient(conf);
const res = {
    json: function (obj) {
        return obj
    }
};

const next = function () {return 0};

const mw = SignatureMiddlewareCreator.create(metricClient, conf);

function decodeBase64(json) {
    const b = new Buffer(json.payload, 'base64');
    const s = b.toString('utf-8');
    return JSON.parse(s);
}

describe('signature middleware', function () {

    it('internal request', function (done) {
        const req = {
            path: '/test',
            headers: {
                'is-internal-request': 'YES'
            }
        };
        mw(req, res, function () {
            done()
        })
    });

    it('no x-auth-digest', function (done) {
        const req = {
            path: '/test',
            headers: {}
        };
        let jsonObj = mw(req, res, next);
        jsonObj = decodeBase64(jsonObj);
        expect(jsonObj.message).to.equal('Request not signed correctly.');
        done()
    });

    it('no x-auth-time', function (done) {
        const req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            }
        };
        let json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Request not signed correctly.');
        done()
    });

    it('no x-auth-app', function (done) {
        const req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': 'xxxxxxxxx'
            }
        };
        let json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Request not signed correctly.');
        done()
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
        const req = {
            path: '/test',
            headers: {
                'x-auth-digest': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'xxxxx'
            }
        };
        let json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Invalid app name.');
        done()
    });

    it('invalid signature', function (done) {
        const req = {
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
        };
        let json = mw(req, res, next);
        json = decodeBase64(json);
        expect(json.message).to.equal('Invalid signature.');
        done()
    });

    it('valid signature', function (done) {
        const body = {
            username: "username",
            password: "password"
        };
        const req = {
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
            is: function (type) {
                return false
            }
        };
        const appConfs = appConfigs();
        req.headers['x-auth-digest'] = requestSignature(req, appConfs['SleepAiden'].key);
        mw(req, res, function () {
            expect(body.username).to.equal(req.body.username);
            done()
        })
    });

    it('valid signature for get', function (done) {
        const req = {
            method: 'GET',
            path: '/test',
            headers: {
                'x-auth-digest': 'd209d7b07c284c62ce1e7fecfe1ed9bf',
                'x-auth-time': new Date().toISOString(),
                'x-auth-app': 'SleepAiden',
                'x-auth-version': 'xxxxx'
            },
            is: function (type) {
                return false
            }
        };
        const appConfs = appConfigs();
        req.headers['x-auth-digest'] = requestSignature(req, appConfs['SleepAiden'].key);
        mw(req, res, function () {
            done()
        })
    })
});
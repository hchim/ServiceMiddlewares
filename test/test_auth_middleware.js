import {AuthMiddlewareCreator} from '../index';
import MetricServiceClient from 'metricsclient';

const assert = require('assert');
const expect = require('Chai').expect;
const utils = require('servicecommonutils');
const conf = {
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
            return null;
    }
};
const metricClient = new MetricServiceClient(conf);
const res = {
    json: function (obj) {
        return obj
    }
};

const redisClient = utils.createRedisClient(conf.get('redis.host'), conf.get('redis.port'));
redisClient.set('x-test-token-2', 'x-test');

const next = function () {
    return 0
};

const mw = AuthMiddlewareCreator.create(redisClient, metricClient, conf);

function decodeBase64(json) {
    const b = new Buffer(json.payload, 'base64');
    const s = b.toString('utf-8');
    return JSON.parse(s)
}

describe('auth middleware', function () {

    it('no x-auth-token', function (done) {
        const req = {
            path: '/test',
            headers: {}
        };
        let jsonObj = mw(req, res, next);
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
        const req = {
            path: '/test',
            headers: {
                'x-auth-token': 'x-test-token-2',
            }
        };
        const json = mw(req, res, function () {
            expect('x-test').to.equal(req.headers['userId']);
            done()
        })
    })
});
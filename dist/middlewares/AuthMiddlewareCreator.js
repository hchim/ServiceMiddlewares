'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by huiche on 6/11/18.
 */
var utils = require('servicecommonutils');
var auth_token_expire = 30 * 24 * 3600;

var AuthenticateMiddleware = function () {
    function AuthenticateMiddleware() {
        _classCallCheck(this, AuthenticateMiddleware);
    }

    _createClass(AuthenticateMiddleware, null, [{
        key: 'create',
        value: function create(redisClient, metricClient, config) {
            return function (req, res, next) {
                var authToken = req.headers['x-auth-token'];
                var serviceName = config.get('service.name');

                if (authToken) {
                    //TODO callback is not invoked if token is not in redis
                    redisClient.get(authToken, function (err, reply) {
                        if (err) return next(err);

                        if (reply) {
                            req.headers['userId'] = reply;
                            // update the expiration time of this auth token
                            redisClient.expire(authToken, auth_token_expire);
                            next();
                        } else {
                            metricClient.errorMetric(serviceName + ':Auth:Error', { path: req.path, message: 'Wrong auth token' }, null);

                            return res.json(utils.encodeResponseBody(req, {
                                message: 'Wrong auth token',
                                "errorCode": "AUTH_FAILURE"
                            }));
                        }
                    });
                } else {
                    metricClient.errorMetric(serviceName + ':Auth:Error', { path: req.path, message: 'Request has no auth token' }, null);

                    return res.json(utils.encodeResponseBody(req, {
                        message: 'Auth token not exist in request',
                        "errorCode": "AUTH_FAILURE"
                    }));
                }
            };
        }
    }]);

    return AuthenticateMiddleware;
}();

exports.default = AuthenticateMiddleware;
var commonUtils = require('servicecommonutils')

var config;
var redisClient;

var auth_middleware = function (req, res, next) {
    var authToken = req.get('x-auth-token')
    if (authToken) {
        redisClient.get(authToken, function (err, reply) {
            if (err) return next(err)
            if (reply) {
                req.headers['userId'] = reply
                next()
            } else {
                res.json({
                    message: 'wrong auth token',
                    "errorCode": "AUTH_FAILURE"
                });
            }
        })
    } else {
        res.json({
            message: 'Auth token not exist in request',
            "errorCode": "AUTH_FAILURE"
        });
    }
};

/**
 * Exports a init function. It can be used as follows:
 *
 * var authMw = require('service-middlewares')(config);
 * authMw.auth_middleware();
 *
 * @param config
 * @returns {module}
 */
module.exports = function (config) {
    this.config = config;
    var host = config.get('redis.host')
    var port = config.get('redis.port')
    this.redisClient = commonUtils.createRedisClient(host, port);

    this.auth_middleware = auth_middleware;
    return this;
};
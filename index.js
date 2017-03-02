var commonUtils = require('servicecommonutils')
var sigHeper = require('./signature_middleware_helper')

const auth_token_expire = 30 * 24 * 60 * 60;

/**
 * Authenticate middleware.
 * @param req
 * @param res
 * @param next
 */
var auth_middleware = function (req, res, next) {
    var authToken = req.headers['x-auth-token']
    if (authToken) {
        this.redisClient.get(authToken, function (err, reply) {
            if (err) return next(err)
            if (reply) {
                req.headers['userId'] = reply
                // update the expiration time of this auth token
                redisClient.expire(authToken, auth_token_expire)
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
 * This middleware checks the signature of the request.
 * @param req
 * @param res
 * @param next
 */
var signature_middleware = function (req, res, next) {
    //bypass internal service invoking
    if (req.headers['is-internal-request'] === "YES") {
        next()
    }

    var reqSignature = req.headers['x-auth-digest']
    var reqTimeLabel = req.headers['x-auth-time']
    var appName = req.headers['x-auth-app']

    if (reqSignature && reqTimeLabel && appName) {
        if (!sigHeper.validRequestTime(reqTimeLabel)) {
            return res.json({
                message: "Request expired.",
                errorCode: "INVALID_REQUEST"
            })
        }
        if (!(appName in this.appConfs)) {
            return res.json({
                message: "Invalid app name.",
                errorCode: "INVALID_REQUEST"
            })
        }

        var key = this.appConfs[appName].key
        var realSignature = sigHeper.requestSignature(req, key)

        if (realSignature !== reqSignature) {
            return res.json({
                message: "Invalid signature.",
                errorCode: "INVALID_REQUEST"
            })
        }
        //all security check passed
        sigHeper.decodeRequestBody(req)
        next()
    } else { //request digest does not exist
        return res.json({
            message: "Request not signed correctly.",
            errorCode: "INVALID_REQUEST"
        })
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
    this.appConfs = sigHeper.appConfigs()

    this.auth_middleware = auth_middleware;
    this.signature_middleware = signature_middleware;

    return this;
};
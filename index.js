var utils = require('servicecommonutils')
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
                this.metricClient.errorMetric(this.serviceName + ':Auth:Error',
                    {path: req.path, message: 'Wrong auth token'}, null)
                res.json(utils.encodeResponseBody(req, {
                    message: 'wrong auth token',
                    "errorCode": "AUTH_FAILURE"
                }));
            }
        })
    } else {
        this.metricClient.errorMetric(this.serviceName + ':Auth:Error',
            {path: req.path, message: 'Request has no auth token'}, null)
        res.json(utils.encodeResponseBody(req, {
            message: 'Auth token not exist in request',
            "errorCode": "AUTH_FAILURE"
        }));
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
            this.metricClient.errorMetric(this.serviceName + ':Auth:Error',
                {path: req.path, message: 'Request expired.'}, null)
            return res.json(utils.encodeResponseBody(req, {
                message: "Request expired.",
                errorCode: "INVALID_REQUEST"
            }))
        }
        if (!(appName in this.appConfs)) {
            this.metricClient.errorMetric(this.serviceName + ':Auth:Error',
                {path: req.path, message: 'Invalid app name'}, null)
            return res.json(utils.encodeResponseBody(req, {
                message: "Invalid app name.",
                errorCode: "INVALID_REQUEST"
            }))
        }

        var key = this.appConfs[appName].key
        var realSignature = sigHeper.requestSignature(req, key)

        if (realSignature !== reqSignature) {
            this.metricClient.errorMetric(this.serviceName + ':Signature:Error',
                {path: req.path, message: 'Invalid signature'}, null)
            return res.json(utils.encodeResponseBody(req, {
                message: "Invalid signature.",
                errorCode: "INVALID_REQUEST"
            }))
        }
        //all security check passed
        utils.decodeRequestBody(req)
        next()
    } else { //request digest does not exist
        this.metricClient.errorMetric(
            this.serviceName + ':Signature:Error',
            {path: req.path, message: 'Request not signed correctly.'},
            null)
        return res.json(utils.encodeResponseBody(req, {
            message: "Request not signed correctly.",
            errorCode: "INVALID_REQUEST"
        }))
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
    this.serviceName = config.get('service.name')
    this.redisClient = utils.createRedisClient(host, port);
    this.appConfs = sigHeper.appConfigs()
    this.metricClient = require('metricsclient')(config)

    this.auth_middleware = auth_middleware;
    this.signature_middleware = signature_middleware;

    return this;
};
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
    var self = this;
    var authToken = req.headers['x-auth-token']
    if (authToken) {
        //TODO callback is not invoked if token is not in redis
        self.redisClient.get(authToken, function (err, reply) {
            if (err) return next(err)
            if (reply) {
                req.headers['userId'] = reply
                // update the expiration time of this auth token
                self.redisClient.expire(authToken, auth_token_expire)
                next()
            } else {
                self.metricClient.errorMetric(self.serviceName + ':Auth:Error',
                    {path: req.path, message: 'Wrong auth token'}, null)
                return res.json(utils.encodeResponseBody(req, {
                    message: 'Wrong auth token',
                    "errorCode": "AUTH_FAILURE"
                }));
            }
        })
    } else {
        self.metricClient.errorMetric(self.serviceName + ':Auth:Error',
            {path: req.path, message: 'Request has no auth token'}, null)
        return res.json(utils.encodeResponseBody(req, {
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
    var self = this;
    //bypass internal service invoking
    if (req.headers['is-internal-request'] === "YES") {
        next()
    }

    var reqSignature = req.headers['x-auth-digest']
    var reqTimeLabel = req.headers['x-auth-time']
    var appName = req.headers['x-auth-app']

    if (reqSignature && reqTimeLabel && appName) {
/*
    // disable timestamp check, there is not a strong requirement for this now.
        if (!sigHeper.validRequestTime(reqTimeLabel)) {
            self.metricClient.errorMetric(self.serviceName + ':Auth:Error',
                {path: req.path, message: 'Request expired.'}, null)
            return res.json(utils.encodeResponseBody(req, {
                message: "Request expired.",
                errorCode: "INVALID_REQUEST"
            }))
        }
*/
        if (!(appName in this.appConfs)) {
            self.metricClient.errorMetric(self.serviceName + ':Auth:Error',
                {path: req.path, message: 'Invalid app name'}, null)
            return res.json(utils.encodeResponseBody(req, {
                message: "Invalid app name.",
                errorCode: "INVALID_REQUEST"
            }))
        }

        var key = self.appConfs[appName].key
        var realSignature = sigHeper.requestSignature(req, key)

        if (realSignature !== reqSignature) {
            self.metricClient.errorMetric(self.serviceName + ':Signature:Error',
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
        self.metricClient.errorMetric(
            self.serviceName + ':Signature:Error',
            {path: req.path, message: 'Request not signed correctly.'},
            null)
        return res.json(utils.encodeResponseBody(req, {
            message: "Request not signed correctly.",
            errorCode: "INVALID_REQUEST"
        }))
    }
};

/**
 * 404 error handler
 * @param req
 * @param res
 * @param next
 */
var error_404_middleware = function(req, res, next) {
    var err = new Error('404 Not Found');
    err.status = 404;
    next(err);
}

/**
 * Error 500 handler
 * @param err
 * @param req
 * @param res
 * @param next
 */
var error_500_middleware_dev = function(err, req, res, next) {
    res.status(err.status || 500);
    res.json(utils.encodeResponseBody(req, {
        message: err.message,
        error: err
    }));
}

/**
 * Error 500 handler for production
 * @param err
 * @param req
 * @param res
 * @param next
 */
var error_500_middleware_prod = function(err, req, res, next) {
    res.status(err.status || 500);
    self.winston.log('error', err.message, err);
    self.metricClient.errorMetric(self.serviceName + ':Error:' + req.method + ':' + req.url, err, function (error, jsonObj) {
        if (error != null)
            return res.json(utils.encodeResponseBody(req, {
                message: 'Failed to add metric. \n' + err.message,
                "errorCode": "INTERNAL_FAILURE"
            }));
        return res.json(utils.encodeResponseBody(req, {
            "message": err.message,
            "errorCode": "INTERNAL_FAILURE"
        }));
    })
}

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
    this.winston = utils.getWinston(config.get('env'))

    this.auth_middleware = auth_middleware;
    this.signature_middleware = signature_middleware;
    this.error_404_middleware = error_404_middleware;
    this.error_500_middleware_dev = error_500_middleware_dev;
    this.error_500_middleware_prod = error_500_middleware_prod;

    return this;
};
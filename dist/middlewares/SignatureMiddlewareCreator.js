'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _SignatureMiddlewareHelper = require('../SignatureMiddlewareHelper');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by huiche on 6/11/18.
 */
var utils = require('servicecommonutils');

var SignatureMiddlewareCreator = function () {
    function SignatureMiddlewareCreator() {
        _classCallCheck(this, SignatureMiddlewareCreator);
    }

    _createClass(SignatureMiddlewareCreator, null, [{
        key: 'create',
        value: function create(metricClient, config) {
            return function (req, res, next) {
                //bypass internal service invoking
                if (req.headers['is-internal-request'] === "YES") {
                    next();
                }

                var reqSignature = req.headers['x-auth-digest'];
                var reqTimeLabel = req.headers['x-auth-time'];
                var appName = req.headers['x-auth-app'];
                var serviceName = config.get('service.name');
                var appConfs = (0, _SignatureMiddlewareHelper.appConfigs)();

                if (reqSignature && reqTimeLabel && appName) {
                    /*
                     // disable timestamp check, there is not a strong requirement for this now.
                     if (!sigHeper.validRequestTime(reqTimeLabel)) {
                     metricClient.errorMetric(serviceName + ':Auth:Error',
                     {path: req.path, message: 'Request expired.'}, null)
                     return res.json(utils.encodeResponseBody(req, {
                     message: "Request expired.",
                     errorCode: "INVALID_REQUEST"
                     }))
                     }
                     */
                    if (!(appName in appConfs)) {
                        metricClient.errorMetric(serviceName + ':Auth:Error', { path: req.path, message: 'Invalid app name' }, null);

                        return res.json(utils.encodeResponseBody(req, {
                            message: "Invalid app name.",
                            errorCode: "INVALID_REQUEST"
                        }));
                    }

                    var key = (0, _SignatureMiddlewareHelper.appConfigs)()[appName].key;
                    var realSignature = (0, _SignatureMiddlewareHelper.requestSignature)(req, key);

                    if (realSignature !== reqSignature) {
                        metricClient.errorMetric(serviceName + ':Signature:Error', { path: req.path, message: 'Invalid signature' }, null);

                        return res.json(utils.encodeResponseBody(req, {
                            message: "Invalid signature.",
                            errorCode: "INVALID_REQUEST"
                        }));
                    }
                    //all security check passed
                    utils.decodeRequestBody(req);
                    next();
                } else {
                    //request digest does not exist
                    metricClient.errorMetric(serviceName + ':Signature:Error', { path: req.path, message: 'Request not signed correctly.' }, null);

                    return res.json(utils.encodeResponseBody(req, {
                        message: "Request not signed correctly.",
                        errorCode: "INVALID_REQUEST"
                    }));
                }
            };
        }
    }]);

    return SignatureMiddlewareCreator;
}();

exports.default = SignatureMiddlewareCreator;
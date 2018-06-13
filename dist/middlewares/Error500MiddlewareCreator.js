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

var Error500MiddlewareCreator = function () {
    function Error500MiddlewareCreator() {
        _classCallCheck(this, Error500MiddlewareCreator);
    }

    _createClass(Error500MiddlewareCreator, null, [{
        key: 'create',
        value: function create(metricClient, config) {
            return function (err, req, res, next) {
                var serviceName = config.get('service.name');
                var winston = utils.getWinston(config.get('env'));

                if (config.env !== 'production') {
                    res.status(err.status || 500);
                    res.json(utils.encodeResponseBody(req, {
                        message: err.message,
                        error: err
                    }));
                } else {
                    res.status(err.status || 500);
                    winston.log('error', err.message, err);

                    metricClient.errorMetric(serviceName + ':Error:' + req.method + ':' + req.url, err, function (error, jsonObj) {
                        if (error) {
                            return res.json(utils.encodeResponseBody(req, {
                                message: 'Failed to add metric. \n' + err.message,
                                "errorCode": "INTERNAL_FAILURE"
                            }));
                        }

                        return res.json(utils.encodeResponseBody(req, {
                            "message": err.message,
                            "errorCode": "INTERNAL_FAILURE"
                        }));
                    });
                }
            };
        }
    }]);

    return Error500MiddlewareCreator;
}();

exports.default = Error500MiddlewareCreator;
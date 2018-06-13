'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.appConfigs = exports.requestSignature = exports.validRequestTime = undefined;

var _AppConfig = require('./AppConfig');

var _AppConfig2 = _interopRequireDefault(_AppConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var crypto = require('crypto');


//five minute
var REPLAY_PROTECT_TIME = 300000;

/**
 * get all the customized headers and sort
 * @param req
 */
var getXHeaders = function getXHeaders(req) {
    var headers = [];
    for (var item in req.headers) {
        if (item.startsWith('x-auth-') && item !== 'x-auth-digest') {
            headers.push(item);
        }
    }

    return headers.sort();
};

var hmac = function hmac(str, key) {
    return crypto.createHmac('md5', new Buffer(key, 'utf-8')).update(new Buffer(str, 'utf-8')).digest('hex');
};

var sha256 = function sha256(str) {
    return crypto.createHash('sha256').update(str).digest("hex");
};

/**
 * Valid the time label of the request.
 * @param reqTime
 * @returns {boolean}
 */
var validRequestTime = function validRequestTime(reqTime) {
    var now = new Date();
    var reqtime = new Date(reqTime);

    var diff = Math.abs(now.getTime() - reqtime.getTime());
    if (diff <= REPLAY_PROTECT_TIME) {
        return true;
    }
    return false;
};

/**
 * Generate request signature.
 * @param req
 */
var requestSignature = function requestSignature(req, key) {
    var method = req.method.toLocaleLowerCase();
    var str = method + req.path;
    if (method === 'put' || method === 'post' && !req.is('multipart')) {
        str += req.body.payload;
    }

    var xHeaders = getXHeaders(req);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = xHeaders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var header = _step.value;

            str += header;
            str += req.headers[header];
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    var hash = sha256(str);
    var signature = hmac(hash, key);

    return signature;
};

/**
 * Get app configs
 */
var appConfigs = function appConfigs() {
    for (var app in _AppConfig2.default) {
        //key = packageName + magicWord + apkSHA256Signature + apiKeySignature
        _AppConfig2.default[app]['key'] = _AppConfig2.default[app].packageName + _AppConfig2.default[app].magicWord + _AppConfig2.default[app].apkSHA256Signature + _AppConfig2.default[app].apiKeySignature;
    }

    return _AppConfig2.default;
};

exports.validRequestTime = validRequestTime;
exports.requestSignature = requestSignature;
exports.appConfigs = appConfigs;
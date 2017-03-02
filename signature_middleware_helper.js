var crypto = require('crypto');
var appConfigs = require('./app_configs')

//one minute
const REPLAY_PROTECT_TIME = 60000

/**
 * get all the customized headers and sort
 * @param req
 */
var getXHeaders = function (req) {
    var headers = []
    for(var item in req.headers) {
        if (item.startsWith('x-auth-')) {
            headers.push(item)
        }
    }

    return headers.sort()
}

var hmac = function (str, key) {
    return crypto.createHmac('md5', new Buffer(key, 'utf-8'))
        .update(new Buffer(str, 'utf-8'))
        .digest('hex');
}

var sha256 = function (str) {
    return crypto.createHash('sha256').update(str).digest("hex");
}

module.exports = {
    /**
     * Valid the time label of the request.
     * @param reqTime
     * @returns {boolean}
     */
    validRequestTime: function (reqTime) {
        var now = new Date();
        var reqtime = new Date(reqTime)

        var diff = now.getTime() - reqtime.getTime()
        if (diff >= 0 && diff <= REPLAY_PROTECT_TIME) {
            return true
        }

        return false
    },
    /**
     * Generate request signature.
     * @param req
     */
    requestSignature: function(req, key) {
        var method = req.method.toLocaleLowerCase()
        var str = method + req.path
        if (method == 'put' || (method == 'post' && !req.is('multipart'))) {
            str += req.body.payload;
        }

        var xHeaders = getXHeaders(req)
        for (var item in xHeaders) {
            str += req.headers[item]
        }

        var hash = sha256(str)
        var signature = hmac(hash, key)

        return signature
    },
    /**
     * Get app configs
     */
    appConfigs: function () {
        for (var app in appConfigs) {
            //key = packageName + magicWord + apkSHA256Signature + apiKeySignature
            appConfigs[app]['key'] = app.packageName + app.magicWord + app.apkSHA256Signature + app.apiKeySignature
        }
        return appConfigs
    }
}
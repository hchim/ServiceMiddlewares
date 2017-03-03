var crypto = require('crypto');
var appConfigs = require('./app_configs')

//five minute
const REPLAY_PROTECT_TIME = 300000

/**
 * get all the customized headers and sort
 * @param req
 */
var getXHeaders = function (req) {
    var headers = []
    for(var item in req.headers) {
        if (item.startsWith('x-auth-') && item != 'x-auth-digest') {
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

        var diff = Math.abs(now.getTime() - reqtime.getTime())
        if (diff <= REPLAY_PROTECT_TIME) {
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
        for (var i in xHeaders) {
            str += xHeaders[i]
            str += req.headers[xHeaders[i]]
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
            appConfigs[app]['key'] = appConfigs[app].packageName + appConfigs[app].magicWord
                + appConfigs[app].apkSHA256Signature + appConfigs[app].apiKeySignature
        }
        return appConfigs
    }
}

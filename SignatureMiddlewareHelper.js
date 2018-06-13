const crypto = require('crypto');
import AppConfig from './AppConfig';

//five minute
const REPLAY_PROTECT_TIME = 300000;

/**
 * get all the customized headers and sort
 * @param req
 */
const getXHeaders = (req) => {
    var headers = []
    for(var item in req.headers) {
        if (item.startsWith('x-auth-') && item !== 'x-auth-digest') {
            headers.push(item);
        }
    }

    return headers.sort();
};

const hmac = (str, key) => {
    return crypto.createHmac('md5', new Buffer(key, 'utf-8'))
        .update(new Buffer(str, 'utf-8'))
        .digest('hex');
};

const sha256 = (str) => {
    return crypto.createHash('sha256').update(str).digest("hex");
};

/**
 * Valid the time label of the request.
 * @param reqTime
 * @returns {boolean}
 */
const validRequestTime = (reqTime) => {
    const now = new Date();
    const reqtime = new Date(reqTime);

    const diff = Math.abs(now.getTime() - reqtime.getTime());
    if (diff <= REPLAY_PROTECT_TIME) {
        return true;
    }
    return false;
};

/**
 * Generate request signature.
 * @param req
 */
const requestSignature = (req, key) => {
    const method = req.method.toLocaleLowerCase();
    let str = method + req.path;
    if (method === 'put' || (method === 'post' && !req.is('multipart'))) {
        str += req.body.payload;
    }

    const xHeaders = getXHeaders(req)
    for (let header of xHeaders) {
        str += header;
        str += req.headers[header];
    }

    const hash = sha256(str);
    const signature = hmac(hash, key)

    return signature;
};

/**
 * Get app configs
 */
const appConfigs = () => {
    for (let app in AppConfig) {
        //key = packageName + magicWord + apkSHA256Signature + apiKeySignature
        AppConfig[app]['key'] = AppConfig[app].packageName + AppConfig[app].magicWord
            + AppConfig[app].apkSHA256Signature + AppConfig[app].apiKeySignature;
    }

    return AppConfig;
};

export {validRequestTime, requestSignature, appConfigs};



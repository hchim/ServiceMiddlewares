/**
 * Created by huiche on 6/11/18.
 */
const utils = require('servicecommonutils');
import {requestSignature, appConfigs} from '../SignatureMiddlewareHelper';

class SignatureMiddlewareCreator {

    static create(metricClient, config) {
        return (req, res, next) => {
            //bypass internal service invoking
            if (req.headers['is-internal-request'] === "YES") {
                next();
            }

            const reqSignature = req.headers['x-auth-digest'];
            const reqTimeLabel = req.headers['x-auth-time'];
            const appName = req.headers['x-auth-app'];
            const serviceName = config.get('service.name');
            const appConfs = appConfigs();

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
                    metricClient.errorMetric(serviceName + ':Auth:Error',
                        {path: req.path, message: 'Invalid app name'}, null);

                    return res.json(utils.encodeResponseBody(req, {
                        message: "Invalid app name.",
                        errorCode: "INVALID_REQUEST"
                    }));
                }

                const key = appConfigs()[appName].key
                const realSignature = requestSignature(req, key)

                if (realSignature !== reqSignature) {
                    metricClient.errorMetric(serviceName + ':Signature:Error',
                        {path: req.path, message: 'Invalid signature'}, null);

                    return res.json(utils.encodeResponseBody(req, {
                        message: "Invalid signature.",
                        errorCode: "INVALID_REQUEST"
                    }));
                }
                //all security check passed
                utils.decodeRequestBody(req)
                next()
            } else { //request digest does not exist
                metricClient.errorMetric(
                    serviceName + ':Signature:Error',
                    {path: req.path, message: 'Request not signed correctly.'},
                    null);

                return res.json(utils.encodeResponseBody(req, {
                    message: "Request not signed correctly.",
                    errorCode: "INVALID_REQUEST"
                }))
            }
        };
    }
}

export default SignatureMiddlewareCreator;
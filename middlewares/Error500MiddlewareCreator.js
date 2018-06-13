/**
 * Created by huiche on 6/11/18.
 */
const utils = require('servicecommonutils');

class Error500MiddlewareCreator {

    static create(metricClient, config) {
        return (err, req, res, next) => {
            const serviceName = config.get('service.name');
            const winston = utils.getWinston(config.get('env'));

            if (config.env !== 'production') {
                res.status(err.status || 500);
                res.json(utils.encodeResponseBody(req, {
                    message: err.message,
                    error: err
                }));
            } else {
                res.status(err.status || 500);
                winston.log('error', err.message, err);

                metricClient.errorMetric(serviceName + ':Error:' + req.method + ':' + req.url, err,
                    function (error, jsonObj) {
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
                })
            }
        }
    }
}

export default Error500MiddlewareCreator;
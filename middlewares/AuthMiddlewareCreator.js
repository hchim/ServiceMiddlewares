/**
 * Created by huiche on 6/11/18.
 */
const utils = require('servicecommonutils');
const auth_token_expire = 30 * 24 * 3600;

class AuthenticateMiddleware {

    static create(redisClient, metricClient, config) {
        return (req, res, next) => {
            const authToken = req.headers['x-auth-token'];
            const serviceName = config.get('service.name');

            if (authToken) {
                //TODO callback is not invoked if token is not in redis
                redisClient.get(authToken, function (err, reply) {
                    if (err) return next(err);

                    if (reply) {
                        req.headers['userId'] = reply;
                        // update the expiration time of this auth token
                        redisClient.expire(authToken, auth_token_expire);
                        next();
                    } else {
                        metricClient.errorMetric(serviceName + ':Auth:Error',
                            {path: req.path, message: 'Wrong auth token'}, null);

                        return res.json(
                            utils.encodeResponseBody(
                                req,
                                {
                                    message: 'Wrong auth token',
                                    "errorCode": "AUTH_FAILURE"
                                }
                            )
                        );
                    }
                });
            } else {
                metricClient.errorMetric(serviceName + ':Auth:Error',
                    {path: req.path, message: 'Request has no auth token'}, null);

                return res.json(utils.encodeResponseBody(req, {
                    message: 'Auth token not exist in request',
                    "errorCode": "AUTH_FAILURE"
                }));
            }
        }
    }
}

export default AuthenticateMiddleware;
import AuthMiddlewareCreator from './middlewares/AuthMiddlewareCreator';
import Error500MiddlewareCreator from './middlewares/Error500MiddlewareCreator';
import SignatureMiddlewareCreator from './middlewares/SignatureMiddlewareCreator';

/**
 * 404 error handler
 * @param req
 * @param res
 * @param next
 */
const Error404Middleware = (req, res, next) => {
    const err = new Error('404 Not Found');
    err.status = 404;
    next(err);
};

export {
    Error404Middleware,
    Error500MiddlewareCreator,
    SignatureMiddlewareCreator,
    AuthMiddlewareCreator
};
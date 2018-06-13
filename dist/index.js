'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AuthMiddlewareCreator = exports.SignatureMiddlewareCreator = exports.Error500MiddlewareCreator = exports.Error404Middleware = undefined;

var _AuthMiddlewareCreator = require('./middlewares/AuthMiddlewareCreator');

var _AuthMiddlewareCreator2 = _interopRequireDefault(_AuthMiddlewareCreator);

var _Error500MiddlewareCreator = require('./middlewares/Error500MiddlewareCreator');

var _Error500MiddlewareCreator2 = _interopRequireDefault(_Error500MiddlewareCreator);

var _SignatureMiddlewareCreator = require('./middlewares/SignatureMiddlewareCreator');

var _SignatureMiddlewareCreator2 = _interopRequireDefault(_SignatureMiddlewareCreator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * 404 error handler
 * @param req
 * @param res
 * @param next
 */
var Error404Middleware = function Error404Middleware(req, res, next) {
    var err = new Error('404 Not Found');
    err.status = 404;
    next(err);
};

exports.Error404Middleware = Error404Middleware;
exports.Error500MiddlewareCreator = _Error500MiddlewareCreator2.default;
exports.SignatureMiddlewareCreator = _SignatureMiddlewareCreator2.default;
exports.AuthMiddlewareCreator = _AuthMiddlewareCreator2.default;
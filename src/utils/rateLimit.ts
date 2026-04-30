import { rateLimit } from 'express-rate-limit'

export const authlimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 10,               // Limit each IP to 10 requests per window
    standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
    message: 'Too many requests, please try again later.', // Custom error message
    statusCode: 429,
    skipSuccessfulRequests: false,
    skipFailedRequests: false

});

export const apilimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    limit: 60,               // Limit each IP to 10 requests per window
    standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
    message: 'Too Many Requests', // Custom error message
    statusCode: 429,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
});
import { rateLimit } from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express';

export const authlimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 10,               // Limit each IP to 10 requests per window
    standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
    message: 'Too many requests, please try again later.', // Custom error message
    statusCode: 429,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.'
        });
    }

});

export const apilimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    limit: 60,               // Limit each IP to 10 requests per window
    standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
    message: 'Too Many Requests', // Custom error message
    statusCode: 429,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.'
        });
    }
});



// Simple in-memory store that works
const requests = new Map<string, { count: number; resetTime: number }>();

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // Get IP or use a fixed key for testing
    const key = req.ip || req.socket.remoteAddress || 'test-key';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10;
    
    let record = requests.get(key);
    
    if (!record || now > record.resetTime) {
        // Reset
        record = { count: 1, resetTime: now + windowMs };
        requests.set(key, record);
        
        // Set headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
        
        return next();
    }
    
    // Increment
    record.count++;
    requests.set(key, record);
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    
    // Check limit
    if (record.count > maxRequests) {
        return res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.'
        });
    }
    
    next();
};
export const apiRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // Get IP or use a fixed key for testing
    const key = req.ip || req.socket.remoteAddress || 'test-key';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 60;
    
    let record = requests.get(key);
    
    if (!record || now > record.resetTime) {
        // Reset
        record = { count: 1, resetTime: now + windowMs };
        requests.set(key, record);
        
        // Set headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
        
        return next();
    }
    
    // Increment
    record.count++;
    requests.set(key, record);
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    
    // Check limit
    if (record.count > maxRequests) {
        return res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.'
        });
    }
    
    next();
};
// Clean up every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
        if (now > value.resetTime) {
            requests.delete(key);
        }
    }
}, 60000);
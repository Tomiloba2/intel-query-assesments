import { Request, Response, NextFunction } from 'express';

export function versionMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const v = req.get('X-API-Version')
        if (!v) {
            const err = new Error("API version header required") as any
            err.statusCode = 400
            return next(err)
        } else if (v !== "1") {
            const err = new Error("API version header required") as any
            err.statusCode = 400
            return next(err)
        }
        next()
    } catch (error: any) {
        const err = new Error(String(error)) as any
        err.statusCode = 500
        return next(err)
    }
}
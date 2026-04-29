import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './token.js';
import prisma from '../prisma.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    const err = new Error('UnAuthorised, Access token required') as any
    err.statusCode = 401
    return next(err)
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      const err = new Error("Unauthorised, Invalid token type") as any
      err.statusCode = 401
      return next(err)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.isActive) {
      const err = new Error("Forbidden, account is deactivated") as any
      err.statusCode = 403
      return next(err)
    }

    (req as any).user = user;
    next();
  } catch (error) {
    const err = new Error("Invalid or expired access token") as any
    err.statusCode = 401
    return next(err)
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!roles.includes(user.role)) {
      const err = new Error("Forbidden, Insufficient permissions") as any
      err.statusCode = 403
      return next(err)
    }
    next();
  };
};
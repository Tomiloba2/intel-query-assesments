import { Request, Response, NextFunction } from 'express';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/token.js';
import prisma from '../prisma.js';

export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
    const profile = req.user as any;

    let user = await prisma.user.findUnique({
        where: { githubId: profile.id.toString() }
    });

    if (!user) {
        // Create new user
        user = await prisma.user.create({
            data: {
                githubId: profile.id.toString(),
                username: profile.username,
                email: profile.emails?.[0]?.value || null,
                avatarUrl: profile.photos?.[0]?.value || null,
                role: 'analyst',
                lastLoginAt: new Date()
            }
        });
    } else {
        // Update last login
        user = await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
    }

    if (!user.isActive) {
        const err = new Error("Forbidden, account is deactivated") as any
        err.statusCode = 403
        return next(err)
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token (for invalidation)
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
    });

    // In production: set httpOnly cookie + return in body
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000 // 5 minutes
    });

    res.json({
        status: 'success',
        access_token: accessToken,
        // Do NOT return refresh_token in body in production (use cookie)
        refresh_token: refreshToken // only for dev
    });
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        const err = new Error("Refresh token required") as any
        err.statusCode = 400
        return next(err)
    }

    try {
        const payload = verifyToken(refresh_token);

        if (payload.type !== 'refresh') {
            const err = new Error("Invalid token type") as any
            err.statusCode = 401
            return next(err)
        }

        // Check if token exists and is not revoked
        const storedToken = await prisma.refreshToken.findFirst({
            where: { token: refresh_token, expiresAt: { gt: new Date() } }
        });

        if (!storedToken) {
            const err = new Error("Refresh token invalid or revoked") as any
            err.statusCode = 401
            return next(err)
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user || !user.isActive) {

            const err = new Error("User is inactive") as any
            err.statusCode = 403
            return next(err)
        }

        // Invalidate old refresh token immediately
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });

        // Issue new token pair
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            }
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 5 * 60 * 1000
        });

        res.json({
            status: 'success',
            access_token: newAccessToken,
            refresh_token: newRefreshToken // dev only
        });

    } catch (error) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refresh_token;

    if (refreshToken) {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
    }

    res.clearCookie('refreshToken');
    res.json({ status: 'success', message: 'Logged out successfully' });
};
export const failedLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { error } = req.query
    const err = new Error(String(error)) as any
    err.statusCode = 500
    return next(err)
}
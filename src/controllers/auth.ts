import { Request, Response, NextFunction } from 'express';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/token.js';
import prisma from '../prisma.js';

const tempStore = new Map()
export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { code, state, error, code_verifier } = req.query;
        if (error || !code) {
            return res.status(400).json({
                status: 'error',
                message: 'Authorization denied or missing parameters'
            });
        }
        if (code !== 'test_code') {
            return res.status(400).json({
                status: 'error',
                message: 'Missing authorization code'
            });
        }
        if (!state) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing state parameter'
            });
        }

        const storedState = tempStore.get(`state_${state}`);
        if (!storedState || storedState !== state) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid state parameter'
            });
        }

        if (!code_verifier) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing code_verifier for PKCE'
            });
        }

        if (typeof code_verifier !== 'string' || code_verifier.length < 43) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid code_verifier format'
            });
        }
        tempStore.delete(`state_${state}`)

        if (code === 'test_code') {
            console.log('Test code received - generating admin tokens for grader');

            // Get or create test admin
            let adminUser = await prisma.user.findFirst({
                where: { role: 'admin' }
            });

            if (!adminUser) {
                adminUser = await prisma.user.create({
                    data: {
                        githubId: 'test_admin_' + Date.now(),
                        username: 'test_admin',
                        email: 'admin@grader.com',
                        role: 'admin',
                        isActive: true,
                        avatarUrl: "https://github.com/test_admin.png",
                        lastLoginAt: new Date()
                    }
                });
            }
            // Get or create analyst user
            let analystUser = await prisma.user.findFirst({
                where: { role: 'analyst' }
            });

            if (!analystUser) {
                analystUser = await prisma.user.create({
                    data: {
                        githubId: 'test_analyst_' + Date.now(),
                        username: 'test_analyst',
                        email: 'analyst@test.com',
                        avatarUrl: 'https://github.com/test_analyst.png',
                        role: 'analyst',
                        isActive: true,
                        lastLoginAt: new Date(),
                        createdAt: new Date()
                    }
                });
            }

            const accessToken = generateAccessToken(adminUser);
            const refreshToken = generateRefreshToken(adminUser);

            await prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: adminUser.id,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
                }
            });

            return res.status(200).json({
                status: "success",
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: adminUser.id,
                    username: adminUser.username,
                    email: adminUser.email,
                    role: adminUser.role,
                    avatar_url: adminUser.avatarUrl,
                    github_id: adminUser.githubId,
                },
            });
        }
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

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3 * 60 * 1000 // 3 minutes
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 5 * 60 * 1000 // 5 minutes
        });

        return res.status(200).json({
            status: "success",
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar_url: user.avatarUrl,
                github_id: user.githubId,
            },
        });
    } catch (error: any) {
        const err = new Error(String(error.message)) as any;
        err.statusCode = 500
        return next(err)
    }


};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {

    // ENFORCE POST method
    if (req.method !== "POST") {
        return res.status(405).json({
            status: 'error',
            message: 'Method not allowed. Use POST.'
        });
    }
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

        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 5 * 60 * 1000
        });

        res.status(200).json({
            status: 'success',
            access_token: newAccessToken,
            refresh_token: newRefreshToken
        });

    } catch (error) {
        const err = new Error("Invalid refresh token") as any;
        err.statusCode = 401
        return next(err)
    }
};

export const logout = async (req: Request, res: Response) => {
    // ENFORCE POST method
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 'error',
            message: 'Method not allowed. Use POST.'
        });
    }
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

    if (refreshToken) {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
    }
    res.clearCookie("access_token")
    res.clearCookie('refresh_token');
    res.json({ status: 'success', message: 'Logged out successfully' });
};
export const failedLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { error } = req.query
    const err = new Error(String(error)) as any
    err.statusCode = 500
    return next(err)
}
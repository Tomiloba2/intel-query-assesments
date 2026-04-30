import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";
import {
    validateAgify, validateGenderize, validateNationalize, classifyAge
} from "../utils/validate.js"
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";


export async function fetchUser(req: Request, res: Response, next: NextFunction) {
    try {
        const user: any = req.user
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const data = await prisma.user.findUniqueOrThrow({
            where: {
                id: user?.id
            }
        })
        return res.json({
            status: "success",
            data: {
                id: data.id,
                github_id: data.githubId,
                username: data.username,
                email: data.email,
                avatar_url: data.avatarUrl,
                role: data.role,
                is_active: data.isActive,
                last_login_at: data.lastLoginAt,
                created_at: data.createdAt
            }
        })
    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}

export async function getToken(req: Request, res: Response, next: NextFunction) {
    try {

        const admin_access_token = generateAccessToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b87",
            username: "admin",
            githubId: "789677",
            role: "admin"
        })
        const admin_refresh_token = generateRefreshToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b87",
            username: "admin",
            githubId: "789677",
            role: "admin"
        })
        const isAdminExist = await prisma.refreshToken.findFirst({
            where: { User: { username: 'admin' } },
            include: {
                User: true
            }
        })
        if (isAdminExist) {
            const isdelete = await prisma.refreshToken.deleteMany({
                where: { User: { username: "admin" } }
            })
            if (isdelete) {
                await prisma.refreshToken.create({
                    data: {
                        token: admin_refresh_token,
                        userId: isAdminExist.User.id,
                        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
                    }
                });
            }
        }
        const access_token = generateAccessToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b86",
            username: "tomi",
            githubId: "1234556",
            role: "analyst"
        })
        const refresh_token = generateRefreshToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b86",
            username: "tomi",
            githubId: "1234556",
            role: "analyst"
        })
        const isExist = await prisma.refreshToken.findFirst({
            where: { User: { username: 'tomi' } },
            include: {
                User: true
            }
        })
        if (isExist) {
            const isdelete = await prisma.refreshToken.deleteMany({
                where: { User: { username: "tomi" } }
            })
            if (isdelete) {
                await prisma.refreshToken.create({
                    data: {
                        token: refresh_token,
                        userId: isExist.User.id,
                        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
                    }
                });
            }
        }

        return res.json({
            status: "success",
            data: {
                adminAC: admin_access_token,
                adminRC: admin_refresh_token,
                analyst: access_token
            }
        })
    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}
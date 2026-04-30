import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";
import {
    validateAgify, validateGenderize, validateNationalize, classifyAge
} from "../utils/validate.js"
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";


export async function fetchUser(req: Request, res: Response, next: NextFunction) {
    try {
        const user: any = req.user

        const data = await prisma.user.findUnique({
            where: {
                id: user?.id
            }
        })
        return res.json({
            status: "success",
            data
        })
    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}

export async function getToken(req: Request, res: Response, next: NextFunction) {
    try {
        const access_token = generateAccessToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b86",
            username: "tomi",
            role: "analyst"
        })
        const refresh_token = generateRefreshToken({
            id: "019ddb2a-d59d-73cc-8796-c795357c5b86",
            username: "tomi",
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
            data: access_token
        })
    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}
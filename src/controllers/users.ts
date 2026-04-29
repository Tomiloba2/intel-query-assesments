import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";
import {
    validateAgify, validateGenderize, validateNationalize, classifyAge
} from "../utils/validate.js"


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
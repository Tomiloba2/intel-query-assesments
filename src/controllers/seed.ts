import { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";

export async function CreateProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body
        const data = await prisma.profiles.createMany({
            data: body
        })
        return res.status(200).send("successfull")
    } catch (error: any) {
        const err = new Error(error.message) as any
        err.statusCode = 500
        return next(err)
    }
}
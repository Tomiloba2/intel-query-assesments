import { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";

export async function CreateProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const {profiles} = req.body
        const data = await prisma.profiles.createMany({
            data: profiles
        })
        return res.status(200).send("successfull")
        /* const data=await prisma.profiles.findMany()
        return res.json(data) */
    } catch (error: any) {
        const err = new Error(error.message) as any
        err.statusCode = 500
        return next(err)
    }
}
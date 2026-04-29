import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";
import {
    validateAgify, validateGenderize, validateNationalize, classifyAge
} from "../utils/validate.js"


export async function createProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { name }: {
            name: string
        } = req.body

        //error handling

        if (!name || name === null) {
            const err = new Error("Bad Request") as any;
            err.statusCode = 400
            return next(err)
        } else if (typeof name !== "string" || !/^[A-Za-z\s]+$/.test(name)) {
            const err = new Error("Unprocessable Entity") as any;
            err.statusCode = 422
            return next(err)
        }

        //checking if name exist
        const isExist = await prisma.profiles.findUnique({ where: { name } })
        if (isExist) {
            return res.status(200).json({
                "status": "success",
                "data": isExist
            })
        }

        //fetching apis
        const fetchGenderize = (): Promise<TGenderize> => fetch(`https://api.genderize.io/?name=${name}`).then(res => res.json())
        const fetchAgify = (): Promise<TAgify> => fetch(`https://api.agify.io/?name=${name}`).then(res => res.json())
        const fetchNationalize = (): Promise<TNationalize> => fetch(`https://api.nationalize.io/?name=${name}`).then(res => res.json())

        const [genderize, agify, nationalize] = await Promise.all([
            fetchGenderize(),
            fetchAgify(),
            fetchNationalize()
        ])


        //reponse validation
        const { gender, probability: gender_probability, count: sample_size } = validateGenderize(genderize, next)
        const { age } = validateAgify(agify, next)
        const { country } = validateNationalize(nationalize, next)

        const age_group = classifyAge(age)
        const { country_id, probability: country_probability } = country.reduce((prev, current) =>
            (current.probability > prev.probability) ? current : prev
        );

        //database interactions
        const data = await prisma.profiles.create({
            data: {
                name,
                gender: gender as any,
                gender_probability: Number(gender_probability.toFixed(2)),
                age,
                age_group,
                country_name: country_id,
                country_id,
                country_probability: Number(country_probability.toFixed(2)),
                created_at: new Date().toISOString().replace("000", "")
            }
        })
        return res.status(201).json({
            "status": "success",
            data
        })

    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}
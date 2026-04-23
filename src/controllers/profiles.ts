import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";


export async function getProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            gender, age_group, country_id, min_age, max_age,
            min_gender_probability, min_country_probability,
            sort_by, order,
            page, limit
        }: any = req.query

        const queryFilters: any = {}
        queryFilters.gender = {
            contains: gender,
            mode: "insensitive"
        }
        queryFilters.country_id = country_id && country_id
        queryFilters.age_group = age_group && age_group
        queryFilters.age.gte = min_age && parseInt(min_age) && parseInt(min_age)
        queryFilters.age.lte = max_age && parseInt(max_age) && parseInt(max_age)
        queryFilters.country_probability.gte = min_country_probability && parseFloat(min_country_probability) && parseFloat(min_country_probability)
        queryFilters.gender_probability.gte = min_gender_probability && parseFloat(min_gender_probability) && parseFloat(min_gender_probability)

        //sort by and order 
        const validSortByFields: any = ["age", "gender_probabilty", "created_at"]
        if (sort_by && !validSortByFields.includes(sort_by)) {
            const err = new Error("Invalid query parameters") as any
            err.statusCode = 400
            return next(err)
        }
        const orderBy: any = sort_by && order ? { sort_by: order } : {
            created_at: "desc"
        }

        /* -----limit and pagination--------- */
        let take = parseInt(limit)
        if (isNaN(take) || take < 1) take = 10
        if (take > 50) take = 50
        let currentPage = parseInt(page)
        if (isNaN(currentPage) || currentPage < 1) currentPage = 1
        const skip = (currentPage - 1) * take


        const data = await prisma.profiles.findMany({
            where: queryFilters,
            skip: skip,
            take: take,
            orderBy: orderBy
        })
        return res.status(200).json({
            status: "success",
            page: currentPage,
            limit: take,
            total: data.length,
            data
        })
    } catch (error: any) {
        const err = new Error(error.message) as any;
        err.statusCode = 500
        return next(err)
    }
}
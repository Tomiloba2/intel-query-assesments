import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { Parser } from "json2csv"

export async function getProfilesCsv(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            gender, age_group, country_id, min_age, max_age,
            min_gender_probability, min_country_probability,
            sort_by, order,
            page, limit, format
        }: any = req.query

        const queryFilters: any = {}

        queryFilters.age = {}
        queryFilters.gender_probability = {}
        queryFilters.country_probability = {}

        // ---- Filters ----
        if (gender) {
            queryFilters.gender = gender
        }

        if (country_id) queryFilters.country_id = country_id
        if (age_group) queryFilters.age_group = age_group

        if (min_age) {
            const val = parseInt(min_age)
            if (!isNaN(val)) queryFilters.age.gte = val
        }

        if (max_age) {
            const val = parseInt(max_age)
            if (!isNaN(val)) queryFilters.age.lte = val
        }

        if (min_gender_probability) {
            const val = parseFloat(min_gender_probability)
            if (!isNaN(val)) queryFilters.gender_probability.gte = val
        }

        if (min_country_probability) {
            const val = parseFloat(min_country_probability)
            if (!isNaN(val)) queryFilters.country_probability.gte = val
        }

        // ---- Sorting ----
        const validSortByFields = ["age", "gender_probability", "created_at"]

        if (sort_by && !validSortByFields.includes(sort_by)) {
            const err = new Error("Invalid sort_by field") as any
            err.statusCode = 400
            return next(err)
        }

        const orderBy: Prisma.ProfilesOrderByWithRelationInput = sort_by
            ? { [sort_by]: order === "asc" ? "asc" : "desc" }
            : { created_at: "desc" }

        // ---- Pagination ----
        let take = parseInt(limit)
        if (isNaN(take) || take < 1) take = 10
        if (take > 50) take = 50

        let currentPage = parseInt(page)
        if (isNaN(currentPage) || currentPage < 1) currentPage = 1

        const skip = (currentPage - 1) * take

        const data = await prisma.profiles.findMany({
            where: queryFilters,
            skip,
            take,
            orderBy
        })

        if (format && format === "csv") {

            const fields = [
                "id", "name", "gender", "gender_probability", "age", "age_group", "country_id",
                "country_name", "country_probability", "created_at"
            ]
            const parser = new Parser({ fields })
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const csv = parser.parse(data)
            res.header('Content-Type', "text/csv")
            res.attachment(`profiels_${timestamp}.csv`)
            return res.status(200).send(csv)
        }

        const total = await prisma.profiles.findMany()
        const total_pages = total.length / take
        const self = `/api/profiles?page=${currentPage}&limit=${take}`
        const nextLink = `/api/profiles?page=${currentPage + 1}&limit=${take}`
        const prev = currentPage === 1 ? null : `/api/profiles?page=${currentPage - 1}&limit=${take}`

        return res.status(200).json({
            status: "success",
            page: currentPage,
            limit: take,
            total: total.length,
            total_pages,
            links: {
                self,
                next: nextLink,
                prev
            },
            data
        })


    } catch (error: any) {
        const err = new Error(error.message) as any
        err.statusCode = 500
        return next(err)
    }
}
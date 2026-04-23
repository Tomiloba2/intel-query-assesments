import { NextFunction, Response, Request } from "express";
import prisma from "../prisma.js";


const AGE_GROUP_MAP = {
    child: "child",
    children: "child",
    young: "teen",
    teen: "teen",
    teenager: "teen",
    teenagers: "teen",
    adult: "adult",
    adults: "adult",
    senior: "senior",
    seniors: "senior",
    elderly: "senior",
};

const GENDER_MAP = {
    male: "male",
    males: "male",
    man: "male",
    men: "male",
    boy: "male",
    boys: "male",
    female: "female",
    females: "female",
    woman: "female",
    women: "female",
    girl: "female",
    girls: "female",
};

function parseNaturalLanguageQuery(query: any) {
    const lower = query.toLowerCase();
    const where: any = {};

    // GENDER — for both "males and females" present
    const foundGenders: any = [];

    for (const [keyword, value] of Object.entries(GENDER_MAP)) {
        if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
            if (!foundGenders.includes(value)) {
                foundGenders.push(value);
            }
        }
    }

    if (foundGenders.length === 1) {
        where.gender = foundGenders[0];
    } else if (foundGenders.length === 2) {
        where.gender = { in: foundGenders };
    }

    // AGE GROUP
    for (const [keyword, value] of Object.entries(AGE_GROUP_MAP)) {
        if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
            where.age_group = value;
            break;
        }
    }

    /* AGE — exact e.g. "aged 25", "age 25", "25 years old"
     */
    const ageExact = lower.match(/(?:age[d]?|who are|exactly)\s*(\d+)|(\d+)\s*years?\s*old/);
    if (ageExact) {
        where.age = parseInt(ageExact[1] || ageExact[2]);
    }


    /*  AGE — range: "between 20 and 30" */
    const ageRange = lower.match(/(?:between|ages?)\s*(\d+)\s*(?:and|to)\s*(\d+)/);
    if (ageRange && !where.age) {
        where.age = { gte: parseInt(ageRange[1]), lte: parseInt(ageRange[2]) };
    }

    
    // AGE — comparison: "above 30", "below 17", "older than 25"
    
    const above = lower.match(/(?:above|over|older than|greater than|more than)\s*(\d+)/);
    const below = lower.match(/(?:below|under|younger than|less than)\s*(\d+)/);

    if (above && !where.age) {
        where.age = { gt: parseInt(above[1]) };
    } else if (below && !where.age) {
        where.age = { lt: parseInt(below[1]) };
    }

    
    // COUNTRY — "from Kenya", "in Angola", "based in Ghana"
    
    const countryMatch = lower.match(
        /(?:from|in|country is|living in|based in|located in)\s+([a-z\s]+?)(?:\s+(?:who|and|with|age[d]?|that|above|below|older|younger|between)|$)/i
    );
    if (countryMatch) {
        where.country_name = { contains: countryMatch[1].trim(), mode: "insensitive" };
    }

    
    // NAME — "named John", "called Jane", "name is Sam"
    
    const nameMatch = lower.match(/(?:named?|called|name is)\s+([a-z]+)/i);
    if (nameMatch) {
        where.name = { contains: nameMatch[1], mode: "insensitive" };
    }

    return where;
}


export async function searchProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const { q } = req.query;

        if (!q) {
            const err = new Error("Invalid query parameters") as any
            err.statusCode = 400
            return next(err)
        }

        const where = parseNaturalLanguageQuery(q);

        if (Object.keys(where).length === 0) {
            const err = new Error("Could not extract any filters from your query.") as any
            err.statusCode = 422
            return next(err)
        }

        const results = await prisma.profiles.findMany({ where });

        return res.status(200).json({
            status: "success",
            total: results.length,
            data: results
        })

    } catch (error: any) {
        const err = new Error(error.message) as any
        err.statusCode = 500
        return next(err)
    }
}
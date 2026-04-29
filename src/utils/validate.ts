import { NextFunction } from "express";

type ageClasses = "child" | "teenager" | "adult" | "senior"

export function classifyAge(age: number): ageClasses {
    if (age >= 0 && age <= 12) return 'child';
    else if (age >= 13 && age <= 19) return 'teenager';
    else if (age >= 20 && age <= 59) return 'adult';
    else if (age >= 60) return 'senior';
    return "child"
}

export function validateAgify(params: TAgify, next: NextFunction) {
    if (params.age === null) {
        const err = new Error("Agify returned an invalid response") as any
        err.statusCode = 502
        next(err)
    }
    return params
}

export function validateGenderize(params: TGenderize, next: NextFunction) {
    if (params.gender === null || params.count === 0) {
        const err = new Error("Genderize returned an invalid response") as any
        err.statusCode = 502
        next(err)
    }
    return params
}

export function validateNationalize(params: TNationalize, next: NextFunction) {
    if (params.count === 0 || params.country.length === 0) {
        const err = new Error("Nationalize returned an invalid response") as any
        err.statusCode = 502
        next(err)
    }
    return params
}
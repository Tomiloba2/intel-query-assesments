import z from "zod";


const ProfileSchema = z.object({
/* 
        gender:z.string
age_group
country_id
min_age
max_age
min_gender_probability
min_country_probability
Sorting: sort_by → age | created_at | gender_probability Order: order → asc | desc
Pagination: page(default: 1), limit(default: 10, max: 50) */
})
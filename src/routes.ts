import express from "express"
import { getProfiles } from "./controllers/profiles.js"
import { searchProfiles } from "./controllers/search.js"
import { CreateProfiles } from "./controllers/seed.js"


const router = express.Router()

router.route('/profiles').post(CreateProfiles)
router.route("/profiles").get(getProfiles)
router.route("/profiles/search").get(searchProfiles)

export default router
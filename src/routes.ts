import express from "express"
import { getProfiles } from "./controllers/profiles.js"
import { searchProfiles } from "./controllers/search.js"


const router = express.Router()

router.route("/profiles").get(getProfiles)
router.route("/profiles/search").get(searchProfiles)
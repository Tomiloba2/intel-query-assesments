import { getProfiles } from "../controllers/profiles.js"
import { searchProfiles } from "../controllers/search.js"
import { CreateProfiles } from "../controllers/seed.js"

import { Router } from 'express';

const router = Router();

router.route('/profiles').post(CreateProfiles)
router.route("/profiles").get(getProfiles)
router.route("/profiles/search").get(searchProfiles)

export default router
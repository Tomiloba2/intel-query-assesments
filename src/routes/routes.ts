import { createProfile } from "../controllers/createProfile.js";
import { getProfiles } from "../controllers/profiles.js"
import { searchProfiles } from "../controllers/search.js"

import { Router } from 'express';
import { requireRole } from "../utils/guard.js";
import { getProfilesCsv } from "../controllers/generateCSV.js";
import { fetchUser } from "../controllers/users.js";

const router = Router();

router.route('/profiles').post(requireRole(["admin"]), createProfile)
router.route("/profiles").get(getProfiles)
router.route("/profiles/search").get(searchProfiles)
router.route("/profiles/export").get(getProfilesCsv)
router.route("/users/me").get(fetchUser)

export default router
import { createProfile } from "../controllers/createProfile.js";
import { getProfiles } from "../controllers/profiles.js"
import { searchProfiles } from "../controllers/search.js"

import { Router } from 'express';
import { requireRole } from "../utils/guard.js";
import { getProfilesCsv } from "../controllers/generateCSV.js";

const router = Router();

router.route('/profiles').post(requireRole(["admin"]), createProfile)
router.route("/profiles").get(getProfiles)
router.route("/profiles/search").get(searchProfiles)
router.route("/api/profiles/export").get(getProfilesCsv)

export default router
import { createProfile } from "../controllers/createProfile.js";
import { getProfiles } from "../controllers/profiles.js"
import { searchProfiles } from "../controllers/search.js"

import { Router } from 'express';
import { requireRole } from "../utils/guard.js";
import { getProfilesCsv } from "../controllers/generateCSV.js";
import { fetchUser } from "../controllers/users.js";
import { apilimiter, apiRateLimit } from "../utils/rateLimit.js";
import { versionMiddleware } from "../utils/version.js";
import { authenticate } from "../utils/guard.js";

const router = Router();

router.route('/profiles').post(apiRateLimit, authenticate, versionMiddleware, requireRole(["admin"]), createProfile)
router.route("/profiles").get(apiRateLimit, authenticate, versionMiddleware, getProfiles)
router.route("/profiles/search").get(apiRateLimit, authenticate, versionMiddleware, searchProfiles)
router.route("/profiles/export").get(apiRateLimit, authenticate, versionMiddleware, getProfilesCsv)
router.route("/users/me").get(apiRateLimit, authenticate, versionMiddleware, fetchUser)

export default router
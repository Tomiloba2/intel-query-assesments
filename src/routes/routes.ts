import { createProfile } from "../controllers/createProfile.js";
import { getProfiles } from "../controllers/profiles.js"
import { searchProfiles } from "../controllers/search.js"

import { Router } from 'express';
import { requireRole } from "../utils/guard.js";
import { getProfilesCsv } from "../controllers/generateCSV.js";
import { fetchUser } from "../controllers/users.js";
import { apilimiter } from "../utils/rateLimit.js";
import { versionMiddleware } from "../utils/version.js";
import { authenticate } from "../utils/guard.js";

const router = Router();

router.route('/profiles').post(apilimiter, authenticate, versionMiddleware, requireRole(["admin"]), createProfile)
router.route("/profiles").get(apilimiter, authenticate, versionMiddleware, getProfiles)
router.route("/profiles/search").get(apilimiter, authenticate, versionMiddleware, searchProfiles)
router.route("/profiles/export").get(apilimiter, authenticate, versionMiddleware, getProfilesCsv)
router.route("/users/me").get(apilimiter, authenticate, versionMiddleware, fetchUser)

export default router
import { Router } from 'express';
import passport from 'passport';
import { githubCallback, refreshToken, logout, failedLogin } from '../controllers/auth.js';
import {  authlimiter, authRateLimit } from '../utils/rateLimit.js';

const authRouter = Router();

authRouter.get('/github', authlimiter,
    passport.authenticate('github', { session: false })
);

authRouter.get('/github/callback', authlimiter,
    passport.authenticate("github", { session: false, failureRedirect: '/auth/error?error=github_auth_failed' }),
    githubCallback
);

authRouter.post('/refresh', authRateLimit, refreshToken);
authRouter.post('/logout', authRateLimit, logout);
authRouter.get("/error", authRateLimit, failedLogin)

export default authRouter;
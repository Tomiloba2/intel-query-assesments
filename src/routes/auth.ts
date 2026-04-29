import { Router } from 'express';
import passport from 'passport';
import { githubCallback, refreshToken, logout, failedLogin } from '../controllers/auth.js';

const authRouter = Router();

authRouter.get('/github',
    passport.authenticate('github', { session: false })
);

authRouter.get('/github/callback',
    passport.authenticate("github", { session: false, failureRedirect: '/auth/error?error=github_auth_failed' }),
    githubCallback
);

authRouter.post('/refresh', refreshToken);
authRouter.post('/logout', logout);
authRouter.get("/error", failedLogin)

export default authRouter;
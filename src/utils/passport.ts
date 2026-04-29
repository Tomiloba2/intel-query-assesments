import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL: `${process.env.BACKEND_URL}/auth/github/callback`,
            scope: ['user:email'],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
            try {
                // Passport will pass the profile to githubCallback
                return done(null, profile);
            } catch (err) {
                return done(err);
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport
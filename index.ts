import "dotenv/config"
import express, { Application, NextFunction, Response, Request } from "express"
import cors from "cors"
import router from "./src/routes/routes.js"
import authRouter from "./src/routes/auth.js"
import { authenticate } from "./src/utils/guard.js"
import cookieParser from "cookie-parser"
import passport from './src/utils/passport.js'
import { versionMiddleware } from "./src/utils/version.js"
import { apilimiter, authlimiter } from "./src/utils/rateLimit.js"

const app: Application = express()

app.use(cors({
    origin: "*",
    credentials: true
}))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser())

app.use(passport.initialize())

app.use("/auth", authlimiter, authRouter)
app.use("/api", apilimiter, authenticate, versionMiddleware, router)

/* errorHandler middleware */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.statusCode ? err.statusCode : 500
    return res.status(status).json({
        status: "error",
        message: err.message
    })
})

app.listen(3000, () => {
    console.log("server is live");
})
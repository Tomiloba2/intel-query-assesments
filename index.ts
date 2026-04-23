import "dotenv/config"
import express, { Application, NextFunction, Response, Request } from "express"
import cors from "cors"
import router from "./src/routes.js"


const app: Application = express()

app.use(cors({
    origin: "*"
}))

app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.use("/api", router)

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
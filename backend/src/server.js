import express from "express"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/authRoutes.js"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ReviewFlow API is running",
  })
})

app.listen(PORT, () => {
  console.log(`ReviewFlow API running on port ${PORT}`)
})
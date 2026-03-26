import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)

// Health check
app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`The Panel API running on http://localhost:${PORT}`)
})

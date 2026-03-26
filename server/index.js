import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import requireAuth from './middleware/requireAuth.js'
import authRoutes from './routes/auth.js'
import friendsRoutes from './routes/friends.js'
import itemsRoutes from './routes/items.js'
import reactionsRoutes from './routes/reactions.js'
import commentsRoutes from './routes/comments.js'
import notificationsRoutes from './routes/notifications.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/friends', requireAuth, friendsRoutes)
app.use('/items', requireAuth, itemsRoutes)
app.use('/items', requireAuth, reactionsRoutes)
app.use('/items', requireAuth, commentsRoutes)
app.use('/comments', requireAuth, commentsRoutes)
app.use('/notifications', requireAuth, notificationsRoutes)

// Health check
app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`The Panel API running on http://localhost:${PORT}`)
})

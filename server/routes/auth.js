import { Router } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

// POST /auth/google — exchange Google access token for a session JWT
router.post('/google', async (req, res) => {
  const { googleAccessToken } = req.body
  if (!googleAccessToken) {
    return res.status(400).json({ error: 'Missing googleAccessToken' })
  }

  try {
    // Verify the token with Google and get user info
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    })

    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    const profile = await googleRes.json()
    const { sub: googleId, email, name, picture } = profile

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' })
    }

    // Upsert user
    const result = await pool.query(
      `INSERT INTO users (google_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = now()
       RETURNING id, google_id, email, display_name, avatar_url`,
      [googleId, email, name || email.split('@')[0], picture || null]
    )

    const user = result.rows[0]

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (err) {
    console.error('Auth error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /auth/me — get current user from JWT
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, avatar_url FROM users WHERE id = $1',
      [req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    })
  } catch (err) {
    console.error('Auth/me error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /auth/logout — stub for future session invalidation
router.post('/logout', requireAuth, (req, res) => {
  res.json({ ok: true })
})

export default router

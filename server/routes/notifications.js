import { Router } from 'express'
import pool from '../db/pool.js'

const router = Router()

// GET /notifications — list notifications
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100)
  const offset = parseInt(req.query.offset) || 0

  try {
    const result = await pool.query(
      `SELECT n.id, n.type, n.body, n.read, n.created_at,
              u.id AS actor_id, u.display_name AS actor_name, u.avatar_url AS actor_avatar
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    )

    res.json(result.rows.map(r => ({
      id: r.id,
      type: r.type,
      body: r.body,
      read: r.read,
      createdAt: r.created_at,
      actor: r.actor_id ? { id: r.actor_id, displayName: r.actor_name, avatarUrl: r.actor_avatar } : null,
    })))
  } catch (err) {
    console.error('Notifications error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.userId]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (err) {
    console.error('Unread count error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /notifications/mark-read — mark all or specific as read
router.post('/mark-read', async (req, res) => {
  const { ids } = req.body

  try {
    if (ids && Array.isArray(ids)) {
      await pool.query(
        'UPDATE notifications SET read = true WHERE user_id = $1 AND id = ANY($2)',
        [req.user.userId, ids]
      )
    } else {
      await pool.query(
        'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
        [req.user.userId]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Mark read error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

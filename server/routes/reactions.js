import { Router } from 'express'
import pool from '../db/pool.js'
import { createNotification } from '../lib/notify.js'

const router = Router()

// POST /items/:itemId/reactions — toggle a reaction
router.post('/:itemId/reactions', async (req, res) => {
  const { type } = req.body
  if (!['up', 'down', 'heart'].includes(type)) {
    return res.status(400).json({ error: 'Invalid reaction type' })
  }

  try {
    // Check if reaction already exists
    const existing = await pool.query(
      'SELECT id FROM reactions WHERE item_id = $1 AND user_id = $2 AND type = $3',
      [req.params.itemId, req.user.userId, type]
    )

    if (existing.rows.length > 0) {
      // Remove it (toggle off)
      await pool.query('DELETE FROM reactions WHERE id = $1', [existing.rows[0].id])
      res.json({ toggled: 'off' })
    } else {
      // Add it (toggle on)
      await pool.query(
        'INSERT INTO reactions (item_id, user_id, type) VALUES ($1, $2, $3)',
        [req.params.itemId, req.user.userId, type]
      )

      // Notify the item owner
      const item = await pool.query(
        'SELECT user_id, name FROM shared_cart_items WHERE id = $1',
        [req.params.itemId]
      )
      if (item.rows.length > 0 && item.rows[0].user_id !== req.user.userId) {
        const me = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.user.userId])
        const label = type === 'up' ? 'upvoted' : type === 'heart' ? 'loved' : 'downvoted'
        await createNotification({
          userId: item.rows[0].user_id,
          type: 'reaction',
          actorId: req.user.userId,
          itemId: req.params.itemId,
          body: `${me.rows[0].display_name} ${label} your ${item.rows[0].name}`,
        })
      }

      res.json({ toggled: 'on' })
    }
  } catch (err) {
    console.error('Reaction error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /items/:itemId/reactions — get counts + current user's reactions
router.get('/:itemId/reactions', async (req, res) => {
  try {
    const counts = await pool.query(
      `SELECT type, COUNT(*) AS count FROM reactions WHERE item_id = $1 GROUP BY type`,
      [req.params.itemId]
    )
    const mine = await pool.query(
      'SELECT type FROM reactions WHERE item_id = $1 AND user_id = $2',
      [req.params.itemId, req.user.userId]
    )

    const totals = { up: 0, down: 0, heart: 0 }
    for (const r of counts.rows) totals[r.type] = parseInt(r.count)

    res.json({
      totals,
      mine: mine.rows.map(r => r.type),
    })
  } catch (err) {
    console.error('Get reactions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

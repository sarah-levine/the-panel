import { Router } from 'express'
import pool from '../db/pool.js'
import { createNotification } from '../lib/notify.js'

const router = Router()

// GET /items/:itemId/comments — list comments
router.get('/:itemId/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.body, c.created_at, c.updated_at,
              u.id AS user_id, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.item_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [req.params.itemId]
    )

    res.json(result.rows.map(r => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user: { id: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url },
    })))
  } catch (err) {
    console.error('List comments error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /items/:itemId/comments — add a comment
router.post('/:itemId/comments', async (req, res) => {
  const { body } = req.body
  if (!body || body.trim().length === 0) return res.status(400).json({ error: 'Comment body required' })
  if (body.length > 500) return res.status(400).json({ error: 'Comment too long (500 char max)' })

  try {
    const result = await pool.query(
      `INSERT INTO comments (item_id, user_id, body) VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [req.params.itemId, req.user.userId, body.trim()]
    )

    // Notify the item owner
    const item = await pool.query(
      'SELECT user_id, name FROM shared_cart_items WHERE id = $1',
      [req.params.itemId]
    )
    if (item.rows.length > 0 && item.rows[0].user_id !== req.user.userId) {
      const me = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.user.userId])
      await createNotification({
        userId: item.rows[0].user_id,
        type: 'comment',
        actorId: req.user.userId,
        itemId: req.params.itemId,
        body: `${me.rows[0].display_name} commented on your ${item.rows[0].name}`,
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Add comment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /comments/:id — edit own comment
router.patch('/:id', async (req, res) => {
  const { body } = req.body
  if (!body || body.trim().length === 0) return res.status(400).json({ error: 'Comment body required' })

  try {
    const result = await pool.query(
      `UPDATE comments SET body = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, body, updated_at`,
      [body.trim(), req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('Edit comment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /comments/:id — soft-delete own comment
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE comments SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete comment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import pool from '../db/pool.js'
import { createNotification } from '../lib/notify.js'

const router = Router()

// PUT /items/sync — bulk upsert cart items from extension
router.put('/sync', async (req, res) => {
  const { items } = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const localIds = []
    for (const item of items) {
      if (!item.id || !item.name) continue
      localIds.push(item.id)

      await client.query(
        `INSERT INTO shared_cart_items (user_id, local_id, retailer, name, price, image_url, item_url, category, note, is_private, removed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, now())
         ON CONFLICT (user_id, local_id) DO UPDATE SET
           retailer = EXCLUDED.retailer,
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           image_url = EXCLUDED.image_url,
           item_url = EXCLUDED.item_url,
           category = EXCLUDED.category,
           note = COALESCE(NULLIF(EXCLUDED.note, ''), shared_cart_items.note),
           is_private = shared_cart_items.is_private,
           removed_at = NULL,
           updated_at = now()`,
        [
          req.user.userId,
          item.id,
          item.retailer || '',
          item.name,
          item.price || '',
          item.imageUrl || '',
          item.url || '',
          item.category || 'Other',
          item.note || '',
          item.isPrivate || false,
        ]
      )
    }

    // Soft-delete items no longer in the cart
    if (localIds.length > 0) {
      await client.query(
        `UPDATE shared_cart_items SET removed_at = now()
         WHERE user_id = $1 AND removed_at IS NULL AND local_id != ALL($2)`,
        [req.user.userId, localIds]
      )
    }

    await client.query('COMMIT')
    res.json({ ok: true, synced: localIds.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Sync error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// GET /items/feed — friends' non-private cart items
router.get('/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0

  try {
    const result = await pool.query(
      `SELECT
        i.id, i.retailer, i.name, i.price, i.image_url, i.item_url, i.category, i.note, i.created_at,
        u.id AS user_id, u.display_name, u.avatar_url,
        COALESCE(rc.up, 0) AS reaction_up,
        COALESCE(rc.down, 0) AS reaction_down,
        COALESCE(rc.heart, 0) AS reaction_heart,
        COALESCE(cc.comment_count, 0) AS comment_count
       FROM shared_cart_items i
       JOIN users u ON u.id = i.user_id
       JOIN friendships f ON (
         (f.user_a = $1 AND f.user_b = i.user_id) OR
         (f.user_b = $1 AND f.user_a = i.user_id)
       ) AND f.status = 'accepted'
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) FILTER (WHERE type = 'up') AS up,
           COUNT(*) FILTER (WHERE type = 'down') AS down,
           COUNT(*) FILTER (WHERE type = 'heart') AS heart
         FROM reactions WHERE item_id = i.id
       ) rc ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS comment_count
         FROM comments WHERE item_id = i.id AND deleted_at IS NULL
       ) cc ON true
       WHERE i.removed_at IS NULL AND i.is_private = false
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    )

    const feed = result.rows.map(r => ({
      id: r.id,
      retailer: r.retailer,
      name: r.name,
      price: r.price,
      imageUrl: r.image_url,
      itemUrl: r.item_url,
      category: r.category,
      note: r.note,
      createdAt: r.created_at,
      user: { id: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url },
      reactions: { up: parseInt(r.reaction_up), down: parseInt(r.reaction_down), heart: parseInt(r.reaction_heart) },
      commentCount: parseInt(r.comment_count),
    }))

    res.json(feed)
  } catch (err) {
    console.error('Feed error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /items/:id/privacy — toggle privacy
router.patch('/:id/privacy', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE shared_cart_items SET is_private = NOT is_private, updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING is_private`,
      [req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    res.json({ isPrivate: result.rows[0].is_private })
  } catch (err) {
    console.error('Privacy toggle error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /items/:id/note — update note
router.patch('/:id/note', async (req, res) => {
  const { note } = req.body
  try {
    const result = await pool.query(
      `UPDATE shared_cart_items SET note = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3 RETURNING note`,
      [note || '', req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    res.json({ note: result.rows[0].note })
  } catch (err) {
    console.error('Note update error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /items/:id/save — save a friend's item
router.post('/:id/save', async (req, res) => {
  try {
    // Check the item exists and isn't the user's own
    const item = await pool.query(
      'SELECT id, user_id, name FROM shared_cart_items WHERE id = $1',
      [req.params.id]
    )
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    if (item.rows[0].user_id === req.user.userId) return res.status(400).json({ error: 'Cannot save your own item' })

    await pool.query(
      `INSERT INTO saved_items (user_id, source_item_id) VALUES ($1, $2)
       ON CONFLICT (user_id, source_item_id) DO NOTHING`,
      [req.user.userId, req.params.id]
    )

    // Notify the item owner
    const me = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.user.userId])
    await createNotification({
      userId: item.rows[0].user_id,
      type: 'item_saved',
      actorId: req.user.userId,
      itemId: req.params.id,
      body: `${me.rows[0].display_name} saved your ${item.rows[0].name} to their cart`,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Save item error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

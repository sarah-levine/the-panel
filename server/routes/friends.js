import { Router } from 'express'
import pool from '../db/pool.js'
import { createNotification } from '../lib/notify.js'

const router = Router()

// GET /friends — list accepted friends
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, u.email, f.created_at AS friends_since
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_a = $1 THEN f.user_b
         ELSE f.user_a
       END
       WHERE (f.user_a = $1 OR f.user_b = $1)
         AND f.status = 'accepted'
       ORDER BY u.display_name`,
      [req.user.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Friends list error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /friends/pending — list pending incoming invites
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id AS friendship_id, u.id, u.display_name, u.avatar_url, f.created_at
       FROM friendships f
       JOIN users u ON u.id = f.invited_by
       WHERE (f.user_a = $1 OR f.user_b = $1)
         AND f.invited_by != $1
         AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Pending friends error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /friends/invite — get current user's invite link
router.post('/invite', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT invite_code FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ inviteCode: result.rows[0].invite_code })
  } catch (err) {
    console.error('Invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /friends/accept-invite — accept an invite code (direct link flow)
router.post('/accept-invite', async (req, res) => {
  const { inviteCode } = req.body
  if (!inviteCode) return res.status(400).json({ error: 'Missing inviteCode' })

  try {
    // Find the user who owns this invite code
    const inviter = await pool.query(
      'SELECT id, display_name FROM users WHERE invite_code = $1',
      [inviteCode]
    )
    if (inviter.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' })

    const inviterId = inviter.rows[0].id
    if (inviterId === req.user.userId) return res.status(400).json({ error: 'Cannot invite yourself' })

    // Order IDs for the constraint
    const [userA, userB] = [req.user.userId, inviterId].sort()

    // Upsert friendship as accepted
    await pool.query(
      `INSERT INTO friendships (user_a, user_b, invited_by, status, accepted_at)
       VALUES ($1, $2, $3, 'accepted', now())
       ON CONFLICT (user_a, user_b) DO UPDATE SET status = 'accepted', accepted_at = now()`,
      [userA, userB, inviterId]
    )

    // Get current user's name for notification
    const me = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.user.userId])
    const myName = me.rows[0]?.display_name || 'Someone'

    // Notify both users
    await createNotification({
      userId: inviterId,
      type: 'friend_accepted',
      actorId: req.user.userId,
      body: `${myName} accepted your invite and joined The Panel`,
    })

    res.json({ ok: true, friend: { id: inviterId, displayName: inviter.rows[0].display_name } })
  } catch (err) {
    console.error('Accept invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /friends/:id/accept — accept a pending friend request
router.post('/:id/accept', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'accepted', accepted_at = now()
       WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Accept friend error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /friends/:id/decline — decline a pending friend request
router.post('/:id/decline', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'declined'
       WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Decline friend error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /friends/:id — remove a friend
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM friendships WHERE id = $1 AND (user_a = $2 OR user_b = $2)',
      [req.params.id, req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Remove friend error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

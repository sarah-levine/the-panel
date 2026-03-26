import pool from '../db/pool.js'

export async function createNotification({ userId, type, actorId, itemId, body }) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, actor_id, item_id, body)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, actorId || null, itemId || null, body]
  )
}

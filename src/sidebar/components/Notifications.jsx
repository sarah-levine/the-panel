import { useState, useEffect } from 'react'
import { apiFetch } from '../hooks/useApi'

export default function Notifications({ onClose, onMarkAllRead }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/notifications')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    try {
      await apiFetch('/notifications/mark-read', { method: 'POST' })
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      onMarkAllRead()
    } catch (e) {}
  }

  return (
    <div className="absolute inset-0 z-10 bg-panel-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-panel-surface">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="text-[14px] font-medium text-panel-text">Notifications</span>
        </div>
        <button onClick={markAllRead} className="text-[11px] text-panel-accent hover:opacity-70 transition-opacity font-medium">
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full bg-panel-accent animate-pulse" /></div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-panel-muted">No notifications yet</p>
          </div>
        ) : (
          items.map(n => {
            const initials = n.actor?.displayName
              ? n.actor.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              : '?'
            return (
              <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-panel-border/50 ${!n.read ? 'bg-panel-surface' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-panel-accent/20 flex items-center justify-center text-[11px] font-medium flex-shrink-0 text-panel-text overflow-hidden">
                  {n.actor?.avatarUrl ? (
                    <img src={n.actor.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-panel-text leading-snug mb-0.5">{n.body}</p>
                  <p className="text-[10px] text-panel-muted">{getTimeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-panel-accent flex-shrink-0 mt-1.5" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

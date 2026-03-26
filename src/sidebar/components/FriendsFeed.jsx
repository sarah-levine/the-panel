import { useState, useEffect } from 'react'
import { apiFetch } from '../hooks/useApi'

export default function FriendsFeed() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/items/feed')
      .then(setFeed)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full bg-panel-accent animate-pulse" /></div>
  }

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <p className="text-[13px] text-panel-muted leading-relaxed">
          No friends' items yet. Invite friends to see what they're shopping!
        </p>
      </div>
    )
  }

  return (
    <div>
      {feed.map(entry => (
        <FeedItem key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function FeedItem({ entry }) {
  const [reactions, setReactions] = useState(entry.reactions)
  const [commentCount, setCommentCount] = useState(entry.commentCount)
  const [comments, setComments] = useState(null)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const initials = entry.user.displayName
    ? entry.user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function toggleReaction(type) {
    try {
      const result = await apiFetch(`/items/${entry.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      // Optimistic update
      setReactions(prev => ({
        ...prev,
        [type]: result.toggled === 'on' ? prev[type] + 1 : Math.max(0, prev[type] - 1),
      }))
    } catch (e) {}
  }

  async function loadComments() {
    try {
      const data = await apiFetch(`/items/${entry.id}/comments`)
      setComments(data)
      setShowComments(true)
    } catch (e) {}
  }

  async function submitComment() {
    if (!newComment.trim()) return
    try {
      await apiFetch(`/items/${entry.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: newComment.trim() }),
      })
      setNewComment('')
      setCommentCount(c => c + 1)
      loadComments()
    } catch (e) {}
  }

  async function saveItem() {
    try {
      await apiFetch(`/items/${entry.id}/save`, { method: 'POST' })
    } catch (e) {}
  }

  // Time ago helper
  const timeAgo = getTimeAgo(entry.createdAt)

  return (
    <div className="px-4 py-3 border-b border-panel-border/50">

      {/* Friend header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-full bg-panel-accent/20 flex items-center justify-center text-[10px] font-medium flex-shrink-0 text-panel-text overflow-hidden">
          {entry.user.avatarUrl ? (
            <img src={entry.user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : initials}
        </div>
        <p className="text-[12px] text-panel-muted">
          <span className="font-medium text-panel-text">{entry.user.displayName}</span> added to their cart
        </p>
        <span className="ml-auto text-[10px] text-panel-border">{timeAgo}</span>
      </div>

      {/* Item card */}
      <div className="bg-panel-surface rounded-lg p-2.5 mb-2.5 flex gap-2.5 items-start border border-panel-border/40">
        <div className="w-11 h-14 rounded-md bg-panel-bg border border-panel-border/40 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {entry.imageUrl ? (
            <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-panel-border">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-panel-muted mb-0.5">{entry.retailer}</p>
          {entry.itemUrl ? (
            <a href={entry.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-panel-text leading-snug mb-1 block hover:underline">{entry.name}</a>
          ) : (
            <p className="text-[12px] text-panel-text leading-snug mb-1">{entry.name}</p>
          )}
          {entry.price && <p className="text-[12px] font-medium text-panel-text mb-1">{entry.price}</p>}
          {entry.note && (
            <p className="text-[11px] text-panel-muted italic">"{entry.note}"</p>
          )}
        </div>
        <button
          onClick={saveItem}
          className="text-[11px] text-panel-muted border border-panel-border rounded-full px-2.5 py-1 hover:bg-panel-bg transition-colors flex-shrink-0"
        >
          Save
        </button>
      </div>

      {/* Social actions */}
      <div className="flex gap-1.5 mb-2">
        <ReactionBtn icon="↑" count={reactions.up} onClick={() => toggleReaction('up')} activeClass="bg-panel-accent/15 border-panel-accent text-panel-text" />
        <ReactionBtn icon="↓" count={reactions.down} onClick={() => toggleReaction('down')} activeClass="bg-panel-surface border-panel-border text-panel-text" />
        <ReactionBtn icon="♡" count={reactions.heart} onClick={() => toggleReaction('heart')} activeClass="bg-panel-accent/25 border-panel-accent text-panel-text" />
        <button
          onClick={showComments ? () => setShowComments(false) : loadComments}
          className="text-[11px] text-panel-muted border border-panel-border rounded-full px-2.5 py-1 hover:bg-panel-surface transition-colors ml-auto"
        >
          {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>

      {/* Comments */}
      {showComments && comments && comments.map(c => {
        const cInitials = c.user.displayName
          ? c.user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '?'
        return (
          <div key={c.id} className="flex gap-2 mt-1.5">
            <div className="w-5 h-5 rounded-full bg-panel-accent/20 flex items-center justify-center text-[9px] font-medium flex-shrink-0 mt-0.5 text-panel-text overflow-hidden">
              {c.user.avatarUrl ? (
                <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : cInitials}
            </div>
            <div className="bg-panel-surface rounded-lg px-2.5 py-1.5 flex-1 border border-panel-border/30">
              <p className="text-[10px] font-medium text-panel-muted mb-0.5">{c.user.displayName}</p>
              <p className="text-[12px] text-panel-text leading-snug">{c.body}</p>
            </div>
          </div>
        )
      })}

      {/* Comment input */}
      {showComments && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitComment()}
            placeholder="Add a comment..."
            maxLength={500}
            className="flex-1 text-[12px] bg-panel-surface border border-panel-border rounded-lg px-2.5 py-1.5 outline-none focus:border-panel-muted text-panel-text placeholder:text-panel-muted"
          />
          <button
            onClick={submitComment}
            className="text-[11px] bg-panel-text text-panel-bg rounded-full px-3 py-1.5 font-medium hover:opacity-90 transition-opacity"
          >
            Post
          </button>
        </div>
      )}
    </div>
  )
}

function ReactionBtn({ icon, count, onClick, activeClass }) {
  const hasCount = count > 0
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
        hasCount ? activeClass : 'border-panel-border text-panel-muted hover:bg-panel-surface'
      }`}
    >
      <span>{icon}</span>
      {hasCount && <span>{count}</span>}
    </button>
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

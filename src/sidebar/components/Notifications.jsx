export default function Notifications({ notifications, onClose, onMarkAllRead }) {
  const PLACEHOLDER = [
    { id: 1, type: 'comment', read: false, avatar: 'MK', color: 'bg-panel-accent/20 text-panel-text', text: 'Maya commented on your item — "Ok this is SO good"', time: '2 min ago' },
    { id: 2, type: 'reaction', read: false, avatar: 'SR', color: 'bg-panel-surface text-panel-text', text: 'Sofia and 2 others upvoted your draped satin blouse', time: '14 min ago' },
    { id: 3, type: 'friend', read: false, avatar: 'AL', color: 'bg-panel-accent/30 text-panel-text', text: 'Amara saved your platform ankle boots to her cart', time: '1h ago' },
    { id: 4, type: 'friend', read: true, avatar: 'NP', color: 'bg-panel-surface text-panel-text', text: 'Nia accepted your invite and joined The Panel', time: '3h ago' },
  ]

  const items = notifications.length > 0 ? notifications : PLACEHOLDER

  return (
    <div className="absolute inset-0 z-10 bg-panel-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-panel-surface">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="text-[14px] font-medium text-panel-text">Notifications</span>
        </div>
        <button onClick={onMarkAllRead} className="text-[11px] text-panel-accent hover:opacity-70 transition-opacity font-medium">
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map(n => (
          <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-panel-border/50 ${!n.read ? 'bg-panel-surface' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${n.color}`}>
              {n.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-panel-text leading-snug mb-0.5">{n.text}</p>
              <p className="text-[10px] text-panel-muted">{n.time}</p>
            </div>
            {!n.read && (
              <div className="w-1.5 h-1.5 rounded-full bg-panel-accent flex-shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

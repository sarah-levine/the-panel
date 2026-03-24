const PLACEHOLDER_FEED = [
  {
    id: 'f1',
    friend: { initials: 'MK', name: 'Maya', color: 'bg-purple-100 text-purple-700' },
    item: {
      retailer: 'Jacquemus',
      name: 'Le Raphia mini skirt, natural',
      note: 'Summer wedding szn',
    },
    time: '2h ago',
    reactions: { up: 3, heart: 1 },
    comments: [
      { author: 'You', initials: 'JL', color: 'bg-[#E1F5EE] text-[#085041]', text: 'Get it!! This is so cute for a wedding', time: '1h ago' },
    ],
  },
  {
    id: 'f2',
    friend: { initials: 'SR', name: 'Sofia', color: 'bg-[#E1F5EE] text-[#0F6E56]' },
    item: {
      retailer: 'Toteme',
      name: 'Original denim, dark blue',
      note: 'Not sure about the rise...',
    },
    time: '3h ago',
    reactions: { up: 1, down: 2 },
    comments: [],
  },
]

export default function FriendsFeed() {
  return (
    <div>
      {PLACEHOLDER_FEED.map(entry => (
        <FeedItem key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function FeedItem({ entry }) {
  return (
    <div className="px-4 py-3 border-b border-gray-50">

      {/* Friend header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${entry.friend.color}`}>
          {entry.friend.initials}
        </div>
        <p className="text-[12px] text-gray-500">
          <span className="font-medium text-gray-800">{entry.friend.name}</span> added to her cart
        </p>
        <span className="ml-auto text-[10px] text-gray-300">{entry.time}</span>
      </div>

      {/* Item card */}
      <div className="bg-gray-50 rounded-lg p-2.5 mb-2.5 flex gap-2.5 items-start">
        <div className="w-11 h-14 rounded-md bg-white border border-gray-100 flex-shrink-0 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gray-200">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{entry.item.retailer}</p>
          <p className="text-[12px] text-gray-800 leading-snug mb-1">{entry.item.name}</p>
          {entry.item.note && (
            <p className="text-[11px] text-gray-400 italic">"{entry.item.note}"</p>
          )}
        </div>
        <button className="text-[11px] text-gray-400 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-white transition-colors flex-shrink-0">
          Save
        </button>
      </div>

      {/* Social actions */}
      <div className="flex gap-1.5 mb-2">
        <ReactionBtn icon="↑" count={entry.reactions?.up} activeClass="bg-[#E1F5EE] border-[#5DCAA5] text-[#085041]" />
        <ReactionBtn icon="↓" count={entry.reactions?.down} activeClass="bg-[#FCEBEB] border-[#F09595] text-[#791F1F]" />
        <ReactionBtn icon="♡" count={entry.reactions?.heart} activeClass="bg-[#FBEAF0] border-[#ED93B1] text-[#72243E]" />
        <button className="text-[11px] text-gray-400 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-gray-50 transition-colors ml-auto">
          Comment
        </button>
      </div>

      {/* Comments */}
      {entry.comments.map((c, i) => (
        <div key={i} className="flex gap-2 mt-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0 mt-0.5 ${c.color}`}>
            {c.initials}
          </div>
          <div className="bg-gray-50 rounded-lg px-2.5 py-1.5 flex-1">
            <p className="text-[10px] font-medium text-gray-500 mb-0.5">{c.author}</p>
            <p className="text-[12px] text-gray-700 leading-snug">{c.text}</p>
          </div>
        </div>
      ))}

    </div>
  )
}

function ReactionBtn({ icon, count, activeClass }) {
  const hasCount = count > 0
  return (
    <button className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
      hasCount ? activeClass : 'border-gray-200 text-gray-400 hover:bg-gray-50'
    }`}>
      <span>{icon}</span>
      {hasCount && <span>{count}</span>}
    </button>
  )
}

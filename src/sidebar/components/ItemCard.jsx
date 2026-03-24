import { useState } from 'react'

export default function ItemCard({ item }) {
  const [note, setNote] = useState(item.note || '')
  const [editingNote, setEditingNote] = useState(false)
  const [isPrivate, setIsPrivate] = useState(item.isPrivate || false)

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">

      {/* Thumbnail placeholder */}
      <div className="w-14 h-[72px] rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gray-300">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Retailer */}
        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{item.retailer}</p>

        {/* Name */}
        <p className="text-[13px] text-gray-900 leading-snug mb-1 truncate">{item.name}</p>

        {/* Price */}
        <p className="text-[13px] font-medium text-gray-900 mb-2">{item.price}</p>

        {/* Note */}
        {editingNote ? (
          <div className="mb-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={140}
              placeholder="Add a note..."
              className="w-full text-[11px] bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-gray-400 font-sans"
              onBlur={() => setEditingNote(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingNote(false)}
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="block w-full text-left mb-2"
          >
            {note ? (
              <p className="text-[11px] text-gray-400 italic leading-snug">{note}</p>
            ) : (
              <p className="text-[11px] text-gray-300 italic">Add a note...</p>
            )}
          </button>
        )}

        {/* Social summary */}
        {(item.reactions?.up > 0 || item.reactions?.heart > 0 || item.commentCount > 0) && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {item.reactions?.up > 0 && (
              <span className="text-[10px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
                ↑ {item.reactions.up}
              </span>
            )}
            {item.reactions?.heart > 0 && (
              <span className="text-[10px] bg-[#FBEAF0] text-[#72243E] px-2 py-0.5 rounded-full">
                ♡ {item.reactions.heart}
              </span>
            )}
            {item.commentCount > 0 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {item.commentCount} {item.commentCount === 1 ? 'comment' : 'comments'}
              </span>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              isPrivate
                ? 'border-gray-300 text-gray-400'
                : 'border-transparent text-transparent'
            }`}
          >
            {isPrivate ? 'Private' : 'Private'}
          </button>
        </div>
      </div>

      {/* Private toggle icon */}
      <button
        onClick={() => setIsPrivate(!isPrivate)}
        className="flex-shrink-0 mt-0.5"
        title={isPrivate ? 'Visible to friends' : 'Make private'}
      >
        {isPrivate ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 hover:text-gray-400 transition-colors">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>

    </div>
  )
}

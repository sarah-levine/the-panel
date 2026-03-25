import { useState } from 'react'
import ItemCard from './ItemCard'

// Group items by category
function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
}

export default function MyCart({ items }) {
  const grouped = groupByCategory(items)

  return (
    <div>
      {Object.keys(grouped).length === 0 ? (
        <EmptyState />
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <CategoryGroup key={category} category={category} items={catItems} />
        ))
      )}
    </div>
  )
}

function CategoryGroup({ category, items }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-medium uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
      >
        {category}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${collapsed ? '-rotate-90' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {!collapsed && items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed">
        Visit a supported store and add items to your cart — they'll appear here.
      </p>
    </div>
  )
}

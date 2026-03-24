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

// Placeholder items for development
const PLACEHOLDER_ITEMS = [
  {
    id: '1',
    retailer: 'ASOS',
    name: 'Oversized blazer in camel',
    price: '$89',
    category: 'Tops',
    note: 'For the work trip',
    isPrivate: false,
    reactions: { up: 3, down: 0, heart: 2 },
    commentCount: 4,
  },
  {
    id: '2',
    retailer: 'Zara',
    name: 'Wide leg trousers, ecru',
    price: '$59',
    category: 'Bottoms',
    note: '',
    isPrivate: false,
    reactions: { up: 1, down: 0, heart: 0 },
    commentCount: 1,
  },
  {
    id: '3',
    retailer: '& Other Stories',
    name: 'Draped satin blouse, ivory',
    price: '$129',
    category: 'Tops',
    note: 'Check if this comes in sage',
    isPrivate: false,
    reactions: { up: 5, down: 0, heart: 3 },
    commentCount: 4,
  },
  {
    id: '4',
    retailer: 'Reformation',
    name: 'Cynthia mule, cream',
    price: '$248',
    category: 'Shoes',
    note: '',
    isPrivate: true,
    reactions: { up: 0, down: 1, heart: 0 },
    commentCount: 0,
  },
]

export default function MyCart({ items }) {
  const displayItems = items.length > 0 ? items : PLACEHOLDER_ITEMS
  const grouped = groupByCategory(displayItems)

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

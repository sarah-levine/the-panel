// Background service worker
// Aggregates cart data from content scripts, manages storage, opens sidebar

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})

// Listen for cart data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CART_ITEMS_FOUND') {
    handleCartUpdate(message)
    sendResponse({ ok: true })
  }
  return true
})

async function handleCartUpdate({ retailer, items, isFullCart, timestamp }) {
  // Load existing cart items
  const stored = await chrome.storage.local.get('cartItems')
  const existing = stored.cartItems || []

  // Auto-categorise new items
  const categorised = items.map(item => ({
    ...item,
    id: generateId(item),
    category: guessCategory(item.name),
    isPrivate: false,
    reactions: { up: 0, down: 0, heart: 0 },
    commentCount: 0,
    savedAt: timestamp,
  }))

  let merged
  if (isFullCart) {
    // Bag page: replace all items from this retailer (full snapshot)
    const otherRetailerItems = existing.filter(i => i.retailer !== retailer)
    merged = [...otherRetailerItems, ...categorised]
  } else {
    // Product page: add new items without removing existing ones from this retailer
    const existingIds = new Set(existing.map(i => i.id))
    const newItems = categorised.filter(i => !existingIds.has(i.id))
    merged = [...existing, ...newItems]
  }

  await chrome.storage.local.set({ cartItems: merged })

  // Notify sidebar if it's open
  chrome.runtime.sendMessage({ type: 'CART_UPDATED', items: merged }).catch(() => {
    // Sidebar not open — that's fine
  })
}

function generateId(item) {
  const str = `${item.retailer}-${item.name}-${item.url}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function guessCategory(name) {
  const n = name.toLowerCase()
  if (/boot|heel|shoe|mule|sneaker|loafer|sandal|flat|pump/.test(n)) return 'Shoes'
  if (/dress|gown|mini\s*dress|midi\s*dress|maxi\s*dress|mini\s*skirt|midi\s*skirt|maxi\s*skirt/.test(n)) return 'Dresses'
  if (/trouser|pant|jeans|skirt|short|legging/.test(n)) return 'Bottoms'
  if (/jacket|coat|blazer|cardigan|vest|puffer/.test(n)) return 'Outerwear'
  if (/bag|tote|clutch|purse|handbag/.test(n)) return 'Bags'
  if (/necklace|earring|ring|bracelet|belt|scarf|hat|glove|sunglass/.test(n)) return 'Accessories'
  if (/makeup|lipstick|mascara|foundation|concealer|blush|bronzer|primer|brush|serum|moisturi|cleanser|fragrance|perfume|cologne/.test(n)) return 'Beauty'
  if (/shirt|blouse|top|tee|sweater|jumper|knit|cami|tank|bodysuit/.test(n)) return 'Tops'
  return 'Other'
}

// Background service worker
// Aggregates cart data from content scripts, manages storage, opens sidebar

import { signInWithGoogle, getAuthState, signOut } from './auth.js'

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})

// Re-categorize existing items on startup (picks up new/changed categories)
chrome.storage.local.get('cartItems', ({ cartItems }) => {
  if (!cartItems || cartItems.length === 0) return
  let changed = false
  const updated = cartItems.map(item => {
    const correct = guessCategory(item.name)
    if (item.category !== correct) {
      changed = true
      return { ...item, category: correct }
    }
    return item
  })
  if (changed) {
    chrome.storage.local.set({ cartItems: updated })
  }
})

// Known retailer hostnames — content script already injected via manifest
const KNOWN_HOSTS = ['asos', 'zara', 'nordstrom', 'revolve', 'net-a-porter', 'hm.com', 'madewell', 'freepeople', 'stories.com']

function isKnownRetailer(hostname) {
  return KNOWN_HOSTS.some(h => hostname.includes(h))
}

// Track which tabs we've already checked/injected for Shopify
const checkedTabs = new Set()

// On tab update, check if the site is a Shopify store and inject content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  try {
    const url = new URL(tab.url)
    if (url.protocol !== 'https:') return
    if (isKnownRetailer(url.hostname)) return

    const tabKey = `${tabId}-${url.hostname}`
    if (checkedTabs.has(tabKey)) return
    checkedTabs.add(tabKey)

    // Probe /cart.js to check if this is a Shopify store
    const res = await fetch(`${url.origin}/cart.js`, { credentials: 'omit' })
    if (!res.ok) return
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('json')) return
    const data = await res.json()
    if (!data.token || !Array.isArray(data.items)) return

    // It's Shopify — inject content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['dist/content/index.js'],
    })

    // If there are items in the cart, process them directly
    if (data.items.length > 0) {
      const retailerName = url.hostname.replace('www.', '').split('.')[0]
      const prettyName = retailerName.charAt(0).toUpperCase() + retailerName.slice(1)
      const items = data.items.map(item => ({
        name: item.title || item.product_title || '',
        price: item.price ? '$' + (item.price / 100).toFixed(2) : '',
        imageUrl: item.image || item.featured_image?.url || '',
        url: item.url ? `${url.origin}${item.url}` : '',
        retailer: prettyName,
      })).filter(i => i.name)

      if (items.length > 0) {
        handleCartUpdate({
          retailer: prettyName,
          items,
          isFullCart: true,
          timestamp: Date.now(),
        })
      }
    }
  } catch (e) {
    // Not Shopify or network error — silently ignore
  }
})

// Clean up checked tabs when they close
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const key of checkedTabs) {
    if (key.startsWith(`${tabId}-`)) checkedTabs.delete(key)
  }
})

// Listen for messages from content scripts and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CART_ITEMS_FOUND') {
    handleCartUpdate(message)
    sendResponse({ ok: true })
  }

  // Auth messages from sidebar
  if (message.type === 'SIGN_IN') {
    signInWithGoogle()
      .then(user => sendResponse({ ok: true, user }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // keep channel open for async response
  }

  if (message.type === 'SIGN_OUT') {
    signOut()
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.type === 'GET_AUTH_STATE') {
    getAuthState()
      .then(user => sendResponse({ user }))
      .catch(() => sendResponse({ user: null }))
    return true
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
  if (/bikini|swim|one\s*piece|surf|board\s*short|cover\s*up|rash\s*guard/.test(n)) return 'Swim'
  if (/bra|bralette|underwear|panty|pantie|thong|lingerie|bodysuit|corset|slip\s*dress|robe|pajama|pyjama|sleepwear|nightgown|lounge/.test(n)) return 'Intimates'
  if (/trouser|pant|jeans|skirt|short|legging/.test(n)) return 'Bottoms'
  if (/jacket|coat|blazer|cardigan|vest|puffer/.test(n)) return 'Outerwear'
  if (/bag|tote|clutch|purse|handbag/.test(n)) return 'Bags'
  if (/necklace|earring|ring|bracelet|belt|scarf|hat|glove|sunglass/.test(n)) return 'Accessories'
  if (/makeup|lipstick|mascara|foundation|concealer|blush|bronzer|primer|brush|serum|moisturi|cleanser|fragrance|perfume|cologne/.test(n)) return 'Beauty'
  if (/shirt|blouse|top|tee|sweater|jumper|knit|cami|tank|bodysuit/.test(n)) return 'Tops'
  return 'Other'
}

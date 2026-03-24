// Content script — driven entirely by retailers.js config
// No retailer-specific logic lives here

import { getRetailer } from './retailers'

const retailer = getRetailer(window.location.hostname)
if (retailer) init(retailer)

function isCartPage(retailer) {
  return retailer.isCartPage(window.location.pathname.toLowerCase())
}

function sendCartUpdate(items, retailer) {
  chrome.runtime.sendMessage({
    type: 'CART_ITEMS_FOUND',
    retailer: retailer.name,
    items,
    url: window.location.href,
    timestamp: Date.now(),
  })
}

function parseAndSend(retailer) {
  try {
    const raw = retailer.parseDom()
    const items = raw.map(item => ({ ...item, retailer: retailer.name }))
    sendCartUpdate(items, retailer)
  } catch (err) {
    console.warn('[The Panel] DOM parse failed for ' + retailer.name, err)
  }
}

// ─── Bag page: watch for additions and removals ──────────────────────────────

function watchBagPage(retailer) {
  parseAndSend(retailer)
  let debounce = null
  new MutationObserver(() => {
    clearTimeout(debounce)
    debounce = setTimeout(() => parseAndSend(retailer), 600)
  }).observe(document.body, { childList: true, subtree: true })
}

// ─── Product page: detect add-to-bag ────────────────────────────────────────

function watchProductPage(retailer) {
  // Intercept fetch calls that match the retailer's cart API patterns
  const origFetch = window.fetch
  window.fetch = async (...args) => {
    const res = await origFetch(...args)
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '')
    const isCartCall = retailer.cartApiPatterns.some(p => url.includes(p))
    if (isCartCall) {
      res.clone().json().then(data => {
        const rawItems = retailer.parseResponseItems(data)
        if (rawItems.length > 0) {
          const items = rawItems
            .map(retailer.parseItem)
            .filter(i => i.name)
            .map(i => ({ ...i, retailer: retailer.name }))
          sendCartUpdate(items, retailer)
        } else {
          setTimeout(() => parseAndSend(retailer), 900)
        }
      }).catch(() => setTimeout(() => parseAndSend(retailer), 900))
    }
    return res
  }

  // Watch for mini-cart flyout appearing in DOM
  if (retailer.miniCartSelector) {
    let miniDebounce = null
    new MutationObserver(() => {
      if (document.querySelector(retailer.miniCartSelector)) {
        clearTimeout(miniDebounce)
        miniDebounce = setTimeout(() => parseAndSend(retailer), 400)
      }
    }).observe(document.body, { childList: true, subtree: true })
  }

  // Watch for add-to-cart button clicks as a fallback
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"]')
    if (!btn) return
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase()
    const isAddBtn = retailer.addToCartText.some(t => text.includes(t))
    if (isAddBtn) {
      setTimeout(() => parseAndSend(retailer), 1000)
      setTimeout(() => parseAndSend(retailer), 2500)
    }
  }, true)
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init(retailer) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(retailer))
  } else {
    run(retailer)
  }
}

function run(retailer) {
  if (isCartPage(retailer)) {
    watchBagPage(retailer)
  } else {
    watchProductPage(retailer)
  }
}
